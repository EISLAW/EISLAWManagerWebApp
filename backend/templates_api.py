"""
Templates API endpoints for Quick Actions feature.
Provides quote templates and delivery email templates.
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional

router = APIRouter(prefix="/api/templates", tags=["templates"])


# ─────────────────────────────────────────────────────────────────────────────
# Price Quote Templates
# ─────────────────────────────────────────────────────────────────────────────

QUOTE_TEMPLATES = {
    "categories": [
        {
            "id": "privacy",
            "name": "פרטיות",
            "templates": [
                {
                    "id": "basic",
                    "name": "מאגר בידי יחיד",
                    "price": "2,300 ₪",
                    "description": "חבילה חד-פעמית לעסק קטן המנהל מאגר בידי יחיד",
                    "includes": [
                        "מדיניות פרטיות מעודכנת",
                        "נוסח יידוע לפי סעיף 11",
                        "נוסח מייל עדכון לרשימת התפוצה",
                        "תוספת להסכם השירותים",
                        "מסמך הגדרות מאגר"
                    ]
                },
                {
                    "id": "medium",
                    "name": "רמת אבטחה בינונית",
                    "price": "14,250 ₪",
                    "description": "פרויקט חד-פעמי לעסק ברמת אבטחה בינונית",
                    "includes": [
                        "הסכם לקוחות מעודכן",
                        "מדיניות פרטיות עדכנית לפי תיקון 13",
                        "נוסח יידוע והסכמה + הנחיות הטמעה",
                        "מייל עדכון ללקוחות קיימים",
                        "הסכם עיבוד מידע (DPA)",
                        "נספח אבטחת מידע להסכמי פרילנס"
                    ]
                },
                {
                    "id": "medium_retainer",
                    "name": "רמת אבטחה בינונית + ריטיינר",
                    "price": "5,000 ₪/חודש",
                    "commitment": "12 חודשים",
                    "description": "ליווי שוטף לעסק ברמת אבטחה בינונית כולל DPO",
                    "includes": [
                        "כל המסמכים של חבילת בינונית",
                        "מינוי DPO רשמי",
                        "ליווי משפטי שוטף",
                        "עדכונים שוטפים לפי שינויי חקיקה"
                    ]
                },
                {
                    "id": "high",
                    "name": "רמת אבטחה גבוהה + DPO",
                    "price": "6,250 ₪/חודש",
                    "commitment": "18 חודשים",
                    "description": "ליווי מלא לארגון ברמת אבטחה גבוהה",
                    "includes": [
                        "כל השירותים של חבילת בינונית",
                        "מינוי DPO רשמי",
                        "ליווי אבטחת מידע טכני",
                        "טיפול בהיבטים רגולטוריים מורכבים"
                    ]
                }
            ]
        },
        {
            "id": "commercial",
            "name": "מסחרי",
            "templates": [
                {
                    "id": "client_agreement",
                    "name": "הסכם לקוחות",
                    "price": "3,500 ₪",
                    "description": "הסכם שירות סטנדרטי ללקוחות"
                },
                {
                    "id": "freelancer_agreement",
                    "name": "הסכם פרילנס",
                    "price": "2,500 ₪",
                    "description": "הסכם להעסקת קבלן עצמאי"
                },
                {
                    "id": "terms_of_service",
                    "name": "תקנון אתר",
                    "price": "2,800 ₪",
                    "description": "תקנון לאתר מסחרי/צרכני"
                }
            ]
        }
    ]
}


@router.get("/quotes")
async def get_quote_templates():
    """Get all available quote template categories."""
    return QUOTE_TEMPLATES


class QuoteRenderRequest(BaseModel):
    template_id: str
    client_name: str
    client_email: Optional[str] = None
    custom_price: Optional[str] = None
    notes: Optional[str] = None


@router.post("/quotes/render")
async def render_quote_template(req: QuoteRenderRequest):
    """
    Render a quote template with client details.
    Returns the email subject and body ready for mailto: link.
    """
    # Find the template
    template = None
    for cat in QUOTE_TEMPLATES["categories"]:
        for tpl in cat["templates"]:
            if tpl["id"] == req.template_id:
                template = tpl
                break
        if template:
            break

    if not template:
        raise HTTPException(status_code=404, detail="Template not found")

    price = req.custom_price or template.get("price", "")
    commitment = template.get("commitment", "")

    # Build email body
    includes_list = "\n".join([f"- {item}" for item in template.get("includes", [])])

    body = f"""הי {req.client_name},

בהמשך לשיחתנו הנעימה:

{template.get('description', '')}

במסגרת זו, אני אכין בעבורך:
{includes_list}

**המחיר:** {price} בצירוף מע"מ.
{f'התחייבות: {commitment}' if commitment else ''}
ניתן לפרוס לתשלומים באמצעות כרטיס אשראי.

ככל שמקובל, אנא החזר/י "מאושר" במייל חוזר ונתקדם.
יעל המכותבת תטפל במנהלות והתשלומים.

{req.notes or ''}

איתן שמיר, עו"ד
"""

    subject = f"{req.client_name} - הצעת מחיר ל{template['name']}"

    return {
        "subject": subject,
        "body": body,
        "template": template
    }


# ─────────────────────────────────────────────────────────────────────────────
# Delivery Email Templates
# ─────────────────────────────────────────────────────────────────────────────

DELIVERY_TEMPLATES = {
    "templates": [
        {
            "id": "full_package",
            "name": "משלוח מסמכים - חבילה מלאה",
            "description": "משלוח ראשוני של כל המסמכים החשובים",
            "body": """הי {client_name},

ראי/ראה {doc_count} מסמכים שהכנתי בעבורכם, והם גם החשובים ביותר בשלב זה.
נתחיל בהם ונתקדם.

מה מצורף לכאן:
{doc_list}

יש פה הרבה מסמכים, וזה הרבה שיעורי בית, אז קח/י את הזמן.
אני כתמיד פה לכל עניין, ואל תהסס/י לשאול אותי שאלות!

אחלה שבוע יקירתי :)
איתן"""
        },
        {
            "id": "partial",
            "name": "משלוח מסמכים - המשך/חלקי",
            "description": "משלוח המשך של מסמכים נוספים",
            "body": """הי {client_name},

נתתי לך כמה ימים לעכל – אז הגיעה העת להפיל עליך עוד כמה מסמכים :)

מצורפים:
{doc_list}

עייני/עיין נא, ואם יש שאלות - אני פה!

סופ"ש מעולה,
איתן"""
        },
        {
            "id": "single",
            "name": "משלוח מסמך בודד",
            "description": "משלוח של מסמך אחד עם הנחיות",
            "body": """היוש {client_name},

ראי/ראה מצ"ב {doc_name}.
{instructions}

איתן"""
        }
    ]
}


@router.get("/delivery")
async def get_delivery_templates():
    """Get all available delivery email templates."""
    return DELIVERY_TEMPLATES


class DeliveryRenderRequest(BaseModel):
    template_id: str
    client_name: str
    client_email: Optional[str] = None
    documents: List[str] = []
    instructions: Optional[str] = None


@router.post("/delivery/render")
async def render_delivery_template(req: DeliveryRenderRequest):
    """
    Render a delivery email template with client and document details.
    Returns the email subject and body ready for mailto: link.
    """
    # Find the template
    template = None
    for tpl in DELIVERY_TEMPLATES["templates"]:
        if tpl["id"] == req.template_id:
            template = tpl
            break

    if not template:
        raise HTTPException(status_code=404, detail="Template not found")

    # Format document list
    doc_list = "\n".join([f"• {doc}" for doc in req.documents]) if req.documents else ""
    doc_count = len(req.documents)
    doc_name = req.documents[0] if req.documents else ""

    # Render body with placeholders
    body = template["body"].format(
        client_name=req.client_name,
        doc_count=doc_count,
        doc_list=doc_list,
        doc_name=doc_name,
        instructions=req.instructions or ""
    )

    subject = f"{req.client_name} - {template['name']}"

    return {
        "subject": subject,
        "body": body,
        "template": template
    }
