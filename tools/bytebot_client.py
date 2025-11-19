"""
Lightweight Bytebot client for local use.
Uses Agent API (tasks) on 9991 and Desktop API (computer-use) on 9990.

Env (default to local):
  BYTEBOT_AGENT_URL=http://localhost:9991
  BYTEBOT_DESKTOP_URL=http://localhost:9990
"""

import os
import sys
import time
from pathlib import Path
from typing import Any, Dict, List, Optional

import requests

AGENT_URL = os.environ.get("BYTEBOT_AGENT_URL", "http://localhost:9991").rstrip("/")
DESKTOP_URL = os.environ.get("BYTEBOT_DESKTOP_URL", "http://localhost:9990").rstrip("/")

DEFAULT_MODEL = {
    "provider": "google",
    "name": "gemini-2.5-pro",
    "title": "Gemini 2.5 Pro",
}


def create_task(description: str, priority: str = "MEDIUM", files: Optional[List[Path]] = None, model: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    url = f"{AGENT_URL}/tasks"
    payload = {"description": description, "priority": priority, "model": model or DEFAULT_MODEL}
    if files:
        mfiles = [("files", (f.name, f.open("rb"))) for f in files]
        data = payload
        resp = requests.post(url, data=data, files=mfiles, timeout=30)
    else:
        resp = requests.post(url, json=payload, timeout=15)
    resp.raise_for_status()
    return resp.json()


def get_task(task_id: str) -> Dict[str, Any]:
    resp = requests.get(f"{AGENT_URL}/tasks/{task_id}", timeout=10)
    resp.raise_for_status()
    return resp.json()


def list_tasks() -> List[Dict[str, Any]]:
    resp = requests.get(f"{AGENT_URL}/tasks", timeout=10)
    resp.raise_for_status()
    return resp.json()


def desktop_action(action: str, **kwargs) -> Dict[str, Any]:
    payload = {"action": action}
    payload.update(kwargs)
    resp = requests.post(f"{DESKTOP_URL}/computer-use", json=payload, timeout=15)
    resp.raise_for_status()
    return resp.json()


def wait_for_task(task_id: str, timeout_s: int = 120, poll: float = 2.0) -> Dict[str, Any]:
    end = time.time() + timeout_s
    while time.time() < end:
        t = get_task(task_id)
        if t.get("status") in {"COMPLETED", "FAILED", "CANCELLED"}:
            return t
        time.sleep(poll)
    return t


def sample_workflow_open_and_shot(url: str, outfile: Path) -> None:
    # Drive desktop explicitly: open browser and screenshot
    desktop_action("open_browser", url=url) if False else None  # placeholder if future action exists
    # Generic click/keypress can be added here; for now just take screenshot
    shot = desktop_action("screenshot")
    data = shot.get("data") or {}
    b64png = data.get("image")
    if b64png:
        import base64
        outfile.write_bytes(base64.b64decode(b64png))
        print(f"Saved screenshot to {outfile}")
    else:
        print("No image data returned from screenshot")


def main():
    if len(sys.argv) < 2:
        print("Usage: python tools/bytebot_client.py \"Task description\" [PRIORITY]\n"
              "Examples:\n"
              "  python tools/bytebot_client.py \"Open browser to https://example.com and screenshot\" HIGH\n"
              "  python tools/bytebot_client.py --list\n")
        sys.exit(1)

    if sys.argv[1] == "--list":
        for t in list_tasks():
            print(t["id"], t.get("status"), t.get("description"))
        return

    desc = sys.argv[1]
    prio = sys.argv[2] if len(sys.argv) > 2 else "MEDIUM"
    task = create_task(desc, prio)
    print(f"Created task {task['id']} (status: {task['status']})")
    done = wait_for_task(task["id"], timeout_s=180)
    print(f"Final status: {done.get('status')}")
    msgs = done.get("messages") or []
    if msgs:
        print("Messages:")
        for m in msgs:
            print(f"- {m.get('role')}: {m.get('content')}")


if __name__ == "__main__":
    main()
