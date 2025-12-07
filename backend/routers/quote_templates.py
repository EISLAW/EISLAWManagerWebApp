"""
Quote Templates Router
CRUD API for managing quote templates.
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional
import sqlite3
import uuid
import json
import os
from datetime import datetime

router = APIRouter(prefix="/api/templates/quotes", tags=["quote-templates"])


# Database connection
def get_db_path():
    if os.path.exists("/app/data/eislaw.db"):
        return "/app/data/eislaw.db"
    return os.path.expanduser("~/.eislaw/store/eislaw.db")


def get_connection():
    return sqlite3.connect(get_db_path())


# Pydantic models
class QuoteTemplateCreate(BaseModel):
    name: str
    category: str = "general"
    content: str
    variables: List[str] = []


class QuoteTemplateUpdate(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    content: Optional[str] = None
    variables: Optional[List[str]] = None


class QuoteTemplateResponse(BaseModel):
    id: str
    name: str
    category: str
    content: str
    variables: List[str]
    created_at: str
    updated_at: str
    created_by: Optional[str]
    version: int


def row_to_template(row) -> dict:
    """Convert database row to template dict."""
    return {
        "id": row[0],
        "name": row[1],
        "category": row[2] or "general",
        "content": row[3],
        "variables": json.loads(row[4]) if row[4] else [],
        "created_at": row[5],
        "updated_at": row[6],
        "created_by": row[7],
        "version": row[8] or 1,
    }


@router.get("/", response_model=List[QuoteTemplateResponse])
async def list_templates(category: Optional[str] = None):
    """List all quote templates, optionally filtered by category."""
    conn = get_connection()
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    if category:
        cursor.execute(
            "SELECT * FROM quote_templates WHERE category = ? ORDER BY name",
            (category,)
        )
    else:
        cursor.execute("SELECT * FROM quote_templates ORDER BY category, name")

    rows = cursor.fetchall()
    conn.close()

    return [row_to_template(row) for row in rows]


@router.get("/{template_id}", response_model=QuoteTemplateResponse)
async def get_template(template_id: str):
    """Get a single quote template by ID."""
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM quote_templates WHERE id = ?", (template_id,))
    row = cursor.fetchone()
    conn.close()

    if not row:
        raise HTTPException(status_code=404, detail="Template not found")

    return row_to_template(row)


@router.post("/", response_model=QuoteTemplateResponse, status_code=201)
async def create_template(template: QuoteTemplateCreate):
    """Create a new quote template."""
    conn = get_connection()
    cursor = conn.cursor()

    template_id = str(uuid.uuid4())
    now = datetime.utcnow().isoformat() + "Z"
    variables_json = json.dumps(template.variables, ensure_ascii=False)

    cursor.execute(
        """
        INSERT INTO quote_templates (id, name, category, content, variables, created_at, updated_at, version)
        VALUES (?, ?, ?, ?, ?, ?, ?, 1)
        """,
        (template_id, template.name, template.category, template.content, variables_json, now, now)
    )
    conn.commit()

    # Fetch and return the created template
    cursor.execute("SELECT * FROM quote_templates WHERE id = ?", (template_id,))
    row = cursor.fetchone()
    conn.close()

    return row_to_template(row)


@router.put("/{template_id}", response_model=QuoteTemplateResponse)
async def update_template(template_id: str, template: QuoteTemplateUpdate):
    """Update an existing quote template."""
    conn = get_connection()
    cursor = conn.cursor()

    # Check if template exists
    cursor.execute("SELECT * FROM quote_templates WHERE id = ?", (template_id,))
    existing = cursor.fetchone()

    if not existing:
        conn.close()
        raise HTTPException(status_code=404, detail="Template not found")

    # Build update query dynamically
    updates = []
    values = []

    if template.name is not None:
        updates.append("name = ?")
        values.append(template.name)
    if template.category is not None:
        updates.append("category = ?")
        values.append(template.category)
    if template.content is not None:
        updates.append("content = ?")
        values.append(template.content)
    if template.variables is not None:
        updates.append("variables = ?")
        values.append(json.dumps(template.variables, ensure_ascii=False))

    if updates:
        updates.append("updated_at = ?")
        values.append(datetime.utcnow().isoformat() + "Z")
        updates.append("version = version + 1")

        values.append(template_id)

        cursor.execute(
            f"UPDATE quote_templates SET {', '.join(updates)} WHERE id = ?",
            values
        )
        conn.commit()

    # Fetch and return the updated template
    cursor.execute("SELECT * FROM quote_templates WHERE id = ?", (template_id,))
    row = cursor.fetchone()
    conn.close()

    return row_to_template(row)


@router.delete("/{template_id}")
async def delete_template(template_id: str):
    """Delete a quote template."""
    conn = get_connection()
    cursor = conn.cursor()

    # Check if template exists
    cursor.execute("SELECT id FROM quote_templates WHERE id = ?", (template_id,))
    if not cursor.fetchone():
        conn.close()
        raise HTTPException(status_code=404, detail="Template not found")

    cursor.execute("DELETE FROM quote_templates WHERE id = ?", (template_id,))
    conn.commit()
    conn.close()

    return {"status": "deleted", "id": template_id}


@router.get("/categories/list")
async def list_categories():
    """List all unique categories."""
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT DISTINCT category FROM quote_templates ORDER BY category")
    rows = cursor.fetchall()
    conn.close()

    return {"categories": [row[0] for row in rows if row[0]]}


@router.post("/{template_id}/render")
async def render_template(template_id: str, variables: dict):
    """Render a template with the provided variables."""
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM quote_templates WHERE id = ?", (template_id,))
    row = cursor.fetchone()
    conn.close()

    if not row:
        raise HTTPException(status_code=404, detail="Template not found")

    template = row_to_template(row)
    content = template["content"]

    # Replace variables in content
    for key, value in variables.items():
        content = content.replace("{{" + key + "}}", str(value))

    # Find any missing variables
    import re
    missing = re.findall(r"\{\{(\w+)\}\}", content)

    return {
        "rendered": content,
        "template_name": template["name"],
        "missing_variables": missing
    }
