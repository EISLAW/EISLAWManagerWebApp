#!/usr/bin/env python3
"""Airtable snapshotter: export tables to JSON and push to Azure Blob Storage."""
import argparse
import json
import os
import re
import sys
import tempfile
import time
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import List, Optional

import requests
from azure.core.exceptions import ResourceExistsError
from azure.storage.blob import BlobClient, ContainerClient, ContentSettings


def _read_secrets() -> dict:
    """Load secrets.local.json if present to provide defaults."""
    p = Path(__file__).resolve().parents[1] / "secrets.local.json"
    if p.exists():
        return json.loads(p.read_text(encoding="utf-8"))
    return {}


def _slug(value: str) -> str:
    return re.sub(r"[^A-Za-z0-9._-]+", "_", value.strip())


def _airtable_headers(api_key: str) -> dict:
    return {"Authorization": f"Bearer {api_key}"}


def _get_page(
    base_id: str,
    table: str,
    api_key: str,
    offset: Optional[str] = None,
    view: Optional[str] = None,
) -> dict:
    url = f"https://api.airtable.com/v0/{base_id}/{requests.utils.quote(table)}"
    params = {"pageSize": 100}
    if offset:
        params["offset"] = offset
    if view:
        params["view"] = view

    for attempt in range(5):
        resp = requests.get(url, headers=_airtable_headers(api_key), params=params, timeout=30)
        if resp.status_code == 200:
            return resp.json()
        if resp.status_code in (429, 500, 502, 503, 504):
            delay = min(2 ** attempt, 30)
            time.sleep(delay)
            continue
        msg = f"Airtable error {resp.status_code}: {resp.text}"
        raise RuntimeError(msg)
    raise RuntimeError("Airtable request failed after retries")


def fetch_table(base_id: str, table: str, api_key: str, view: Optional[str] = None) -> List[dict]:
    """Fetch all records for a table, handling pagination and basic backoff."""
    records: List[dict] = []
    offset: Optional[str] = None
    while True:
        page = _get_page(base_id, table, api_key, offset=offset, view=view)
        records.extend(page.get("records", []))
        offset = page.get("offset")
        if not offset:
            break
        time.sleep(0.2)
    return records


def write_snapshot(table: str, base_id: str, records: List[dict], prefix: str) -> Path:
    ts = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M")
    safe_table = _slug(table) or "table"
    fname = f"{prefix}{ts}_{safe_table}.json"
    data = {"table": table, "base_id": base_id, "rows": records, "snapshot_at": datetime.now(timezone.utc).isoformat()}
    outdir = Path(tempfile.gettempdir()) / "airtable_snapshots"
    outdir.mkdir(parents=True, exist_ok=True)
    path = outdir / fname
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
    return path


def list_tables(base_id: str, api_key: str) -> List[str]:
    """List tables in a base via the Airtable metadata API (requires schema.bases:read scope)."""
    url = f"https://api.airtable.com/v0/meta/bases/{base_id}/tables"
    resp = requests.get(url, headers=_airtable_headers(api_key), timeout=30)
    if resp.status_code != 200:
        raise RuntimeError(f"Failed to list tables for base {base_id}: {resp.status_code} {resp.text}")
    data = resp.json()
    return [t.get("name") for t in data.get("tables", []) if t.get("name")]


def _container_client_from_args(args: argparse.Namespace) -> ContainerClient:
    if args.azure_connection_string:
        return ContainerClient.from_connection_string(args.azure_connection_string, container_name=args.azure_container)
    if args.azure_container_sas:
        return ContainerClient.from_container_url(args.azure_container_sas)
    raise RuntimeError("Azure storage configuration is missing (connection string or SAS URL)")


def upload_blob(container: ContainerClient, blob_name: str, path: Path):
    blob: BlobClient = container.get_blob_client(blob_name)
    with path.open("rb") as fh:
        blob.upload_blob(fh, overwrite=True, content_settings=ContentSettings(content_type="application/json"))


def gc_old_blobs(container: ContainerClient, prefix: str, retention_days: int):
    threshold = datetime.now(timezone.utc) - timedelta(days=retention_days)
    pattern = re.compile(rf"^{re.escape(prefix)}(\d{{8}})_(\d{{4}})_.+\.json$")
    for blob in container.list_blobs(name_starts_with=prefix):
        match = pattern.match(blob.name)
        if not match:
            continue
        ts = datetime.strptime(match.group(1) + match.group(2), "%Y%m%d%H%M").replace(tzinfo=timezone.utc)
        if ts < threshold:
            try:
                container.delete_blob(blob.name)
                print(f"Deleted old snapshot: {blob.name}")
            except Exception as exc:
                print(f"Warning: failed to delete {blob.name}: {exc}", file=sys.stderr)


def parse_args() -> argparse.Namespace:
    secrets = _read_secrets()
    airtable_defaults = secrets.get("airtable", {})
    ap = argparse.ArgumentParser(description="Snapshot Airtable tables to Azure Blob Storage.")
    ap.add_argument("--airtable-api-key", default=os.getenv("AIRTABLE_API_KEY") or airtable_defaults.get("token"), help="Airtable API key (env: AIRTABLE_API_KEY)")
    ap.add_argument(
        "--base-id",
        action="append",
        help="Airtable base id (may be passed multiple times). Defaults to AIRTABLE_BASE_ID or secrets.airtable.base_id",
        default=[],
    )
    ap.add_argument("--table", action="append", help="Table to snapshot (can be repeated).")
    ap.add_argument(
        "--tables",
        help="Comma-separated list of tables to snapshot. Defaults to AIRTABLE_TABLES env.",
        default=os.getenv("AIRTABLE_TABLES"),
    )
    ap.add_argument("--view", default=os.getenv("AIRTABLE_VIEW"), help="Optional Airtable view to apply.")
    ap.add_argument("--azure-connection-string", default=os.getenv("AZURE_BLOB_CONNECTION_STRING"), help="Azure Blob connection string.")
    ap.add_argument("--azure-container", default=os.getenv("AZURE_BLOB_CONTAINER"), help="Azure container name.")
    ap.add_argument("--azure-container-sas", default=os.getenv("AZURE_BLOB_CONTAINER_SAS"), help="Container SAS URL (alternative to connection string).")
    ap.add_argument("--snapshot-prefix", default=os.getenv("SNAPSHOT_PREFIX", "backup_"), help="Filename prefix for snapshots.")
    ap.add_argument(
        "--retention-days",
        type=int,
        default=int(os.getenv("SNAPSHOT_RETENTION_DAYS", "14")),
        help="Days to retain snapshots (deletes older blobs).",
    )
    ap.add_argument("--all-tables", action="store_true", help="Snapshot all tables in the base (requires metadata API scope).")
    ap.add_argument("--verbose", action="store_true", help="Print more logging.")
    args = ap.parse_args()

    if not args.base_id:
        env_base = os.getenv("AIRTABLE_BASE_ID")
        if env_base:
            args.base_id = [b.strip() for b in env_base.split(",") if b.strip()]
    if not args.base_id and airtable_defaults.get("base_id"):
        args.base_id = [airtable_defaults["base_id"]]
    return args


def _normalize_tables(args: argparse.Namespace) -> List[str]:
    tables: List[str] = []
    if args.table:
        tables.extend([t.strip() for t in args.table if t.strip()])
    if args.tables:
        tables.extend([t.strip() for t in args.tables.split(",") if t.strip()])
    return tables


def main() -> int:
    args = parse_args()
    tables = _normalize_tables(args)
    if not args.airtable_api_key:
        raise RuntimeError("Missing Airtable API key (use --airtable-api-key or AIRTABLE_API_KEY).")
    if not args.base_id:
        raise RuntimeError("Missing Airtable base id (--base-id or AIRTABLE_BASE_ID).")
    if not tables and not args.all_tables:
        raise RuntimeError("No tables specified (--tables/--table or use --all-tables).")
    if not (args.azure_connection_string or args.azure_container_sas):
        raise RuntimeError("Azure storage not configured (AZURE_BLOB_CONNECTION_STRING or AZURE_BLOB_CONTAINER_SAS).")
    if not args.azure_container and not args.azure_container_sas:
        raise RuntimeError("Azure container is required (AZURE_BLOB_CONTAINER).")

    container = _container_client_from_args(args)
    if args.azure_connection_string and args.azure_container:
        try:
            container.create_container()
        except ResourceExistsError:
            pass

    for base_id in args.base_id:
        base_tables = list(tables)
        if args.all_tables:
            print(f"Discovering tables for base {base_id}...")
            base_tables = list_tables(base_id, args.airtable_api_key)
            if not base_tables:
                raise RuntimeError(f"No tables found for base {base_id}")
        for table in base_tables:
            print(f"Fetching {table} from base {base_id}...")
            records = fetch_table(base_id, table, args.airtable_api_key, view=args.view)
            print(f"Fetched {len(records)} records from {table}.")
            snapshot_path = write_snapshot(table, base_id, records, args.snapshot_prefix)
            blob_name = snapshot_path.name
            print(f"Uploading {blob_name} to Azure...")
            upload_blob(container, blob_name, snapshot_path)
            if args.verbose:
                print(f"Snapshot stored at {snapshot_path}")

    print(f"Applying retention policy ({args.retention_days} days)...")
    gc_old_blobs(container, args.snapshot_prefix, args.retention_days)
    print("Done.")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as exc:  # surface clear errors for GitHub Actions
        print(f"ERROR: {exc}", file=sys.stderr)
        raise
