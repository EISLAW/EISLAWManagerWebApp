import types
from fastapi.testclient import TestClient
from scoring_service import main as svc


client = TestClient(svc.app)


def test_sp_check_ok(monkeypatch):
    monkeypatch.setattr(svc, "_graph_app_creds", lambda: {"endpoint": "https://graph.microsoft.com/v1.0"})
    monkeypatch.setattr(svc, "_graph_token", lambda _creds: "tok")
    monkeypatch.setattr(svc, "_graph_sharepoint_site", lambda _creds: {"id": "site"})
    monkeypatch.setattr(svc, "_graph_sharepoint_drive", lambda _creds, _sid: "drive")
    # Any GET returns some dict (no exception => treated as OK)
    monkeypatch.setattr(svc, "_http_get", lambda url, headers: {})

    r = client.get("/sp/check")
    assert r.status_code == 200
    j = r.json()
    assert j["site"] is True
    assert j["drive"] is True
    assert j["base"] is True


def test_sp_folder_create_created(monkeypatch):
    monkeypatch.setattr(svc, "_graph_app_creds", lambda: {"endpoint": "https://graph.microsoft.com/v1.0"})

    def fake_ensure(creds, base, name):
        return {"created": True, "item": {"id": "it1", "name": name, "webUrl": "https://sp/item"}}

    monkeypatch.setattr(svc, "_graph_sharepoint_ensure_client_folder", fake_ensure)

    r = client.post("/sp/folder_create", json={"name": "סיון בנימיני"})
    assert r.status_code == 200
    j = r.json()
    assert j["created"] is True
    assert j["webUrl"].startswith("https://sp/")


def test_client_locations_merged(monkeypatch):
    # Provide a registry and a SharePoint item so the endpoint merges both
    reg = {
        "clients": [
            {
                "display_name": "סיון בנימיני",
                "folder": r"C:\\path\\לקוחות משרד\\סיון בנימיני",
            }
        ]
    }
    monkeypatch.setattr(svc, "_load_clients_registry", lambda: reg)
    monkeypatch.setattr(svc, "_graph_app_creds", lambda: {"endpoint": "https://graph.microsoft.com/v1.0"})
    monkeypatch.setattr(svc, "_graph_sharepoint_client_item", lambda _c, _b, _n: {"webUrl": "https://sp/client"})

    r = client.get("/api/client/locations", params={"name": "סיון בנימיני"})
    assert r.status_code == 200
    j = r.json()
    assert j["localFolder"].endswith("סיון בנימיני")
    assert j["sharepointUrl"].startswith("https://sp/")

