"""
Privacy Email & Reports Module - Phase 5D
Implements email preview, sending via Graph API, and report generation.
"""
import json
import sqlite3
import uuid
import secrets
from pathlib import Path
from typing import Optional, Dict, Any
from datetime import datetime

# Database path - eislaw.db
DB_PATH = Path(__file__).resolve().parent.parent / "data" / "eislaw.db"

# Hebrew level names
LEVEL_NAMES = {
    "lone": "מאגר בידי יחיד",
    "basic": "רמת אבטחה בסיסית",
    "mid": "רמת אבטחה בינונית",
    "high": "רמת אבטחה גבוהה",
}

# Hebrew requirement names
REQUIREMENT_NAMES = {
    "worker_security_agreement": "הסכם עובד לאבטחת מידע",
    "cameras_policy": "נוהל מצלמות אבטחה",
    "outsourcing_text": "נוסח התקשרות עם מעבד מידע",
    "consultation_call": "שיחת ייעוץ מקצועית",
    "direct_marketing_rules": "כללי דיוור ישיר",
}


def get_submission_with_review(submission_id: str) -> Optional[Dict]:
    """Get submission with review data from SQLite"""
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    cursor.execute("""
        SELECT
            ps.*,
            pr.level, pr.dpo, pr.reg, pr.report, pr.requirements,
            pr.status as review_status, pr.reviewed_by, pr.notes,
            pr.email_sent_at, pr.report_token
        FROM privacy_submissions ps
        LEFT JOIN privacy_reviews pr ON ps.id = pr.submission_id
        WHERE ps.id = ?
    """, (submission_id,))

    row = cursor.fetchone()
    conn.close()

    if not row:
        return None

    # Parse requirements JSON
    requirements = []
    if row["requirements"]:
        try:
            requirements = json.loads(row["requirements"])
        except:
            pass

    return {
        "submission_id": row["id"],
        "contact_name": row["contact_name"],
        "contact_email": row["contact_email"],
        "contact_phone": row["contact_phone"],
        "business_name": row["business_name"],
        "submitted_at": row["submitted_at"],
        "level": row["level"],
        "dpo": bool(row["dpo"]) if row["dpo"] is not None else None,
        "reg": bool(row["reg"]) if row["reg"] is not None else None,
        "report": bool(row["report"]) if row["report"] is not None else None,
        "requirements": requirements,
        "review_status": row["review_status"],
        "email_sent_at": row["email_sent_at"],
        "report_token": row["report_token"],
    }


def generate_email_html(data: Dict) -> str:
    """
    Generate HTML email content based on scoring results.
    Returns Hebrew RTL email suitable for sending.
    """
    level = data.get("level", "unknown")
    level_name = LEVEL_NAMES.get(level, level)
    business_name = data.get("business_name", "עסק לא צוין")
    contact_name = data.get("contact_name", "לקוח יקר")

    dpo = data.get("dpo", False)
    reg = data.get("reg", False)
    report_req = data.get("report", False)
    requirements = data.get("requirements", [])

    # Build requirements list HTML
    requirements_html = ""
    if requirements:
        requirements_items = "".join([
            f"<li style='margin: 5px 0;'>{REQUIREMENT_NAMES.get(req, req)}</li>"
            for req in requirements
        ])
        requirements_html = f"""
        <div style="margin: 20px 0; padding: 15px; background: #f8f9fa; border-radius: 8px;">
            <h3 style="margin: 0 0 10px 0; color: #333;">מסמכים נדרשים:</h3>
            <ul style="margin: 0; padding-right: 20px;">
                {requirements_items}
            </ul>
        </div>
        """

    # Build compliance requirements HTML
    compliance_items = []
    if dpo:
        compliance_items.append("✓ מינוי ממונה הגנת פרטיות (DPO)")
    if reg:
        compliance_items.append("✓ רישום מאגר ברשות להגנת הפרטיות")
    if report_req:
        compliance_items.append("✓ הגשת דו\"ח שנתי")

    compliance_html = ""
    if compliance_items:
        compliance_list = "".join([f"<li style='margin: 5px 0;'>{item}</li>" for item in compliance_items])
        compliance_html = f"""
        <div style="margin: 20px 0; padding: 15px; background: #fff3cd; border-radius: 8px; border-right: 4px solid #ffc107;">
            <h3 style="margin: 0 0 10px 0; color: #856404;">חובות רגולטוריות:</h3>
            <ul style="margin: 0; padding-right: 20px; color: #856404;">
                {compliance_list}
            </ul>
        </div>
        """

    # Level-specific color
    level_colors = {
        "lone": "#28a745",   # Green
        "basic": "#17a2b8",  # Blue
        "mid": "#ffc107",    # Yellow
        "high": "#dc3545",   # Red
    }
    level_color = level_colors.get(level, "#6c757d")

    html = f"""
<!DOCTYPE html>
<html dir="rtl" lang="he">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>תוצאות שאלון פרטיות - EISLAW</title>
</head>
<body style="font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; direction: rtl;">

    <div style="text-align: center; margin-bottom: 30px;">
        <img src="https://eislaw.co.il/logo.png" alt="EISLAW" style="max-width: 150px; height: auto;" onerror="this.style.display='none'">
        <h1 style="color: #2c3e50; margin: 20px 0 10px;">תוצאות אבחון פרטיות</h1>
    </div>

    <p>שלום {contact_name},</p>

    <p>תודה על מילוי שאלון האבחון עבור <strong>{business_name}</strong>.</p>

    <p>להלן תוצאות האבחון:</p>

    <div style="text-align: center; margin: 30px 0;">
        <div style="display: inline-block; padding: 20px 40px; background: {level_color}; color: white; border-radius: 10px; font-size: 24px; font-weight: bold;">
            {level_name}
        </div>
    </div>

    {compliance_html}

    {requirements_html}

    <div style="margin: 30px 0; padding: 20px; background: #e8f4f8; border-radius: 8px;">
        <h3 style="margin: 0 0 10px 0; color: #2c3e50;">השלבים הבאים:</h3>
        <p style="margin: 0;">צוות EISLAW יצור עמך קשר בימים הקרובים לתיאום שיחת ייעוץ והצגת הצעת מחיר מותאמת.</p>
    </div>

    <p>לשאלות או הבהרות, ניתן לפנות אלינו:</p>
    <ul style="padding-right: 20px;">
        <li>טלפון: 03-1234567</li>
        <li>אימייל: privacy@eislaw.co.il</li>
    </ul>

    <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">

    <p style="color: #666; font-size: 12px; text-align: center;">
        הודעה זו נשלחה אוטומטית ממערכת EISLAW.<br>
        © {datetime.now().year} EISLAW - פתרונות משפטיים
    </p>
</body>
</html>
    """
    return html


def preview_email(submission_id: str) -> Dict:
    """
    Generate email preview for a submission.
    Returns the HTML content and metadata.
    """
    data = get_submission_with_review(submission_id)
    if not data:
        return {"error": "Submission not found", "submission_id": submission_id}

    if not data.get("level"):
        return {"error": "Submission not scored yet", "submission_id": submission_id}

    html = generate_email_html(data)

    return {
        "submission_id": submission_id,
        "to": data.get("contact_email"),
        "to_name": data.get("contact_name"),
        "subject": f"תוצאות אבחון פרטיות - {data.get('business_name', 'עסק')}",
        "html": html,
        "level": data.get("level"),
        "level_name": LEVEL_NAMES.get(data.get("level"), data.get("level")),
    }


def send_email(submission_id: str, get_token_func, custom_html: Optional[str] = None) -> Dict:
    """
    Send email via Microsoft Graph API.
    Requires get_token_func to get Graph API access token.

    Args:
        submission_id: The submission ID
        get_token_func: Function that returns Graph API access token
        custom_html: Optional custom HTML (if None, generates from template)
    """
    import httpx

    data = get_submission_with_review(submission_id)
    if not data:
        return {"error": "Submission not found", "submission_id": submission_id}

    if not data.get("contact_email"):
        return {"error": "No email address for this submission", "submission_id": submission_id}

    if not data.get("level"):
        return {"error": "Submission not scored yet", "submission_id": submission_id}

    # Get email HTML
    html = custom_html if custom_html else generate_email_html(data)
    subject = f"תוצאות אבחון פרטיות - {data.get('business_name', 'עסק')}"

    # Get Graph API token
    try:
        token = get_token_func()
    except Exception as e:
        return {"error": f"Failed to get Graph API token: {str(e)}", "submission_id": submission_id}

    # Send email via Graph API
    # Use the shared mailbox or first user
    try:
        headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }

        # Get the sender mailbox (first user or shared mailbox)
        with httpx.Client(timeout=30.0) as client:
            # Get users
            users_resp = client.get(
                "https://graph.microsoft.com/v1.0/users?$select=id,mail,userPrincipalName&$top=5",
                headers=headers
            )

            if users_resp.status_code != 200:
                return {"error": f"Failed to get users: {users_resp.text}", "submission_id": submission_id}

            users = users_resp.json().get("value", [])
            if not users:
                return {"error": "No users found in organization", "submission_id": submission_id}

            # Use first user with a mail address
            sender = None
            for user in users:
                if user.get("mail"):
                    sender = user
                    break

            if not sender:
                sender = users[0]

            sender_id = sender.get("id")
            sender_email = sender.get("mail") or sender.get("userPrincipalName")

            # Create the email message
            message = {
                "message": {
                    "subject": subject,
                    "body": {
                        "contentType": "HTML",
                        "content": html
                    },
                    "toRecipients": [
                        {
                            "emailAddress": {
                                "address": data.get("contact_email"),
                                "name": data.get("contact_name", "")
                            }
                        }
                    ]
                },
                "saveToSentItems": "true"
            }

            # Send the email
            send_url = f"https://graph.microsoft.com/v1.0/users/{sender_id}/sendMail"
            send_resp = client.post(send_url, headers=headers, json=message)

            if send_resp.status_code not in [200, 202]:
                return {
                    "error": f"Failed to send email: {send_resp.status_code} - {send_resp.text}",
                    "submission_id": submission_id
                }

    except Exception as e:
        return {"error": f"Email sending failed: {str(e)}", "submission_id": submission_id}

    # Update database with email sent timestamp
    now = datetime.utcnow().isoformat()
    conn = sqlite3.connect(str(DB_PATH))
    cursor = conn.cursor()

    cursor.execute("""
        UPDATE privacy_reviews
        SET email_sent_at = ?, status = 'sent', updated_at = ?
        WHERE submission_id = ?
    """, (now, now, submission_id))

    conn.commit()
    conn.close()

    return {
        "submission_id": submission_id,
        "sent_to": data.get("contact_email"),
        "sent_at": now,
        "subject": subject,
        "sender": sender_email,
        "success": True
    }


def generate_report_token(submission_id: str) -> str:
    """Generate a unique token for public report access"""
    return secrets.token_urlsafe(32)


def approve_and_publish(submission_id: str) -> Dict:
    """
    Approve a submission and generate a public report token.
    Updates the review status and creates a shareable link.
    """
    data = get_submission_with_review(submission_id)
    if not data:
        return {"error": "Submission not found", "submission_id": submission_id}

    if not data.get("level"):
        return {"error": "Submission not scored yet", "submission_id": submission_id}

    # Generate report token if not exists
    report_token = data.get("report_token")
    if not report_token:
        report_token = generate_report_token(submission_id)

    # Update database
    now = datetime.utcnow().isoformat()
    conn = sqlite3.connect(str(DB_PATH))
    cursor = conn.cursor()

    cursor.execute("""
        UPDATE privacy_reviews
        SET status = 'approved', report_token = ?, updated_at = ?
        WHERE submission_id = ?
    """, (report_token, now, submission_id))

    if cursor.rowcount == 0:
        conn.close()
        return {"error": "No review found for submission", "submission_id": submission_id}

    conn.commit()
    conn.close()

    # Generate report URL (will be served by frontend or dedicated endpoint)
    report_url = f"/privacy/report/{report_token}"

    return {
        "submission_id": submission_id,
        "status": "approved",
        "report_token": report_token,
        "report_url": report_url,
        "approved_at": now,
        "business_name": data.get("business_name"),
        "level": data.get("level"),
    }


def get_report_by_token(token: str) -> Optional[Dict]:
    """
    Get report data by public token.
    Returns submission and scoring data for public display.
    """
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    cursor.execute("""
        SELECT
            ps.id, ps.business_name, ps.contact_name, ps.submitted_at,
            pr.level, pr.dpo, pr.reg, pr.report, pr.requirements,
            pr.status, pr.updated_at
        FROM privacy_reviews pr
        JOIN privacy_submissions ps ON pr.submission_id = ps.id
        WHERE pr.report_token = ? AND pr.status = 'approved'
    """, (token,))

    row = cursor.fetchone()
    conn.close()

    if not row:
        return None

    # Parse requirements
    requirements = []
    if row["requirements"]:
        try:
            requirements = json.loads(row["requirements"])
        except:
            pass

    return {
        "submission_id": row["id"],
        "business_name": row["business_name"],
        "contact_name": row["contact_name"],
        "submitted_at": row["submitted_at"],
        "level": row["level"],
        "level_name": LEVEL_NAMES.get(row["level"], row["level"]),
        "dpo": bool(row["dpo"]) if row["dpo"] is not None else False,
        "reg": bool(row["reg"]) if row["reg"] is not None else False,
        "report": bool(row["report"]) if row["report"] is not None else False,
        "requirements": requirements,
        "requirement_names": [REQUIREMENT_NAMES.get(r, r) for r in requirements],
        "status": row["status"],
        "generated_at": row["updated_at"],
    }


def get_report_html(token: str) -> Optional[str]:
    """
    Generate full HTML report page for public viewing.
    Returns None if token is invalid.
    """
    data = get_report_by_token(token)
    if not data:
        return None

    level = data.get("level", "unknown")
    level_name = data.get("level_name", level)
    business_name = data.get("business_name", "עסק")

    # Level colors
    level_colors = {
        "lone": "#28a745",
        "basic": "#17a2b8",
        "mid": "#ffc107",
        "high": "#dc3545",
    }
    level_color = level_colors.get(level, "#6c757d")

    # Build compliance HTML
    compliance_items = []
    if data.get("dpo"):
        compliance_items.append("מינוי ממונה הגנת פרטיות (DPO)")
    if data.get("reg"):
        compliance_items.append("רישום מאגר ברשות להגנת הפרטיות")
    if data.get("report"):
        compliance_items.append("הגשת דו\"ח שנתי")

    compliance_html = ""
    if compliance_items:
        items = "".join([f"<li>{item}</li>" for item in compliance_items])
        compliance_html = f"""
        <div class="section warning">
            <h3>חובות רגולטוריות</h3>
            <ul>{items}</ul>
        </div>
        """

    # Build requirements HTML
    requirements_html = ""
    if data.get("requirement_names"):
        items = "".join([f"<li>{req}</li>" for req in data.get("requirement_names")])
        requirements_html = f"""
        <div class="section">
            <h3>מסמכים נדרשים</h3>
            <ul>{items}</ul>
        </div>
        """

    submitted_at = data.get("submitted_at", "")[:10] if data.get("submitted_at") else ""
    generated_at = data.get("generated_at", "")[:10] if data.get("generated_at") else ""

    html = f"""
<!DOCTYPE html>
<html dir="rtl" lang="he">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>דו"ח פרטיות - {business_name}</title>
    <style>
        * {{
            box-sizing: border-box;
        }}
        body {{
            font-family: 'Segoe UI', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            direction: rtl;
            background: #f5f5f5;
        }}
        .report {{
            background: white;
            padding: 40px;
            border-radius: 12px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }}
        .header {{
            text-align: center;
            border-bottom: 2px solid #eee;
            padding-bottom: 20px;
            margin-bottom: 30px;
        }}
        .header h1 {{
            color: #2c3e50;
            margin: 10px 0;
        }}
        .business-name {{
            font-size: 24px;
            color: #666;
        }}
        .level-badge {{
            display: inline-block;
            padding: 15px 30px;
            background: {level_color};
            color: white;
            border-radius: 10px;
            font-size: 28px;
            font-weight: bold;
            margin: 20px 0;
        }}
        .section {{
            margin: 25px 0;
            padding: 20px;
            background: #f8f9fa;
            border-radius: 8px;
        }}
        .section.warning {{
            background: #fff3cd;
            border-right: 4px solid #ffc107;
        }}
        .section h3 {{
            margin: 0 0 15px 0;
            color: #2c3e50;
        }}
        .section ul {{
            margin: 0;
            padding-right: 25px;
        }}
        .section li {{
            margin: 8px 0;
        }}
        .meta {{
            text-align: center;
            color: #666;
            font-size: 14px;
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #eee;
        }}
        .footer {{
            text-align: center;
            color: #999;
            font-size: 12px;
            margin-top: 40px;
        }}
        @media print {{
            body {{
                background: white;
            }}
            .report {{
                box-shadow: none;
            }}
        }}
    </style>
</head>
<body>
    <div class="report">
        <div class="header">
            <h1>דו"ח אבחון פרטיות</h1>
            <div class="business-name">{business_name}</div>
            <div class="level-badge">{level_name}</div>
        </div>

        {compliance_html}

        {requirements_html}

        <div class="meta">
            <p>תאריך מילוי השאלון: {submitted_at}</p>
            <p>תאריך הפקת הדו"ח: {generated_at}</p>
        </div>

        <div class="footer">
            <p>דו"ח זה הופק באופן אוטומטי על ידי מערכת EISLAW</p>
            <p>© {datetime.now().year} EISLAW - פתרונות משפטיים</p>
        </div>
    </div>
</body>
</html>
    """
    return html
