from datetime import datetime, timedelta

def clients():
    return [
        {
            "id": "c1",
            "name": "אורן בע\"מ",
            "email": "contact@oren.co",
            "sfu": {"phase": "analysis", "updated_at": datetime.utcnow().isoformat()},
            "localPath": "C:/Clients/oren",
        },
        {
            "id": "c2",
            "name": "י. אלון אחזקות",
            "email": "office@yalon.com",
            "sfu": {"phase": "quote", "updated_at": datetime.utcnow().isoformat()},
        },
    ]

def client_detail(cid: str):
    for c in clients():
        if c["id"] == cid:
            return c
    return None

def files(cid: str, location: str):
    now = datetime.utcnow()
    items = [
        {"name": "Agreement.docx", "modified": (now - timedelta(days=1)).isoformat(), "size": 120000, "webUrl": "https://sharepoint.example/doc"},
        {"name": "Notes.txt", "modified": (now - timedelta(days=2)).isoformat(), "size": 2048},
    ]
    return items

def emails(cid: str, top: int = 20):
    now = datetime.utcnow()
    return [
        {"id": "t1", "subject": "Follow-up", "from": "client@example.com", "date": now.isoformat(), "preview": "Thanks..."}
    ]

def privacy_scores(cid: str):
    return {"level": "basic", "dpo": False, "reg": False, "report": False, "notes": ["Demo only"]}

def projects():
    return [
        {"id": "p1", "title": "Contract Review", "status": "doing"},
        {"id": "p2", "title": "Incorporation", "status": "todo"},
    ]

def privacy_submissions(top: int = 50):
    return []

