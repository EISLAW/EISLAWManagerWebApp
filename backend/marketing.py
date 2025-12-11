"""
Marketing Content Generator Module
Handles content generation from transcripts for LinkedIn, newsletters, video scripts.
"""
import json
import uuid
import os
import httpx
from datetime import datetime
from pathlib import Path
from typing import Optional, List
from dataclasses import dataclass, asdict

# ─────────────────────────────────────────────────────────────
# Storage Helpers
# ─────────────────────────────────────────────────────────────

def get_marketing_dir() -> Path:
    """Get the marketing data directory (uses writable /app/data in Docker)."""
    # In Docker: /app/data/marketing (writable volume)
    # Locally: ./data/marketing (relative to project root)
    if os.path.exists("/app/data"):
        base = Path("/app/data/marketing")
    else:
        # Fallback for local development
        base = Path(__file__).resolve().parent.parent / "data" / "marketing"
    base.mkdir(parents=True, exist_ok=True)
    return base

def load_jobs() -> List[dict]:
    """Load all generation jobs."""
    jobs_file = get_marketing_dir() / "jobs.json"
    if not jobs_file.exists():
        return []
    try:
        jobs = json.loads(jobs_file.read_text("utf-8"))
        # Clean up jobs older than 30 days
        cutoff = datetime.utcnow().timestamp() - (30 * 24 * 60 * 60)
        cleaned = []
        for job in jobs:
            try:
                created = datetime.fromisoformat(job.get("created_at", "").replace("Z", "")).timestamp()
                if created > cutoff:
                    cleaned.append(job)
            except Exception:
                cleaned.append(job)  # Keep if can't parse date
        return cleaned
    except Exception:
        return []

# Input validation constants
MAX_CUSTOM_TEXT_LENGTH = 50000  # 50K characters max

def save_jobs(jobs: List[dict]):
    """Save generation jobs."""
    jobs_file = get_marketing_dir() / "jobs.json"
    jobs_file.write_text(json.dumps(jobs, ensure_ascii=False, indent=2), "utf-8")

def load_saved_content() -> List[dict]:
    """Load all saved content."""
    content_file = get_marketing_dir() / "content.json"
    if not content_file.exists():
        return []
    try:
        return json.loads(content_file.read_text("utf-8"))
    except Exception:
        return []

def save_content_list(content: List[dict]):
    """Save content list."""
    content_file = get_marketing_dir() / "content.json"
    content_file.write_text(json.dumps(content, ensure_ascii=False, indent=2), "utf-8")

# ─────────────────────────────────────────────────────────────
# Prompt Loading
# ─────────────────────────────────────────────────────────────

def load_prompt(name: str) -> str:
    """Load a prompt template from the prompts directory."""
    prompts_dir = Path(__file__).resolve().parent / "prompts" / "marketing"
    prompt_file = prompts_dir / f"{name}.md"
    if not prompt_file.exists():
        raise FileNotFoundError(f"Prompt not found: {name}")
    return prompt_file.read_text("utf-8")

def get_format_word_range(format_type: str) -> tuple:
    """Get word count range for format."""
    ranges = {
        "linkedin_short": (150, 250),
        "linkedin_medium": (250, 400),
        "linkedin_long": (400, 600),
    }
    return ranges.get(format_type, (250, 400))

# ─────────────────────────────────────────────────────────────
# AI Generation
# ─────────────────────────────────────────────────────────────

def call_gemini(prompt: str, system_prompt: str = "") -> str:
    """Call Gemini API with prompt."""
    key = os.environ.get("GEMINI_API_KEY")
    if not key:
        raise ValueError("GEMINI_API_KEY not configured")

    model = os.environ.get("GEMINI_MODEL", "gemini-2.0-flash")
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={key}"

    contents = []
    if system_prompt:
        contents.append({"role": "user", "parts": [{"text": system_prompt}]})
        contents.append({"role": "model", "parts": [{"text": "מבין. אני מוכן."}]})
    contents.append({"role": "user", "parts": [{"text": prompt}]})

    payload = {
        "contents": contents,
        "generationConfig": {
            "temperature": 0.8,
            "maxOutputTokens": 2048,
        }
    }

    with httpx.Client(timeout=120.0) as client:
        resp = client.post(url, json=payload)
        if resp.status_code != 200:
            # Don't expose raw API response - log it server-side
            print(f"Gemini API error: {resp.status_code} - {resp.text[:500]}")
            raise Exception("AI generation failed. Please try again.")
        data = resp.json()

    text = ""
    try:
        candidates = data.get("candidates", [])
        if candidates:
            parts = candidates[0].get("content", {}).get("parts", [])
            if parts:
                text = parts[0].get("text", "")
    except Exception:
        pass

    if not text:
        raise Exception("No response from Gemini")

    return text.strip()

def generate_hooks(source_text: str, topic_hint: str = "") -> List[dict]:
    """Generate hook options for the content."""
    try:
        hooks_prompt = load_prompt("hooks")
        style_guide = load_prompt("style_guide")
    except FileNotFoundError:
        # Return defaults if prompts not found
        return [
            {"hook_type": "insider_secret", "hook_text_hebrew": "אחרי שנים בתחום, למדתי משהו מפתיע...", "score": 7.0},
            {"hook_type": "contrast", "hook_text_hebrew": "כולם חושבים X, אבל התברר ההיפך.", "score": 6.5},
            {"hook_type": "story", "hook_text_hebrew": "השיחה הזו שינתה את הכל.", "score": 6.0},
        ]

    prompt = f"""
{hooks_prompt}

## Topic Hint
{topic_hint or "No specific topic"}

## Source Material
{source_text[:3000]}

## Task
Generate 3 hooks in Hebrew for this content. Return as JSON array:
[
  {{"hook_type": "...", "hook_text_hebrew": "...", "score": 8.5}},
  ...
]
Only return the JSON array, nothing else.
"""

    response = call_gemini(prompt, style_guide)

    # Parse JSON from response
    try:
        # Find JSON array in response
        start = response.find("[")
        end = response.rfind("]") + 1
        if start >= 0 and end > start:
            hooks = json.loads(response[start:end])
            return hooks
    except Exception:
        pass

    # Fallback: return default hooks
    return [
        {"hook_type": "insider_secret", "hook_text_hebrew": "אחרי שנים בתחום, למדתי משהו מפתיע...", "score": 7.0},
        {"hook_type": "contrast", "hook_text_hebrew": "כולם חושבים X, אבל התברר ההיפך.", "score": 6.5},
        {"hook_type": "story", "hook_text_hebrew": "השיחה הזו שינתה את הכל.", "score": 6.0},
    ]

def generate_content(
    source_text: str,
    format_type: str,
    selected_hook: str,
    topic_hint: str = ""
) -> tuple:
    """Generate marketing content. Returns (content, quality_status)."""
    try:
        linkedin_prompt = load_prompt("linkedin_post")
        style_guide = load_prompt("style_guide")
    except FileNotFoundError as e:
        raise Exception(f"Prompt files not configured: {e}")

    min_words, max_words = get_format_word_range(format_type)
    format_label = format_type.replace("_", " ").title()

    # Build the full prompt
    full_prompt = linkedin_prompt.replace("{{FORMAT}}", f"{format_label} ({min_words}-{max_words} words)")
    full_prompt = full_prompt.replace("{{HOOK}}", selected_hook)
    full_prompt = full_prompt.replace("{{SOURCE}}", source_text[:4000])

    # Add topic hint if provided
    if topic_hint:
        full_prompt += f"\n\n## Topic Focus\n{topic_hint}"

    # Generate content
    content = call_gemini(full_prompt, style_guide)

    # Check quality
    word_count = len(content.split())
    quality_status = "ready"

    if word_count < min_words * 0.7:
        quality_status = "needs_review"
    elif word_count > max_words * 1.3:
        quality_status = "needs_review"

    # Check for placeholder markers
    if "[" in content and "]" in content:
        quality_status = "needs_review"
    if "{{" in content:
        quality_status = "needs_review"

    return content, quality_status

# ─────────────────────────────────────────────────────────────
# Transcript Search
# ─────────────────────────────────────────────────────────────

def search_transcripts(query: str, limit: int = 5) -> List[dict]:
    """Search transcripts for relevant content."""
    index_file = Path(__file__).resolve().parent / "Transcripts" / "index.json"
    if not index_file.exists():
        return []

    try:
        items = json.loads(index_file.read_text("utf-8"))
    except Exception:
        return []

    results = []
    query_lower = query.lower()

    for item in items:
        # Skip personal transcripts
        if (item.get("domain") or "").lower() == "personal":
            continue

        # Skip non-ready items
        if item.get("status") != "ready":
            continue

        # Get transcript text
        transcript = item.get("transcript") or []
        text = " ".join(seg.get("text", "") for seg in transcript if isinstance(transcript, list))

        # Simple relevance scoring
        score = 0
        if query_lower in text.lower():
            score = 10
        else:
            # Check for word matches
            query_words = query_lower.split()
            for word in query_words:
                if len(word) > 2 and word in text.lower():
                    score += 2

        if score > 0:
            snippet = text[:500] + ("..." if len(text) > 500 else "")
            results.append({
                "id": item.get("id"),
                "title": item.get("fileName", "Untitled"),
                "client": item.get("client", ""),
                "date": item.get("date", ""),
                "snippet": snippet,
                "score": score,
                "full_text": text,
            })

    # Sort by score and return top results
    results.sort(key=lambda x: x["score"], reverse=True)
    return results[:limit]

def get_transcript_text(transcript_id: str) -> Optional[str]:
    """Get full text of a transcript by ID."""
    index_file = Path(__file__).resolve().parent / "Transcripts" / "index.json"
    if not index_file.exists():
        return None

    try:
        items = json.loads(index_file.read_text("utf-8"))
        for item in items:
            if item.get("id") == transcript_id:
                transcript = item.get("transcript") or []
                if isinstance(transcript, list):
                    return " ".join(seg.get("text", "") for seg in transcript)
                return str(transcript)
    except Exception:
        pass

    return None

def list_all_transcripts(exclude_personal: bool = True) -> List[dict]:
    """List all transcripts available for marketing content."""
    index_file = Path(__file__).resolve().parent / "Transcripts" / "index.json"
    if not index_file.exists():
        return []

    try:
        items = json.loads(index_file.read_text("utf-8"))
    except Exception:
        return []

    results = []
    for item in items:
        # Skip personal transcripts if requested
        if exclude_personal and (item.get("domain") or "").lower() == "personal":
            continue

        # Skip non-ready items
        if item.get("status") != "ready":
            continue

        results.append({
            "id": item.get("id"),
            "title": item.get("fileName", "Untitled"),
            "client": item.get("client", ""),
            "domain": item.get("domain", ""),
            "date": item.get("date", ""),
        })

    return results
