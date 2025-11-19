import json
import types
from fastapi.testclient import TestClient

from scoring_service import main as svc


client = TestClient(svc.app)


def test_email_sync_client_uses_registry(monkeypatch):
    entry = {
        "display_name": "סיון בנימיני",
        "email": ["sivan@example.com"],
        "contacts": [{"email": "ops@example.com"}],
    }
    monkeypatch.setattr(svc, "_registry_entry_for", lambda name: entry if name == "סיון בנימיני" else None)

    calls = {}

    def fake_run(cmd, capture_output, text, cwd, timeout):
        calls["cmd"] = cmd
        calls["cwd"] = cwd
        calls["timeout"] = timeout

        class Result:
            returncode = 0
            stdout = "synced\n" + json.dumps({"ok": True, "inserted_or_updated": 2})
            stderr = ""

        return Result()

    monkeypatch.setattr(svc, "subprocess", types.SimpleNamespace(run=fake_run))

    r = client.post("/email/sync_client", json={"name": "סיון בנימיני", "since_days": 30})
    assert r.status_code == 200
    j = r.json()
    assert j["summary"]["inserted_or_updated"] == 2
    assert j["participants"] == ["sivan@example.com", "ops@example.com"]
    assert "--participants" in calls["cmd"]
    pi = calls["cmd"].index("--participants")
    assert calls["cmd"][pi + 1] == "sivan@example.com,ops@example.com"
    assert "--since-days" in calls["cmd"]
    si = calls["cmd"].index("--since-days")
    assert calls["cmd"][si + 1] == "30"


def test_email_sync_client_requires_participants(monkeypatch):
    monkeypatch.setattr(svc, "_registry_entry_for", lambda name: None)
    r = client.post("/email/sync_client", json={"name": "unknown"})
    assert r.status_code == 400


def test_email_sync_client_worker_failure(monkeypatch):
    entry = {"display_name": "סיון בנימיני", "email": ["sivan@example.com"]}
    monkeypatch.setattr(svc, "_registry_entry_for", lambda name: entry)

    def fake_run(cmd, capture_output, text, cwd, timeout):
        class Result:
            returncode = 1
            stdout = "synced 0"
            stderr = "boom"

        return Result()

    monkeypatch.setattr(svc, "subprocess", types.SimpleNamespace(run=fake_run))

    r = client.post("/email/sync_client", json={"name": "סיון בנימיני"})
    assert r.status_code == 500
    detail = r.json()["detail"]
    assert detail["exit_code"] == 1
