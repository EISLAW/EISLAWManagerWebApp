#!/usr/bin/env python3
"""Tail Azure App Service logs via the Kudu log-stream API with auto-reconnect."""

import argparse
import os
import sys
import time
from datetime import datetime, timezone
from typing import IO, Optional

import requests


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def build_hostname(site: str, slot: Optional[str]) -> str:
    slot = (slot or "").strip()
    if not slot or slot.lower() in {"production", "prod"}:
        return site
    return f"{site}-{slot}"


def stream_logs(args: argparse.Namespace) -> int:
    username = args.username or os.getenv("AZURE_KUDU_USERNAME")
    password = args.password or os.getenv("AZURE_KUDU_PASSWORD")
    if not username or not password:
        print(
            "Missing Kudu credentials. Provide --username/--password or set "
            "AZURE_KUDU_USERNAME/AZURE_KUDU_PASSWORD.",
            file=sys.stderr,
        )
        return 2

    hostname = build_hostname(args.site, args.slot)
    channel = (args.channel or "").strip("/")
    stream_path = "/api/logstream"
    if channel and channel.lower() not in {"all", "default"}:
        stream_path += f"/{channel}"
    url = f"https://{hostname}.scm.azurewebsites.net{stream_path}"

    session = requests.Session()
    session.auth = (username, password)

    output_file: Optional[IO[str]] = None
    if args.output:
        output_file = open(args.output, "a", encoding="utf-8")

    retries = 0
    try:
        while True:
            if args.max_retries and retries > args.max_retries:
                print("Reached max retry limit, exiting.", file=sys.stderr)
                return 3
            try:
                with session.get(url, stream=True, timeout=args.timeout) as resp:
                    resp.raise_for_status()
                    retries = 0  # reset after a successful connection
                    print(f"[{utc_now()}] Connected to {url}", file=sys.stderr)
                    for raw_line in resp.iter_lines():
                        if raw_line is None:
                            continue
                        line = raw_line.decode("utf-8", errors="replace").rstrip()
                        if not line:
                            continue
                        formatted = f"[{utc_now()}] {line}"
                        print(formatted)
                        if output_file:
                            output_file.write(formatted + "\n")
                            output_file.flush()
            except KeyboardInterrupt:
                print("\nStopped by user.", file=sys.stderr)
                return 0
            except requests.HTTPError as exc:
                retries += 1
                print(
                    f"[{utc_now()}] HTTP error {exc.response.status_code if exc.response else '?'} "
                    f"({exc}); reconnecting in {args.reconnect_wait}s...",
                    file=sys.stderr,
                )
            except requests.RequestException as exc:
                retries += 1
                print(
                    f"[{utc_now()}] Connection error ({exc}); reconnecting in {args.reconnect_wait}s...",
                    file=sys.stderr,
                )
            time.sleep(args.reconnect_wait)
    finally:
        if output_file:
            output_file.close()


def parse_args() -> argparse.Namespace:
    ap = argparse.ArgumentParser(description="Stream Azure App Service logs over the Kudu API.")
    ap.add_argument("--site", required=True, help="App Service name (without .azurewebsites.net).")
    ap.add_argument("--slot", help="Deployment slot (omit or use 'production' for the main slot).")
    ap.add_argument(
        "--channel",
        default="application",
        help="Log channel (application, http, tracing, etc.). Use 'all' for the default stream.",
    )
    ap.add_argument("--username", help="Kudu deployment user (fallback: AZURE_KUDU_USERNAME env).")
    ap.add_argument("--password", help="Kudu deployment password (fallback: AZURE_KUDU_PASSWORD env).")
    ap.add_argument("--timeout", type=int, default=30, help="HTTP timeout in seconds (per request).")
    ap.add_argument("--reconnect-wait", type=float, default=3.0, help="Seconds to wait before reconnecting.")
    ap.add_argument(
        "--max-retries",
        type=int,
        default=0,
        help="Number of consecutive failures before exit (0 = infinite retries).",
    )
    ap.add_argument("--output", help="Optional file path to append the streamed lines.")
    return ap.parse_args()


if __name__ == "__main__":
    sys.exit(stream_logs(parse_args()))
