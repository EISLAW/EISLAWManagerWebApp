# ─────────────────────────────────────────────────────────────
# Marketing Prompts Manager Endpoints
# ─────────────────────────────────────────────────────────────
# NOTE: This file is exec'd in main.py context, so `app`, `json`, `Path`,
# `HTTPException`, `Request`, `os` are already in scope from main.py's globals.
# We don't need to re-import them.


def get_marketing_prompts_path():
    """Get path to marketing prompts config file."""
    paths = [
        Path("/app/backend/marketing_prompts.json"),
        Path("/app/data/marketing_prompts.json"),
        Path.home() / ".eislaw" / "config" / "marketing_prompts.json",
        Path(__file__).parent / "marketing_prompts.json"
    ]
    return next((p for p in paths if p.exists()), paths[0])

def load_marketing_prompts():
    """Load marketing prompts from config file."""
    path = get_marketing_prompts_path()
    if path.exists():
        return json.loads(path.read_text("utf-8"))
    # Return minimal default if file doesn't exist
    return {
        "version": "1.0.0",
        "categories": [
            {
                "id": "style_guides",
                "name": "מדריכי סגנון",
                "name_en": "Style Guides",
                "description": "הגדרות קול וסגנון כתיבה",
                "prompts": []
            },
            {
                "id": "content_formats",
                "name": "פורמטים",
                "name_en": "Content Formats",
                "description": "תבניות לסוגי תוכן שונים",
                "prompts": []
            },
            {
                "id": "hook_types",
                "name": "סוגי הוקים",
                "name_en": "Hook Types",
                "description": "תבניות לפתיחות שתופסות תשומת לב",
                "prompts": []
            }
        ]
    }


@app.get("/api/templates/marketing-prompts")
async def get_marketing_prompts():
    """Get all marketing prompts configuration."""
    return load_marketing_prompts()


@app.post("/api/templates/marketing-prompts")
async def save_marketing_prompts(request: Request):
    """Save marketing prompts configuration."""
    try:
        data = await request.json()
    except:
        raise HTTPException(status_code=400, detail="Invalid JSON")

    if "categories" not in data:
        raise HTTPException(status_code=400, detail="categories field is required")

    # Try writable locations in order
    writable_paths = [
        Path("/app/data/marketing_prompts.json"),
        Path("/app/backend/marketing_prompts.json"),
        Path.home() / ".eislaw" / "config" / "marketing_prompts.json"
    ]

    saved = False
    for path in writable_paths:
        try:
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text(json.dumps(data, ensure_ascii=False, indent=2), "utf-8")
            saved = True
            break
        except (OSError, PermissionError):
            continue

    if not saved:
        raise HTTPException(status_code=500, detail="Could not save prompts to any location")

    return {"success": True, "message": "Marketing prompts saved"}


@app.get("/api/templates/marketing-prompts/{category_id}")
async def get_marketing_prompts_category(category_id: str):
    """Get prompts from a specific category."""
    prompts = load_marketing_prompts()
    for cat in prompts.get("categories", []):
        if cat.get("id") == category_id:
            return cat
    raise HTTPException(status_code=404, detail="Category not found")


@app.get("/api/templates/marketing-prompts/{category_id}/{prompt_id}")
async def get_marketing_prompt(category_id: str, prompt_id: str):
    """Get a specific prompt by category and prompt ID."""
    prompts = load_marketing_prompts()
    for cat in prompts.get("categories", []):
        if cat.get("id") == category_id:
            for prompt in cat.get("prompts", []):
                if prompt.get("id") == prompt_id:
                    return prompt
    raise HTTPException(status_code=404, detail="Prompt not found")


# ─────────────────────────────────────────────────────────────
# AI Prompt Generator
# ─────────────────────────────────────────────────────────────

def get_gemini_key():
    """Get Gemini API key from environment or secrets."""
    key = os.environ.get("GEMINI_API_KEY")
    if key:
        return key
    # Try loading from secrets
    secrets_path = Path(__file__).resolve().parent.parent / "secrets.local.json"
    if secrets_path.exists():
        try:
            secrets = json.loads(secrets_path.read_text("utf-8"))
            return secrets.get("gemini", {}).get("api_key")
        except Exception:
            pass
    return None


@app.post("/api/templates/marketing-prompts/generate")
async def generate_prompt_with_ai(request: Request):
    """
    Generate a new prompt using AI with context from existing prompts.

    Request body:
    {
        "description": "User's natural language description of the prompt they want",
        "target_category": "optional category hint"
    }

    Returns:
    {
        "success": true,
        "generated_prompt": {
            "name": "Suggested name",
            "name_en": "English name",
            "description": "What this prompt does",
            "content": "The full prompt content"
        }
    }
    """
    import httpx

    try:
        data = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON")

    description = data.get("description", "").strip()
    if not description:
        raise HTTPException(status_code=400, detail="description is required")

    if len(description) > 2000:
        raise HTTPException(status_code=400, detail="description too long (max 2000 chars)")

    # Get Gemini API key
    api_key = get_gemini_key()
    if not api_key:
        raise HTTPException(status_code=500, detail="AI service not configured (GEMINI_API_KEY missing)")

    # Load all existing prompts for context
    existing_prompts = load_marketing_prompts()

    # Build context from existing prompts
    prompt_context_parts = []
    for cat in existing_prompts.get("categories", []):
        cat_name = cat.get("name", cat.get("id", "Unknown"))
        for prompt in cat.get("prompts", []):
            prompt_name = prompt.get("name", prompt.get("id", "Unnamed"))
            prompt_content = prompt.get("content", "")[:1000]  # Limit each prompt preview
            prompt_context_parts.append(f"### {prompt_name} (Category: {cat_name})\n{prompt_content}\n")

    prompt_context = "\n".join(prompt_context_parts) if prompt_context_parts else "No existing prompts yet."

    # Build the generation prompt
    system_prompt = """You are an expert prompt engineer for an Israeli law firm (EISLAW).
You create prompts for marketing content generation and AI assistants.

Key guidelines:
- Prompts should be professional but accessible
- Support Hebrew content creation
- Use clear structure with sections
- Include placeholders like {{SOURCE}}, {{TOPIC}}, {{FORMAT}} where appropriate
- Keep a consistent style with existing prompts
- Focus on legal/business content for LinkedIn, newsletters, etc.

The user will describe what kind of prompt they need. Generate a complete, production-ready prompt.
"""

    user_prompt = f"""Here are the existing prompts in the system for reference:

{prompt_context}

---

The user wants to create a new prompt with this description:
"{description}"

Generate a new prompt based on this request. Return your response in this exact JSON format:
{{
  "name": "שם הפרומפט בעברית",
  "name_en": "English Prompt Name",
  "description": "תיאור קצר מה הפרומפט עושה",
  "content": "The full prompt content here, can be multi-line..."
}}

Only return the JSON object, nothing else."""

    # Call Gemini API
    model = os.environ.get("GEMINI_MODEL", "gemini-2.0-flash")
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"

    payload = {
        "contents": [
            {"role": "user", "parts": [{"text": system_prompt}]},
            {"role": "model", "parts": [{"text": "מבין. אני מוכן ליצור פרומפטים."}]},
            {"role": "user", "parts": [{"text": user_prompt}]}
        ],
        "generationConfig": {
            "temperature": 0.7,
            "maxOutputTokens": 4096,
        }
    }

    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            resp = await client.post(url, json=payload)
            if resp.status_code != 200:
                print(f"Gemini API error: {resp.status_code} - {resp.text[:500]}")
                raise HTTPException(status_code=500, detail="AI generation failed. Please try again.")

            response_data = resp.json()

        # Extract text from response
        text = ""
        try:
            candidates = response_data.get("candidates", [])
            if candidates:
                parts = candidates[0].get("content", {}).get("parts", [])
                if parts:
                    text = parts[0].get("text", "")
        except Exception:
            pass

        if not text:
            raise HTTPException(status_code=500, detail="No response from AI")

        # Parse JSON from response
        # Find JSON object in response
        start = text.find("{")
        end = text.rfind("}") + 1
        if start < 0 or end <= start:
            raise HTTPException(status_code=500, detail="Could not parse AI response")

        generated = json.loads(text[start:end])

        # Validate required fields
        if not generated.get("name") or not generated.get("content"):
            raise HTTPException(status_code=500, detail="AI generated incomplete prompt")

        return {
            "success": True,
            "generated_prompt": {
                "name": generated.get("name", ""),
                "name_en": generated.get("name_en", ""),
                "description": generated.get("description", ""),
                "content": generated.get("content", "")
            }
        }

    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="AI request timed out. Please try again.")
    except json.JSONDecodeError:
        raise HTTPException(status_code=500, detail="Could not parse AI response as JSON")
    except HTTPException:
        raise
    except Exception as e:
        print(f"AI generation error: {e}")
        raise HTTPException(status_code=500, detail="AI generation failed")
