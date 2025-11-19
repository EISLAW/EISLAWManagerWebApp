import os
import sqlite3
from pathlib import Path
from fastapi.testclient import TestClient

from scoring_service import main as svc


def _make_test_db(tmp_path: Path) -> Path:
    dbp = tmp_path / "email_index.sqlite"
    conn = sqlite3.connect(str(dbp))
    try:
        conn.execute(
            """
            CREATE TABLE messages (
              id TEXT PRIMARY KEY,
              client TEXT,
              received TEXT,
              subject TEXT,
              from_addr TEXT,
              to_addrs TEXT,
              cc_addrs TEXT,
              json_path TEXT,
              eml_path TEXT,
              user_upn TEXT
            )
            """
        )
        # Two clients, multiple rows with different timestamps
        rows = [
            ("m1","סיון בנימיני","2025-01-03T10:00:00Z","Hello Sivan","a@ex.co","sivan@ex.co","","/j/1","/e/1","eitan@eislaw.co.il"),
            ("m2","סיון בנימיני","2025-01-04T09:00:00Z","Proposal","b@ex.co","sivan@ex.co","","/j/2","/e/2","eitan@eislaw.co.il"),
            ("m3","יעל שמיר","2025-01-05T09:00:00Z","Onboarding","yael@eislaw.co.il","eitan@eislaw.co.il","","/j/3","/e/3","eitan@eislaw.co.il"),
        ]
        conn.executemany(
            "INSERT INTO messages (id,client,received,subject,from_addr,to_addrs,cc_addrs,json_path,eml_path,user_upn) VALUES (?,?,?,?,?,?,?,?,?,?)",
            rows,
        )
        conn.commit()
    finally:
        conn.close()
    return dbp


def test_email_by_client_pagination(monkeypatch, tmp_path):
    dbp = _make_test_db(tmp_path)

    # Monkeypatch index path to our temp DB
    monkeypatch.setattr(svc, "_email_index_path", lambda: dbp)
    client = TestClient(svc.app)

    r1 = client.get("/email/by_client", params={"name": "סיון בנימיני", "limit": 1, "offset": 0})
    assert r1.status_code == 200
    j1 = r1.json()
    assert j1["total"] == 2
    assert len(j1["items"]) == 1
    # Order by received DESC → m2 first
    assert j1["items"][0]["id"] == "m2"
    assert j1["next_offset"] == 1

    r2 = client.get("/email/by_client", params={"name": "סיון בנימיני", "limit": 1, "offset": j1["next_offset"]})
    assert r2.status_code == 200
    j2 = r2.json()
    assert len(j2["items"]) == 1
    assert j2["items"][0]["id"] == "m1"
    assert j2["next_offset"] is None


def test_email_search_q_and_mailbox(monkeypatch, tmp_path):
    dbp = _make_test_db(tmp_path)
    monkeypatch.setattr(svc, "_email_index_path", lambda: dbp)
    client = TestClient(svc.app)

    # Search by keyword on subject
    r = client.get("/email/search", params={"q": "Hello"})
    assert r.status_code == 200
    j = r.json()
    assert j["total"] >= 1
    ids = {it["id"] for it in j["items"]}
    assert "m1" in ids

    # Filter by mailbox user_upn
    r2 = client.get("/email/search", params={"mailbox": "eitan@eislaw.co.il", "limit": 10, "offset": 0})
    assert r2.status_code == 200
    j2 = r2.json()
    assert j2["total"] == 3


def test_email_search_empty_db(monkeypatch, tmp_path):
    empty = tmp_path / "email_index.sqlite"
    empty.touch()
    monkeypatch.setattr(svc, "_email_index_path", lambda: empty)
    client = TestClient(svc.app)
    r = client.get("/email/search", params={"q": "x"})
    assert r.status_code == 200
    assert r.json()["total"] == 0


def test_bad_limit_offset(monkeypatch, tmp_path):
    dbp = _make_test_db(tmp_path)
    monkeypatch.setattr(svc, "_email_index_path", lambda: dbp)
    client = TestClient(svc.app)
    r = client.get("/email/by_client", params={"name": "סיון בנימיני", "limit": "abc"})
    # FastAPI validation error for wrong type → 422
    assert r.status_code == 422
