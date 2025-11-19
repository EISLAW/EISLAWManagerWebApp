"""
Bytebot UI smoke task launcher.

Creates a Bytebot task to:
- Open the EISLAW app at http://localhost:5173
- Navigate to a given client page (default: רני דבוש)
- Capture a screenshot and save it on the desktop

Usage:
  python tools/bytebot_ui_smoke.py            # uses default client
  python tools/bytebot_ui_smoke.py "Client Name"  # custom client

Requires Bytebot stack running locally (agent on 9991, desktop on 9990).
"""

import os
import sys
from bytebot_client import create_task, wait_for_task, DEFAULT_MODEL

DEFAULT_CLIENT = "רני דבוש"

def main():
    client = sys.argv[1] if len(sys.argv) > 1 else DEFAULT_CLIENT
    desc = (
        f"Open browser to http://localhost:5173/#/clients/{client} , "
        "scroll if needed, and capture a screenshot. "
        "Save the screenshot to the desktop with the client name in the filename."
    )
    task = create_task(desc, priority="MEDIUM", model=DEFAULT_MODEL)
    print(f"Created Bytebot smoke task {task['id']} (status: {task['status']})")
    done = wait_for_task(task["id"], timeout_s=240)
    print(f"Final status: {done.get('status')}")
    if done.get("error"):
        print("Error:", done["error"])
    msgs = done.get("messages") or []
    if msgs:
        print("Messages:")
        for m in msgs:
            print(f"- {m.get('role')}: {m.get('content')}")

if __name__ == "__main__":
    main()
