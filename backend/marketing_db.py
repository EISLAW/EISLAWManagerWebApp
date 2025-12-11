"""
Marketing Database Module - SQLite storage for leads, campaigns, and attribution
"""
import sqlite3
import json
import re
from pathlib import Path
from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta
from contextlib import contextmanager

# Database path - same directory as privacy.db
DB_PATH = Path(__file__).resolve().parent.parent / "data" / "marketing.db"

# Lead status options
LEAD_STATUSES = ["new", "contacted", "qualified", "converted", "lost"]

# Lead score thresholds
SCORE_THRESHOLDS = {
    "high": 80,
    "medium": 50,
    "low": 0
}

# Default scoring rules
DEFAULT_SCORING_RULES = {
    "base_score": 50,
    "rules": [
        {"signal": "privacy_questionnaire_completed", "points": 25, "name": "השלים שאלון פרטיות"},
        {"signal": "appointment_form", "points": 20, "name": "טופס קביעת פגישה"},
        {"signal": "paid_ad_click", "points": 15, "name": "הגיע מפרסומת"},
        {"signal": "business_email", "points": 10, "name": "אימייל עסקי"},
        {"signal": "company_provided", "points": 10, "name": "ציין שם חברה"},
        {"signal": "phone_provided", "points": 5, "name": "השאיר טלפון"},
        {"signal": "returning_visitor", "points": 10, "name": "מבקר חוזר"},
        {"signal": "generic_email", "points": -5, "name": "אימייל גנרי"},
        {"signal": "no_phone", "points": -10, "name": "ללא טלפון"},
        {"signal": "organic_traffic", "points": -5, "name": "תנועה אורגנית"}
    ]
}

# Generic email domains
GENERIC_EMAIL_DOMAINS = [
    "gmail.com", "yahoo.com", "hotmail.com", "outlook.com",
    "walla.co.il", "walla.com", "013.net", "012.net.il",
    "bezeqint.net", "netvision.net.il", "zahav.net.il"
]


def get_db_path() -> Path:
    """Get database path, creating directory if needed"""
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    return DB_PATH


@contextmanager
def get_connection():
    """Context manager for database connections"""
    conn = sqlite3.connect(str(get_db_path()), timeout=30)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def init_db():
    """Initialize database tables"""
    with get_connection() as conn:
        cursor = conn.cursor()

        # Marketing leads table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS marketing_leads (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT DEFAULT CURRENT_TIMESTAMP,

                -- Contact Information
                full_name TEXT,
                email TEXT,
                phone TEXT,
                company_name TEXT,

                -- Attribution (UTM)
                utm_source TEXT,
                utm_medium TEXT,
                utm_campaign TEXT,
                utm_content TEXT,
                utm_term TEXT,

                -- Source Details
                source_type TEXT,
                source_form_id TEXT,
                source_form_name TEXT,
                landing_page TEXT,
                referrer TEXT,
                parsed_source TEXT,

                -- Service Classification
                service_type TEXT,

                -- Lead Scoring
                lead_score INTEGER DEFAULT 50,
                lead_score_factors TEXT,
                score_level TEXT DEFAULT 'medium',

                -- Lead Management
                status TEXT DEFAULT 'new',
                assigned_to TEXT,
                notes TEXT,

                -- Campaign Attribution
                attributed_campaign_id INTEGER,

                -- Privacy
                consent_given INTEGER DEFAULT 0,
                consent_timestamp TEXT,

                -- Raw Data
                raw_submission TEXT,
                fillout_submission_id TEXT UNIQUE,

                -- Duplicate handling
                duplicate_of_id INTEGER,

                -- Link to unified database (for future migration)
                client_id TEXT
            )
        """)

        # Marketing campaigns table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS marketing_campaigns (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,

                -- Campaign Identity
                name TEXT NOT NULL,
                utm_campaign TEXT NOT NULL UNIQUE,
                description TEXT,

                -- Channel & Targeting
                channel TEXT NOT NULL,
                target_service TEXT,
                target_audience TEXT,

                -- Budget & Timing
                budget REAL,
                currency TEXT DEFAULT 'ILS',
                start_date TEXT,
                end_date TEXT,

                -- Status
                status TEXT DEFAULT 'draft',

                -- Links
                destination_url TEXT,
                tracking_url TEXT,

                -- External IDs
                facebook_campaign_id TEXT,
                google_campaign_id TEXT
            )
        """)

        # Form to service mapping table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS marketing_form_mapping (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                fillout_form_id TEXT NOT NULL UNIQUE,
                form_name TEXT,
                service_type TEXT,
                is_active INTEGER DEFAULT 1,
                webhook_enabled INTEGER DEFAULT 0,
                scoring_bonus INTEGER DEFAULT 0
            )
        """)

        # Lead scoring rules table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS lead_scoring_rules (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                signal TEXT NOT NULL UNIQUE,
                points INTEGER NOT NULL,
                name TEXT,
                name_en TEXT,
                is_active INTEGER DEFAULT 1,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP
            )
        """)

        # Indexes
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_leads_email ON marketing_leads(email)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_leads_status ON marketing_leads(status)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_leads_created ON marketing_leads(created_at)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_leads_source ON marketing_leads(utm_source)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_leads_campaign ON marketing_leads(utm_campaign)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_leads_service ON marketing_leads(service_type)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_leads_score ON marketing_leads(lead_score)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_leads_phone ON marketing_leads(phone)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_leads_client_id ON marketing_leads(client_id)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_campaigns_utm ON marketing_campaigns(utm_campaign)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_campaigns_status ON marketing_campaigns(status)")

        # Initialize default scoring rules if empty
        cursor.execute("SELECT COUNT(*) as count FROM lead_scoring_rules")
        if cursor.fetchone()["count"] == 0:
            for rule in DEFAULT_SCORING_RULES["rules"]:
                cursor.execute("""
                    INSERT INTO lead_scoring_rules (signal, points, name)
                    VALUES (?, ?, ?)
                """, (rule["signal"], rule["points"], rule["name"]))


def is_business_email(email: str) -> bool:
    """Check if email is from a business domain (not generic)"""
    if not email:
        return False
    domain = email.lower().split("@")[-1] if "@" in email else ""
    return domain not in GENERIC_EMAIL_DOMAINS and domain != ""


def parse_source_from_referrer(referrer: str) -> str:
    """Parse traffic source from referrer URL"""
    if not referrer:
        return "direct"
    referrer_lower = referrer.lower()
    if "google.com" in referrer_lower or "google.co.il" in referrer_lower:
        return "google_organic"
    if "facebook.com" in referrer_lower or "fb.com" in referrer_lower:
        return "facebook_organic"
    if "linkedin.com" in referrer_lower:
        return "linkedin_organic"
    if "instagram.com" in referrer_lower:
        return "instagram_organic"
    return "referral"


def calculate_lead_score(
    email: str = None,
    phone: str = None,
    company_name: str = None,
    utm_source: str = None,
    utm_medium: str = None,
    service_type: str = None,
    form_id: str = None
) -> tuple:
    """Calculate lead score based on available signals"""
    score = DEFAULT_SCORING_RULES["base_score"]
    factors = []

    # Get scoring rules from database
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM lead_scoring_rules WHERE is_active = 1")
        rules = {row["signal"]: row for row in cursor.fetchall()}

    # Business email check
    if email:
        if is_business_email(email):
            if "business_email" in rules:
                score += rules["business_email"]["points"]
                factors.append({"signal": "business_email", "points": rules["business_email"]["points"]})
        else:
            if "generic_email" in rules:
                score += rules["generic_email"]["points"]
                factors.append({"signal": "generic_email", "points": rules["generic_email"]["points"]})

    # Phone provided
    if phone and phone.strip():
        if "phone_provided" in rules:
            score += rules["phone_provided"]["points"]
            factors.append({"signal": "phone_provided", "points": rules["phone_provided"]["points"]})
    else:
        if "no_phone" in rules:
            score += rules["no_phone"]["points"]
            factors.append({"signal": "no_phone", "points": rules["no_phone"]["points"]})

    # Company name provided
    if company_name and company_name.strip():
        if "company_provided" in rules:
            score += rules["company_provided"]["points"]
            factors.append({"signal": "company_provided", "points": rules["company_provided"]["points"]})

    # Paid traffic bonus
    if utm_medium and utm_medium.lower() in ["cpc", "paid", "ppc", "ad", "ads"]:
        if "paid_ad_click" in rules:
            score += rules["paid_ad_click"]["points"]
            factors.append({"signal": "paid_ad_click", "points": rules["paid_ad_click"]["points"]})
    elif not utm_source or utm_source.lower() in ["organic", "direct", ""]:
        if "organic_traffic" in rules:
            score += rules["organic_traffic"]["points"]
            factors.append({"signal": "organic_traffic", "points": rules["organic_traffic"]["points"]})

    # Service-specific bonuses
    if service_type == "privacy":
        if "privacy_questionnaire_completed" in rules:
            score += rules["privacy_questionnaire_completed"]["points"]
            factors.append({"signal": "privacy_questionnaire_completed", "points": rules["privacy_questionnaire_completed"]["points"]})
    elif service_type == "appointment":
        if "appointment_form" in rules:
            score += rules["appointment_form"]["points"]
            factors.append({"signal": "appointment_form", "points": rules["appointment_form"]["points"]})

    # Form-specific bonus
    if form_id:
        with get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT scoring_bonus FROM marketing_form_mapping WHERE fillout_form_id = ?", (form_id,))
            row = cursor.fetchone()
            if row and row["scoring_bonus"]:
                score += row["scoring_bonus"]
                factors.append({"signal": "form_bonus", "points": row["scoring_bonus"]})

    # Clamp score to 0-100
    score = max(0, min(100, score))

    # Determine level
    if score >= SCORE_THRESHOLDS["high"]:
        level = "high"
    elif score >= SCORE_THRESHOLDS["medium"]:
        level = "medium"
    else:
        level = "low"

    return score, level, factors


def find_duplicate(email: str, phone: str = None, days: int = 30) -> Optional[Dict]:
    """Check for duplicate leads within the specified time window"""
    with get_connection() as conn:
        cursor = conn.cursor()
        cutoff = (datetime.utcnow() - timedelta(days=days)).isoformat()

        if email:
            cursor.execute("""
                SELECT * FROM marketing_leads
                WHERE email = ? AND created_at > ?
                ORDER BY created_at DESC LIMIT 1
            """, (email, cutoff))
            row = cursor.fetchone()
            if row:
                return dict(row)

        if phone:
            normalized = re.sub(r"[^0-9]", "", phone)
            cursor.execute("""
                SELECT * FROM marketing_leads
                WHERE replace(replace(replace(phone, '-', ''), ' ', ''), '+', '') LIKE ?
                AND created_at > ?
                ORDER BY created_at DESC LIMIT 1
            """, (f"%{normalized[-9:]}", cutoff))
            row = cursor.fetchone()
            if row:
                return dict(row)

    return None


def save_lead(
    full_name: str = None,
    email: str = None,
    phone: str = None,
    company_name: str = None,
    utm_source: str = None,
    utm_medium: str = None,
    utm_campaign: str = None,
    utm_content: str = None,
    utm_term: str = None,
    source_type: str = "fillout",
    source_form_id: str = None,
    source_form_name: str = None,
    landing_page: str = None,
    referrer: str = None,
    service_type: str = None,
    raw_submission: Dict = None,
    fillout_submission_id: str = None,
    check_duplicate: bool = True
) -> tuple:
    """
    Save a marketing lead to the database.
    Returns (lead_id, is_new, duplicate_of_id)
    """
    duplicate_of_id = None
    if check_duplicate:
        existing = find_duplicate(email, phone)
        if existing:
            duplicate_of_id = existing["id"]

    parsed_source = None
    if not utm_source:
        parsed_source = parse_source_from_referrer(referrer)
        if parsed_source != "direct":
            utm_source = parsed_source

    score, level, factors = calculate_lead_score(
        email=email,
        phone=phone,
        company_name=company_name,
        utm_source=utm_source,
        utm_medium=utm_medium,
        service_type=service_type,
        form_id=source_form_id
    )

    attributed_campaign_id = None
    if utm_campaign:
        with get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT id FROM marketing_campaigns WHERE utm_campaign = ?", (utm_campaign,))
            row = cursor.fetchone()
            if row:
                attributed_campaign_id = row["id"]

    with get_connection() as conn:
        cursor = conn.cursor()

        if fillout_submission_id:
            cursor.execute(
                "SELECT id FROM marketing_leads WHERE fillout_submission_id = ?",
                (fillout_submission_id,)
            )
            existing = cursor.fetchone()
            if existing:
                return existing["id"], False, None

        cursor.execute("""
            INSERT INTO marketing_leads (
                full_name, email, phone, company_name,
                utm_source, utm_medium, utm_campaign, utm_content, utm_term,
                source_type, source_form_id, source_form_name, landing_page, referrer, parsed_source,
                service_type, lead_score, lead_score_factors, score_level,
                attributed_campaign_id, raw_submission, fillout_submission_id, duplicate_of_id
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            full_name, email, phone, company_name,
            utm_source, utm_medium, utm_campaign, utm_content, utm_term,
            source_type, source_form_id, source_form_name, landing_page, referrer, parsed_source,
            service_type, score, json.dumps(factors), level,
            attributed_campaign_id, json.dumps(raw_submission) if raw_submission else None,
            fillout_submission_id, duplicate_of_id
        ))

        return cursor.lastrowid, True, duplicate_of_id


def get_lead(lead_id: int) -> Optional[Dict]:
    """Get a lead by ID"""
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM marketing_leads WHERE id = ?", (lead_id,))
        row = cursor.fetchone()
        if row:
            result = dict(row)
            if result.get("lead_score_factors"):
                result["lead_score_factors"] = json.loads(result["lead_score_factors"])
            if result.get("raw_submission"):
                result["raw_submission"] = json.loads(result["raw_submission"])
            return result
    return None


def get_leads(
    limit: int = 50,
    offset: int = 0,
    status: str = None,
    utm_source: str = None,
    utm_campaign: str = None,
    service_type: str = None,
    min_score: int = None,
    from_date: str = None,
    to_date: str = None,
    search: str = None
) -> List[Dict]:
    """Get leads with filters"""
    with get_connection() as conn:
        cursor = conn.cursor()

        query = "SELECT * FROM marketing_leads WHERE 1=1"
        params = []

        if status:
            query += " AND status = ?"
            params.append(status)
        if utm_source:
            query += " AND utm_source = ?"
            params.append(utm_source)
        if utm_campaign:
            query += " AND utm_campaign = ?"
            params.append(utm_campaign)
        if service_type:
            query += " AND service_type = ?"
            params.append(service_type)
        if min_score is not None:
            query += " AND lead_score >= ?"
            params.append(min_score)
        if from_date:
            query += " AND created_at >= ?"
            params.append(from_date)
        if to_date:
            query += " AND created_at <= ?"
            params.append(to_date)
        if search:
            query += " AND (full_name LIKE ? OR email LIKE ? OR company_name LIKE ? OR phone LIKE ?)"
            search_term = f"%{search}%"
            params.extend([search_term, search_term, search_term, search_term])

        query += " ORDER BY created_at DESC LIMIT ? OFFSET ?"
        params.extend([limit, offset])

        cursor.execute(query, params)
        results = []
        for row in cursor.fetchall():
            result = dict(row)
            if result.get("lead_score_factors"):
                try:
                    result["lead_score_factors"] = json.loads(result["lead_score_factors"])
                except:
                    pass
            results.append(result)
        return results


def update_lead(lead_id: int, **kwargs) -> bool:
    """Update lead fields"""
    allowed_fields = ["status", "assigned_to", "notes", "full_name", "email", "phone", "company_name"]
    updates = {k: v for k, v in kwargs.items() if k in allowed_fields}

    if not updates:
        return False

    with get_connection() as conn:
        cursor = conn.cursor()
        set_clause = ", ".join([f"{k} = ?" for k in updates.keys()])
        params = list(updates.values()) + [datetime.utcnow().isoformat(), lead_id]

        cursor.execute(f"""
            UPDATE marketing_leads
            SET {set_clause}, updated_at = ?
            WHERE id = ?
        """, params)
        return cursor.rowcount > 0


def save_campaign(
    name: str,
    utm_campaign: str,
    channel: str,
    description: str = None,
    target_service: str = None,
    budget: float = None,
    start_date: str = None,
    end_date: str = None,
    destination_url: str = None
) -> int:
    """Save a new campaign"""
    tracking_url = None
    if destination_url:
        separator = "&" if "?" in destination_url else "?"
        tracking_url = f"{destination_url}{separator}utm_source={channel}&utm_medium=cpc&utm_campaign={utm_campaign}"

    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO marketing_campaigns (
                name, utm_campaign, channel, description, target_service,
                budget, start_date, end_date, destination_url, tracking_url, status
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            name, utm_campaign, channel, description, target_service,
            budget, start_date, end_date, destination_url, tracking_url, "draft"
        ))
        return cursor.lastrowid


def get_campaigns(status: str = None) -> List[Dict]:
    """Get all campaigns"""
    with get_connection() as conn:
        cursor = conn.cursor()
        if status:
            cursor.execute("SELECT * FROM marketing_campaigns WHERE status = ? ORDER BY created_at DESC", (status,))
        else:
            cursor.execute("SELECT * FROM marketing_campaigns ORDER BY created_at DESC")
        return [dict(row) for row in cursor.fetchall()]


def get_campaign(campaign_id: int) -> Optional[Dict]:
    """Get a campaign by ID"""
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM marketing_campaigns WHERE id = ?", (campaign_id,))
        row = cursor.fetchone()
        return dict(row) if row else None


def update_campaign(campaign_id: int, **kwargs) -> bool:
    """Update campaign fields"""
    allowed_fields = ["name", "description", "status", "budget", "start_date", "end_date", "target_service"]
    updates = {k: v for k, v in kwargs.items() if k in allowed_fields}

    if not updates:
        return False

    with get_connection() as conn:
        cursor = conn.cursor()
        set_clause = ", ".join([f"{k} = ?" for k in updates.keys()])
        params = list(updates.values()) + [campaign_id]
        cursor.execute(f"UPDATE marketing_campaigns SET {set_clause} WHERE id = ?", params)
        return cursor.rowcount > 0


def get_campaign_stats(campaign_id: int = None, days: int = 30) -> Dict:
    """Get campaign performance statistics"""
    with get_connection() as conn:
        cursor = conn.cursor()
        cutoff = (datetime.utcnow() - timedelta(days=days)).isoformat()

        if campaign_id:
            cursor.execute("""
                SELECT
                    COUNT(*) as total_leads,
                    SUM(CASE WHEN status = 'converted' THEN 1 ELSE 0 END) as conversions,
                    AVG(lead_score) as avg_score
                FROM marketing_leads
                WHERE attributed_campaign_id = ? AND created_at > ?
            """, (campaign_id, cutoff))
            row = cursor.fetchone()

            campaign = get_campaign(campaign_id)
            cost_per_lead = None
            if campaign and campaign.get("budget") and row["total_leads"]:
                cost_per_lead = campaign["budget"] / row["total_leads"]

            return {
                "campaign_id": campaign_id,
                "total_leads": row["total_leads"] or 0,
                "conversions": row["conversions"] or 0,
                "conversion_rate": (row["conversions"] / row["total_leads"]) if row["total_leads"] else 0,
                "avg_score": round(row["avg_score"], 1) if row["avg_score"] else 0,
                "cost_per_lead": round(cost_per_lead, 2) if cost_per_lead else None
            }
        else:
            cursor.execute("""
                SELECT
                    mc.id, mc.name, mc.channel, mc.budget,
                    COUNT(ml.id) as total_leads,
                    SUM(CASE WHEN ml.status = 'converted' THEN 1 ELSE 0 END) as conversions,
                    AVG(ml.lead_score) as avg_score
                FROM marketing_campaigns mc
                LEFT JOIN marketing_leads ml ON ml.attributed_campaign_id = mc.id AND ml.created_at > ?
                GROUP BY mc.id
            """, (cutoff,))

            results = []
            for row in cursor.fetchall():
                cost_per_lead = None
                if row["budget"] and row["total_leads"]:
                    cost_per_lead = row["budget"] / row["total_leads"]
                results.append({
                    "campaign_id": row["id"],
                    "campaign_name": row["name"],
                    "channel": row["channel"],
                    "total_leads": row["total_leads"] or 0,
                    "conversions": row["conversions"] or 0,
                    "avg_score": round(row["avg_score"], 1) if row["avg_score"] else 0,
                    "cost_per_lead": round(cost_per_lead, 2) if cost_per_lead else None
                })
            return results


def get_leads_stats(days: int = 30) -> Dict:
    """Get overall lead statistics"""
    with get_connection() as conn:
        cursor = conn.cursor()
        cutoff = (datetime.utcnow() - timedelta(days=days)).isoformat()
        today = datetime.utcnow().date().isoformat()

        cursor.execute("SELECT COUNT(*) as count FROM marketing_leads WHERE created_at > ?", (cutoff,))
        total = cursor.fetchone()["count"]

        cursor.execute("SELECT COUNT(*) as count FROM marketing_leads WHERE date(created_at) = ?", (today,))
        today_count = cursor.fetchone()["count"]

        cursor.execute("""
            SELECT COALESCE(utm_source, parsed_source, 'direct') as source, COUNT(*) as count
            FROM marketing_leads WHERE created_at > ?
            GROUP BY source ORDER BY count DESC
        """, (cutoff,))
        by_source = {row["source"]: row["count"] for row in cursor.fetchall()}

        cursor.execute("""
            SELECT COALESCE(service_type, 'general') as service, COUNT(*) as count
            FROM marketing_leads WHERE created_at > ?
            GROUP BY service ORDER BY count DESC
        """, (cutoff,))
        by_service = {row["service"]: row["count"] for row in cursor.fetchall()}

        cursor.execute("""
            SELECT status, COUNT(*) as count
            FROM marketing_leads WHERE created_at > ?
            GROUP BY status
        """, (cutoff,))
        by_status = {row["status"]: row["count"] for row in cursor.fetchall()}

        cursor.execute("SELECT AVG(lead_score) as avg FROM marketing_leads WHERE created_at > ?", (cutoff,))
        avg_score = cursor.fetchone()["avg"]

        cursor.execute("""
            SELECT COUNT(*) as count FROM marketing_leads
            WHERE created_at > ? AND lead_score >= 80 AND status = 'new'
        """, (cutoff,))
        hot_leads = cursor.fetchone()["count"]

        return {
            "period_days": days,
            "total_leads": total,
            "leads_today": today_count,
            "by_source": by_source,
            "by_service": by_service,
            "by_status": by_status,
            "avg_score": round(avg_score, 1) if avg_score else 0,
            "hot_leads_pending": hot_leads
        }


def save_form_mapping(form_id: str, form_name: str = None, service_type: str = None, scoring_bonus: int = 0):
    """Save or update form to service mapping"""
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO marketing_form_mapping (fillout_form_id, form_name, service_type, scoring_bonus)
            VALUES (?, ?, ?, ?)
            ON CONFLICT(fillout_form_id) DO UPDATE SET
                form_name = excluded.form_name,
                service_type = excluded.service_type,
                scoring_bonus = excluded.scoring_bonus
        """, (form_id, form_name, service_type, scoring_bonus))


def get_form_mapping(form_id: str) -> Optional[Dict]:
    """Get form mapping by form ID"""
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM marketing_form_mapping WHERE fillout_form_id = ?", (form_id,))
        row = cursor.fetchone()
        return dict(row) if row else None


def get_all_form_mappings() -> List[Dict]:
    """Get all form mappings"""
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM marketing_form_mapping ORDER BY form_name")
        return [dict(row) for row in cursor.fetchall()]


def get_scoring_rules() -> List[Dict]:
    """Get all lead scoring rules"""
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM lead_scoring_rules ORDER BY points DESC")
        return [dict(row) for row in cursor.fetchall()]


def update_scoring_rule(signal: str, points: int, name: str = None, is_active: bool = True) -> bool:
    """Update or create a scoring rule"""
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO lead_scoring_rules (signal, points, name, is_active)
            VALUES (?, ?, ?, ?)
            ON CONFLICT(signal) DO UPDATE SET
                points = excluded.points,
                name = COALESCE(excluded.name, lead_scoring_rules.name),
                is_active = excluded.is_active
        """, (signal, points, name, 1 if is_active else 0))
        return True


# Initialize on import
init_db()
