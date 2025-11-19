#!/usr/bin/env python3
import json
import sys
import time
from pathlib import Path

from tools.airtable_utils import get_cfg, create_record, delete_record, _v0_url, _req


def main() -> int:
    try:
        cfg = get_cfg()
    except Exception as e:
        print(json.dumps({"ok": False, "stage": "config", "error": str(e)}))
        return 2

    token = cfg["token"]
    base_id = cfg["base_id"]
    table_id = cfg["table_id"]

    result = {"ok": True, "read": None, "create": None, "delete": None}

    # 1) Read attempt (maxRecords=1)
    try:
        url = _v0_url(base_id, table_id, "maxRecords=1")
        out = _req("GET", url, token)
        result["read"] = True if "records" in out else False
        if result["read"] is False:
            result["ok"] = False
    except Exception as e:
        result["read"] = False
        result["ok"] = False
        result["read_error"] = str(e)

    # 2) Create + 3) Delete temp record
    rec_id = None
    ts = int(time.time())
    try:
        create_out = create_record(token, base_id, table_id, {"submission_id": f"dev-preflight-{ts}", "source": "preflight"})
        recs = create_out.get("records") or []
        rec_id = recs[0]["id"] if recs else None
        result["create"] = rec_id is not None
        if not rec_id:
            result["ok"] = False
    except Exception as e:
        result["create"] = False
        result["ok"] = False
        result["create_error"] = str(e)

    if rec_id:
        try:
            delete_out = delete_record(token, base_id, table_id, rec_id)
            ok = bool(delete_out.get("deleted"))
            result["delete"] = ok
            if not ok:
                result["ok"] = False
        except Exception as e:
            result["delete"] = False
            result["ok"] = False
            result["delete_error"] = str(e)

    print(json.dumps(result))
    return 0 if result["ok"] else 1


if __name__ == "__main__":
    sys.exit(main())

