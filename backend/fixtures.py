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
    """Mock privacy assessment submissions for QA testing"""
    now = datetime.utcnow()
    return [
        {
            "submission_id": "sub_001",
            "contact_name": "דוד כהן",
            "business_name": "כהן ושות' עורכי דין",
            "contact_email": "david@cohen-law.co.il",
            "contact_phone": "050-1234567",
            "level": "mid",
            "submitted_at": (now - timedelta(hours=2)).isoformat(),
            "status": "pending"
        },
        {
            "submission_id": "sub_002",
            "contact_name": "שרה לוי",
            "business_name": "לוי יועצים בע\"מ",
            "contact_email": "sara@levi-consulting.com",
            "contact_phone": "052-9876543",
            "level": "basic",
            "submitted_at": (now - timedelta(hours=5)).isoformat(),
            "status": "pending"
        },
        {
            "submission_id": "sub_003",
            "contact_name": "משה ישראלי",
            "business_name": "ישראלי טכנולוגיות",
            "contact_email": "moshe@israeli-tech.co.il",
            "contact_phone": "054-5555555",
            "level": "high",
            "submitted_at": (now - timedelta(hours=8)).isoformat(),
            "status": "pending"
        },
        {
            "submission_id": "sub_004",
            "contact_name": "רונית אברהם",
            "business_name": "אברהם מסחר",
            "contact_email": "ronit@avraham-trade.com",
            "contact_phone": "053-1112222",
            "level": "basic",
            "submitted_at": (now - timedelta(days=1)).isoformat(),
            "status": "pending"
        },
        {
            "submission_id": "sub_005",
            "contact_name": "יוסי גולן",
            "business_name": "גולן נדל\"ן",
            "contact_email": "yossi@golan-realestate.co.il",
            "contact_phone": "050-3334444",
            "level": "mid",
            "submitted_at": (now - timedelta(days=1, hours=3)).isoformat(),
            "status": "pending"
        },
    ]

def privacy_submission_detail(submission_id: str):
    """Get detailed submission with answers and score"""
    submissions = privacy_submissions()
    for sub in submissions:
        if sub["submission_id"] == submission_id:
            # Add detailed data
            return {
                **sub,
                "answers": {
                    "contact_name": sub["contact_name"],
                    "business_name": sub["business_name"],
                    "contact_email": sub["contact_email"],
                    "contact_phone": sub["contact_phone"],
                    "owners": "חברה פרטית" if sub["level"] != "lone" else "יחיד",
                    "access": "עובדים + לקוחות",
                    "ppl": "100-500" if sub["level"] == "high" else "10-50" if sub["level"] == "mid" else "עד 10",
                    "sensitive_people": sub["level"] in ["mid", "high"],
                    "sensitive_types": ["בריאות", "פיננסי"] if sub["level"] == "high" else ["פיננסי"] if sub["level"] == "mid" else [],
                    "biometric_100k": sub["level"] == "high",
                    "transfer": sub["level"] == "high",
                    "directmail_biz": sub["level"] in ["mid", "high"],
                    "processor": sub["level"] in ["mid", "high"],
                    "cameras": sub["level"] == "high",
                },
                "score": {
                    "level": sub["level"],
                    "dpo": sub["level"] == "high",
                    "reg": sub["level"] in ["mid", "high"],
                    "report": sub["level"] == "high",
                    "requirements": ["worker_security_agreement"] if sub["level"] in ["mid", "high"] else [],
                    "confidence": 87 if sub["level"] == "mid" else 92 if sub["level"] == "basic" else 78,
                }
            }
    return None

def privacy_labels():
    """Labels for privacy form fields"""
    return {
        "owners": "סוג הארגון",
        "access": "גישה למידע",
        "ppl": "כמות נושאי מידע",
        "sensitive_people": "אוכלוסיות רגישות",
        "sensitive_types": "סוגי מידע רגיש",
        "biometric_100k": "מידע ביומטרי (100K+)",
        "transfer": "העברה לחו\"ל",
        "directmail_biz": "דיוור ישיר עסקי",
        "directmail_self": "דיוור ישיר עצמי",
        "processor": "מעבד מידע",
        "processor_large_org": "מעבד לארגון גדול",
        "employees_exposed": "עובדים חשופים",
        "cameras": "מצלמות אבטחה",
        "ethics": "ועדת אתיקה",
    }

def privacy_metrics():
    """Accuracy metrics for the algorithm"""
    return {
        "accuracy_overall": 0.89,
        "accuracy_lastN": 0.92,
        "window": 10,
        "total_reviewed": 47,
        "total_correct": 42,
        "total_override": 5,
    }
