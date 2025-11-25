from fastapi import FastAPI, Request, HTTPException
from fastapi import Body, Query, UploadFile, File, Form
from fastapi.responses import JSONResponse, Response
from fastapi.middleware.cors import CORSMiddleware
from prometheus_client import Counter, Histogram, generate_latest, CONTENT_TYPE_LATEST
from opencensus.ext.azure.log_exporter import AzureLogHandler
from opencensus.ext.azure.trace_exporter import AzureExporter
from opencensus.trace.samplers import ProbabilitySampler
from opencensus.trace.tracer import Tracer
from opencensus.trace.span import SpanKind
from pathlib import Path
import json
import os
import sqlite3
import sys
from typing import Any, Iterable, List, Optional, Tuple
import urllib.parse
import urllib.request
import ssl
import subprocess
import threading
import time
import uuid
import datetime
import hashlib
import secrets
import html
import re
from email import policy
from email.parser import BytesParser
from fastapi.responses import HTMLResponse, RedirectResponse

try:
    import requests  # Airtable HTTP
except Exception:
    requests = None

try:
    import msal  # for delegated (device code) flow
except Exception:
    msal = None

MEILI_URL = os.environ.get("MEILI_URL", "http://127.0.0.1:7700").rstrip("/")
MEILI_INDEX_EMAILS = os.environ.get("MEILI_INDEX_EMAILS", "emails")

APPINSIGHTS_CONN = os.environ.get("APPINSIGHTS_CONNECTION_STRING", "").strip()
def safe_eval(expr: str, ctx: dict) -> bool:
    return bool(eval(expr, {"__builtins__": {}}, ctx))


def coerce_inputs(d: dict) -> dict:
    out = {}
    for k, v in d.items():
        if isinstance(v, str):
            vl = v.strip().lower()
            if vl in {"true", "yes", "1"}:
                out[k] = True
                continue
            if vl in {"false", "no", "0", ""}:
                out[k] = False
                continue
            try:
                out[k] = int(v)
                continue
            except Exception:
                pass
        out[k] = v
    return out


def _bool_from_payload(value, default=True) -> bool:
    if value is None:
        return default
    if isinstance(value, str):
        val = value.strip().lower()
        if val in {"false", "0", "no", ""}:
            return False
        if val in {"true", "1", "yes"}:
            return True
    try:
        return bool(int(value))
    except Exception:
        return bool(value)


def evaluate(rules: dict, answers: dict) -> dict:
    # derive/normalize fields based on current questionnaire
    derived = dict(answers)
    try:
        sp = int(derived.get("sensitive_people", 0) or 0)
    except Exception:
        sp = 0
    if not derived.get("sensitive") and sp > 0:
        derived["sensitive"] = True
    # ensure ppl reflects at least the sensitive_people count (sensitive is a subset of personal data)
    try:
        ppl_val = int(derived.get("ppl", 0) or 0)
    except Exception:
        ppl_val = 0
    if sp > ppl_val:
        derived["ppl"] = sp
    # if biometric_100k is true, consider it sufficient for biometric threshold rules
    if derived.get("biometric_100k") and not derived.get("biometric_people"):
        # set to threshold value for compatibility with numeric-based checks
        derived["biometric_people"] = rules.get("thresholds", {}).get("biometric_high", 100000)

    # also derive sensitive from multi-select if provided
    stypes = derived.get("sensitive_types")
    if isinstance(stypes, (list, tuple, set)) and len(stypes) > 0:
        derived["sensitive"] = True

    # if biometric_100k then ensure minimum floors for counts
    if derived.get("biometric_100k"):
        thr = rules.get("thresholds", {})
        bio_thr = int(thr.get("biometric_high", 100000))
        # set floors (do not reduce if user provided higher numbers)
        if (derived.get("biometric_people") or 0) < bio_thr:
            derived["biometric_people"] = bio_thr
        if (derived.get("sensitive_people") or 0) < bio_thr:
            derived["sensitive_people"] = bio_thr
        if (derived.get("ppl") or 0) < bio_thr:
            derived["ppl"] = bio_thr

    ctx = dict(derived)
    ctx["thresholds"] = rules.get("thresholds", {})
    ctx.setdefault("True", True)
    ctx.setdefault("False", False)

    level = None
    level_min = None
    dpo = answers.get("dpo")
    reg = answers.get("reg")
    report = answers.get("report")

    for r in rules.get("rules", []):
        expr = r.get("when", "")
        try:
            ok = safe_eval(expr, ctx)
        except Exception:
            ok = False
        if not ok:
            continue
        st = r.get("set", {})
        if "level" in st:
            # apply precedence: choose the higher severity (earlier index)
            prec = rules.get("precedence", ["high", "mid", "basic", "lone"])
            new_level = st["level"]
            if level is None:
                level = new_level
            else:
                try:
                    if prec.index(new_level) < prec.index(level):
                        level = new_level
                except Exception:
                    level = new_level
        if "level_min" in st:
            level_min = st["level_min"]
        if "dpo" in st:
            dpo = st["dpo"]
        if "reg" in st:
            reg = st["reg"]
        if "report" in st:
            report = st["report"]

    # constraints
    ctx2 = dict(ctx)
    ctx2.update({"level": level, "level_min": level_min, "dpo": dpo, "reg": reg, "report": report})
    for c in rules.get("constraints", []):
        expr = c.get("if", "")
        try:
            ok = safe_eval(expr, ctx2)
        except Exception:
            ok = False
        if not ok:
            continue
        enf = c.get("enforce", {})
        if "level_min" in enf:
            prec = rules.get("precedence", ["high", "mid", "basic", "lone"])
            target = enf["level_min"]
            if level is None or prec.index(level) > prec.index(target):
                level = target
        if "dpo" in enf:
            dpo = enf["dpo"]

    if level is None:
        # Basic fallback check (mirrors JSON rule) to avoid accidental mid default
        ppl_mid = int(rules.get("thresholds", {}).get("ppl_mid", 10000))
        access_basic_max = int(rules.get("thresholds", {}).get("access_basic_max", 10))
        ethics_v = bool(derived.get("ethics"))
        owners_v = int(derived.get("owners") or 0)
        access_v = int(derived.get("access") or 0)
        transfer_v = bool(derived.get("transfer"))
        dmail_biz_v = bool(derived.get("directmail_biz"))
        ppl_v = int(derived.get("ppl") or 0)
        sensitive_v = bool(derived.get("sensitive"))
        lone_possible = (not ethics_v) and (owners_v <= 2) and (access_v <= 2) and (not dmail_biz_v) and (not transfer_v) and (ppl_v < ppl_mid)
        basic_cond = (not dmail_biz_v) and (not transfer_v) and (not lone_possible) and ((not sensitive_v) or (sensitive_v and access_v <= access_basic_max))
        if basic_cond:
            level = "basic"
    if level is None:
        level = level_min or "mid"
    else:
        # Enforce level_min against chosen level
        if level_min:
            prec = rules.get("precedence", ["high", "mid", "basic", "lone"])
            try:
                if prec.index(level) > prec.index(level_min):
                    level = level_min
            except Exception:
                pass

    # derive requirements from non-scoring questions
    requirements = []
    if bool(derived.get("employees_exposed")):
        requirements.append("worker_security_agreement")
    if bool(derived.get("cameras")):
        requirements.append("cameras_policy")
    if bool(derived.get("processor")):
        # Always include outsourcing text when outsourcing is present
        requirements.append("outsourcing_text")
        # Consultation call only when regular processor path (not sensitive/public org)
        if not bool(derived.get("processor_sensitive_org")):
            requirements.append("consultation_call")
    if bool(derived.get("processor_sensitive_org")):
        # Ensure outsourcing guidance; do NOT require consultation call in this path
        if "outsourcing_text" not in requirements:
            requirements.append("outsourcing_text")
    if bool(derived.get("processor_large_org")):
        # Large org outsourcing: High + DPO handled by rules; only outsourcing text is needed
        if "outsourcing_text" not in requirements:
            requirements.append("outsourcing_text")
    if bool(derived.get("directmail_biz")) or bool(derived.get("directmail_self")):
        requirements.append("direct_marketing_rules")

    # post-couplings
    # registration fallback (defensive)
    try:
        ppl_mid = int(rules.get("thresholds", {}).get("ppl_mid", 10000))
        if (bool(derived.get("transfer")) or bool(derived.get("directmail_biz"))) and int(derived.get("ppl") or 0) >= ppl_mid:
            reg = True
    except Exception:
        pass
    # - report implies dpo
    if report:
        dpo = True
    # - reg implies dpo
    if reg:
        dpo = True
    # - sensitive_people >= DPO threshold implies dpo
    try:
        if int(derived.get("sensitive_people") or 0) >= int(thr.get("sensitive_dpo", 1000)):
            dpo = True
    except Exception:
        pass
    # - monitoring implies dpo
    if bool(derived.get("monitor_1000")):
        dpo = True
    # - report safety: if not registered and biometric_100k or sensitive_people >= report threshold
    thr = rules.get("thresholds", {})
    if not reg:
        if bool(derived.get("biometric_100k")) or int(derived.get("sensitive_people") or 0) >= int(thr.get("sensitive_report", 100000)):
            report = True

    return {
        "level": level,
        "dpo": bool(dpo) if dpo is not None else False,
        "reg": bool(reg) if reg is not None else False,
        "report": bool(report) if report is not None else False,
        "requirements": requirements,
    }


def load_rules() -> dict:
    rules_path = Path(__file__).resolve().parents[1] / "config" / "security_scoring_rules.json"
    return json.loads(rules_path.read_text(encoding="utf-8"))


app = FastAPI(title="EISLAW Security Scoring Webhook")

# Dev CORS (for local frontend at Vite dev server)
_cors_env = os.environ.get("DEV_CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173").split(",")
if _cors_env:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[o.strip() for o in _cors_env if o.strip()],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

# Basic prometheus metrics
API_REQUESTS = Counter(
    "api_requests_total",
    "Total API requests",
    ["path", "method", "status"]
)
API_LATENCY = Histogram(
    "api_request_latency_seconds",
    "API request latency in seconds",
    ["path", "method"]
)


@app.middleware("http")
async def metrics_middleware(request: Request, call_next):
    path = request.url.path or ""
    method = request.method or "GET"
    tracer = None
    span = None
    if APPINSIGHTS_CONN:
        tracer = Tracer(exporter=AzureExporter(connection_string=APPINSIGHTS_CONN), sampler=ProbabilitySampler(0.1))
        span = tracer.start_span(name=path)
        span.span_kind = SpanKind.SERVER
    with API_LATENCY.labels(path=path, method=method).time():
        response = await call_next(request)
    try:
        API_REQUESTS.labels(path=path, method=method, status=str(response.status_code)).inc()
    except Exception:
        pass
    if tracer and span:
        try:
            tracer.end_span()
            tracer.finish()
        except Exception:
            pass
    return response


# ---------- Meilisearch helpers ----------


def _meili_enabled() -> bool:
    return bool(requests and MEILI_URL)


def _meili_upsert(docs: list[dict]) -> bool:
    if not _meili_enabled() or not docs:
        return False
    try:
        # Ensure index exists
        idx_url = f"{MEILI_URL}/indexes/{MEILI_INDEX_EMAILS}"
        _ = requests.post(f"{MEILI_URL}/indexes", json={"uid": MEILI_INDEX_EMAILS}, timeout=5)
        r = requests.post(f"{idx_url}/documents", json=docs, timeout=10)
        return r.ok
    except Exception:
        return False


def _meili_search(q: str, filters: list[str], limit: int, offset: int) -> dict:
    if not _meili_enabled():
        return {"items": [], "total": 0, "next_offset": None}
    try:
        idx_url = f"{MEILI_URL}/indexes/{MEILI_INDEX_EMAILS}/search"
        payload = {
            "q": q or "",
            "limit": limit,
            "offset": offset,
        }
        if filters:
            payload["filter"] = filters
        r = requests.post(idx_url, json=payload, timeout=8)
        if not r.ok:
            return {"items": [], "total": 0, "next_offset": None}
        j = r.json()
        hits = j.get("hits") or []
        total = j.get("estimatedTotalHits") or len(hits)
        next_offset = (offset + limit) if (offset + limit) < total else None
        items = []
        for h in hits:
            items.append({
                "id": h.get("id"),
                "received": h.get("received") or "",
                "subject": h.get("subject") or "",
                "from": h.get("from") or "",
                "to": h.get("to") or "",
                "cc": h.get("cc") or "",
                "preview": h.get("preview") or "",
                "json": h.get("json_path") or "",
                "eml": h.get("eml_path") or "",
                "has_attachments": bool(h.get("has_attachments")),
                "attachments_count": h.get("attachments_count") or 0,
                "client": h.get("client") or "",
            })
        return {"items": items, "total": total, "next_offset": next_offset}
    except Exception:
        return {"items": [], "total": 0, "next_offset": None}


def _meili_reindex_from_db():
    # Push all messages from SQLite into Meilisearch
    dbp = _email_index_path()
    if not dbp.exists() or not _meili_enabled():
        return {"ok": False, "reason": "index missing or meili disabled"}
    conn = sqlite3.connect(str(dbp))
    try:
        rows = conn.execute(
            "SELECT id, client, received, subject, from_addr, to_addrs, cc_addrs, body_preview, json_path, eml_path FROM messages"
        ).fetchall()
    finally:
        conn.close()
    docs = []
    for (mid, client, received, subject, from_addr, to_addrs, cc_addrs, body_preview, json_path, eml_path) in rows:
        meta_flags = _email_json_meta(json_path, eml_path)
        docs.append({
            "id": mid,
            "client": client or "",
            "received": received or "",
            "subject": subject or "",
            "from": from_addr or meta_flags.get("from_addr", ""),
            "to": to_addrs or "",
            "cc": cc_addrs or "",
            "preview": body_preview or "",
            "json_path": json_path or "",
            "eml_path": eml_path or "",
            "has_attachments": meta_flags.get("has_attachments", False),
            "attachments_count": meta_flags.get("attachments_count", 0),
        })
    ok = _meili_upsert(docs)
    return {"ok": ok, "count": len(docs)}


@app.post("/fillout/webhook")
async def fillout_webhook(req: Request):
    # Optional shared secret
    secret = os.environ.get("FILL0UT_SHARED_SECRET", "").strip()
    if secret:
        got = req.headers.get("X-Fillout-Secret", "").strip()
        if got != secret:
            raise HTTPException(status_code=401, detail="Unauthorized")
    try:
        payload = await req.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON")
    answers = coerce_inputs(payload or {})
    rules = load_rules()
    out = evaluate(rules, answers)
    return JSONResponse(out)


@app.get("/health")
async def health(details: bool = False):
    fe = None  # frontend version not known server-side
    be_version = os.environ.get("APP_VERSION") or os.environ.get("BE_VERSION") or "0.0.0"
    be_commit = os.environ.get("APP_COMMIT") or os.environ.get("COMMIT_SHA") or ""
    be_build_time = os.environ.get("APP_BUILD_TIME") or os.environ.get("BUILD_TIME") or ""
    base = {
        "status": "ok",
        "version": be_version,
        "commit": be_commit[:7] if be_commit else "",
        "buildTime": be_build_time,
    }
    if details:
        base.update({
            "dev_open_enabled": bool(os.environ.get("DEV_ENABLE_OPEN")),
            "cors": os.environ.get("DEV_CORS_ORIGINS") or "",
            "graph_delegated_ready": _graph_acquire_silent(),
        })
    return base


@app.get("/metrics")
async def metrics():
    content = generate_latest()
    return Response(content=content, media_type=CONTENT_TYPE_LATEST)

# Reindex existing emails into Meilisearch (manual trigger)
@app.post("/email/reindex_search")
async def email_reindex_search():
    if not _meili_enabled():
        raise HTTPException(status_code=503, detail="Meilisearch not configured or requests unavailable")
    result = _meili_reindex_from_db()
    if not result.get("ok"):
        raise HTTPException(status_code=500, detail=result)
    return {"ok": True, "count": result.get("count", 0)}


# ===== Privacy email send =====
@app.post("/privacy/send_email")
async def privacy_send_email(payload: dict = Body(default=None)):
    if not isinstance(payload, dict):
        raise HTTPException(status_code=400, detail="invalid body")
    score = payload.get("score") or {}
    selected = payload.get("selected_modules") or []
    ctx = {
        "contact_name": payload.get("contact_name"),
        "business_name": payload.get("business_name"),
        "report_url": payload.get("report_url") or "",
        "level_label": _level_label(score.get("level")),
        "score": {
            "level": score.get("level"),
            "dpo": bool(score.get("dpo")),
            "reg": bool(score.get("reg")),
            "report": bool(score.get("report")),
        },
        "selected_modules_list": ", ".join(selected),
    }
    rendered = _render_email_from_template(ctx)
    to_addr = payload.get("to") or payload.get("contact_email")
    if not to_addr:
        raise HTTPException(status_code=400, detail="recipient email required")
    creds = _graph_app_creds()
    if not creds:
        raise HTTPException(status_code=500, detail="Graph credentials not configured")
    _graph_send_mail(creds, to_addr, rendered.get("subject") or "", rendered.get("body") or "")
    return {"ok": True, "status": "sent"}


# ===== Insights (RAG) - API stubs per PRD =====

@app.post("/api/insights/add")
async def insights_add(payload: dict = Body(default=None)):
    """Add or update transcripts/metadata. Stub: echoes minimal receipt."""
    if not isinstance(payload, dict):
        raise HTTPException(status_code=400, detail="invalid body")
    uid = payload.get("id") or str(uuid.uuid4())
    return {"id": uid, "status": "queued", "received": True}


@app.post("/api/insights/review")
async def insights_review(payload: dict = Body(default=None)):
    """Quality control review stub (approve/flag)."""
    if not isinstance(payload, dict):
        raise HTTPException(status_code=400, detail="invalid body")
    action = (payload.get("action") or "").lower()
    if action not in {"approve", "flag"}:
        action = "flag"
    return {"ok": True, "action": action}


@app.get("/api/insights/search")
async def insights_search(q: str = "", client: Optional[str] = None, tags: Optional[str] = None, source: Optional[str] = None, top: int = 10):
    """Semantic search stub: returns empty insights with echo of filters."""
    return {
        "query": q,
        "filters": {"client": client, "tags": tags, "source": source},
        "items": [],
        "top": int(top),
    }


@app.post("/api/insights/ingest_manifest")
async def insights_ingest_manifest(payload: dict = Body(default=None)):
    """Accept a manifest {items:[{path, meta:{client,tags,source}}]} and put them into
    a review queue JSON in SharePoint (System/insights_registry.json) and mirror under build/.
    """
    if not isinstance(payload, dict):
        raise HTTPException(status_code=400, detail="invalid body")
    items = payload.get("items") or []
    for it in items:
        m = it.setdefault("meta", {})
        m.setdefault("status", "pending_review")
    doc = {"review_queue": items, "count": len(items)}
    # SP write
    _sp_write_json("System/insights_registry.json", doc)
    # local mirror
    try:
        outp = Path(__file__).resolve().parents[1] / "build" / "insights_registry.json"
        outp.parent.mkdir(parents=True, exist_ok=True)
        outp.write_text(json.dumps(doc, ensure_ascii=False, indent=2), encoding="utf-8")
    except Exception:
        pass
    return {"queued": len(items)}


# ===== Word Template integration (local-first) =====

def _templates_root_local() -> Optional[Path]:
    # Prefer explicit env override
    env = os.environ.get("TEMPLATES_ROOT")
    if env and Path(env).exists():
        return Path(env)
    # Derive from store_base(): <...>/לקוחות משרד  -> sibling 'לקוחות משרד_טמפלייטים'
    sb = _store_base()
    if sb:
        try:
            # Option A: alongside 'לקוחות משרד'
            cand_a = sb.parent / "לקוחות משרד_טמפלייטים"
            if cand_a.exists():
                return cand_a
            # Option B: inside 'לקוחות משרד/לקוחות משרד_טמפלייטים'
            cand_b = sb / "לקוחות משרד_טמפלייטים"
            if cand_b.exists():
                return cand_b
        except Exception:
            pass
    return None


def _list_local_templates() -> list[dict]:
    out: list[dict] = []
    root = _templates_root_local()
    if not root:
        return out
    try:
        for p in sorted(root.glob("**/*")):
            if p.is_file() and p.suffix.lower() in {".docx", ".dotx"}:
                out.append({"name": p.name, "path": str(p)})
    except Exception:
        pass
    return out


@app.get("/word/templates")
async def word_templates():
    """Return available templates (local-first)."""
    return {"templates": _list_local_templates()}


@app.get("/word/templates_root")
async def word_templates_root():
    p = _templates_root_local()
    return {"path": str(p) if p else ""}


def _sanitize_filename(name: str) -> str:
    import re
    name = re.sub(r"[\\/:*?\"<>|]", " ", name).strip()
    # collapse whitespace
    name = re.sub(r"\s+", " ", name)
    return name


def _resolve_client_folder(name: str) -> Optional[Path]:
    # Prefer registry folder
    reg = _registry_read()
    for c in reg.get("clients", []):
        nm = c.get("display_name") or c.get("name") or c.get("slug")
        if nm == name or (c.get("folder") and Path(c["folder"]).name == name):
            folder = c.get("folder")
            if folder:
                p = Path(folder)
                try:
                    p.mkdir(parents=True, exist_ok=True)
                except Exception:
                    pass
                return p
    # Fallback to <store_base>/<name>
    sb = _store_base()
    if sb:
        p = sb / name
        try:
            p.mkdir(parents=True, exist_ok=True)
        except Exception:
            pass
        return p
    return None


@app.post("/word/generate")
async def word_generate(payload: dict = Body(default=None)):
    """Generate a DOCX from a DOTX/DOCX template into the client's folder.
    Windows: uses Word COM (preferred). Others: python-docx for DOCX only.
    Body: { client_name: str, template_path: str }
    """
    if not isinstance(payload, dict):
        raise HTTPException(status_code=400, detail="invalid body")
    client_name = (payload.get("client_name") or "").strip()
    tpl_path = (payload.get("template_path") or "").strip()
    if not client_name or not tpl_path:
        raise HTTPException(status_code=400, detail="client_name and template_path required")
    src = Path(tpl_path)
    if not src.exists():
        raise HTTPException(status_code=404, detail="template not found")
    # Build output name: replace template tokens with client name
    name = src.stem
    for token in ["template", "Template", "TEMPLATE", "טמפלייט", "טמפלייטים"]:
        name = name.replace(token, client_name)
    out_name = _sanitize_filename(name) + ".docx"
    dest_dir = _resolve_client_folder(client_name)
    if not dest_dir:
        raise HTTPException(status_code=500, detail="client folder not resolved")
    out_path = dest_dir / out_name
    # Platform-specific generation
    try:
        import platform
        system = platform.system().lower()
        if system == "windows":
            try:
                import win32com.client  # type: ignore
                word = win32com.client.Dispatch('Word.Application')
                word.Visible = False
                if src.suffix.lower() == '.dotx':
                    doc = word.Documents.Add(Template=str(src))
                else:
                    doc = word.Documents.Open(str(src))
                wdFormatXMLDocument = 12
                doc.SaveAs2(str(out_path), FileFormat=wdFormatXMLDocument)
                doc.Close(False)
                try:
                    word.Quit()
                except Exception:
                    pass
            except Exception as e:
                # Fallback to python-docx for DOCX templates
                if src.suffix.lower() == ".docx":
                    try:
                        from docx import Document  # type: ignore
                        docx = Document(str(src))
                        docx.save(str(out_path))
                    except Exception as e2:
                        raise HTTPException(status_code=500, detail=f"Word COM/python-docx failed: {e2}")
                else:
                    # As a last resort for .dotx when COM is unavailable, copy bytes to .docx
                    try:
                        out_path.write_bytes(src.read_bytes())
                    except Exception:
                        raise HTTPException(status_code=500, detail=str(e))
        else:
            # Fallback: python-docx supports DOCX only
            if src.suffix.lower() != ".docx":
                raise HTTPException(status_code=500, detail="Non-Windows requires .docx template")
            try:
                from docx import Document  # type: ignore
            except Exception as e:
                raise HTTPException(status_code=500, detail=f"python-docx required: {e}")
            docx = Document(str(src))
            docx.save(str(out_path))
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    # Optional cloud upload for parity: when not in local dev, upload to SharePoint and return webUrl
    web_url = None
    try:
        if not os.environ.get("DEV_ENABLE_OPEN"):
            creds = _graph_app_creds()
            tok = _graph_token(creds) if creds else None
            if tok:
                drive_id, base = _graph_sharepoint_get_drive_and_base(creds)
                if drive_id:
                    rel_base = base or os.environ.get("SP_DOC_BASE") or "לקוחות משרד"
                    # Build relative path under drive
                    rel_path = f"{rel_base}/{client_name}/{out_name}"
                    url = f"{creds['endpoint'].rstrip('/')}/drives/{drive_id}/root:/{urllib.parse.quote(rel_path, safe='') }:/content"
                    up = _http_put_bytes(url, out_path.read_bytes(), {"Authorization": f"Bearer {tok}"})
                    web_url = (up.get("webUrl") or up.get("parentReference", {}).get("sharepointIds", {}).get("listUrl")) or None
    except Exception:
        web_url = None
    resp = {"ok": True, "path": str(out_path)}
    if web_url:
        resp["webUrl"] = web_url
    return resp


@app.get("/api/clients")
async def list_clients():
    # Load clients from SharePoint registry if available; fallback to local mirror
    try:
        reg = _registry_read()
    except Exception:
        reg = _load_clients_registry()
    out = []
    for c in reg.get("clients", []) if reg else []:
        name = c.get("display_name") or c.get("name") or c.get("slug") or "client"
        emails = c.get("email")
        if isinstance(emails, str):
            emails = [emails]
        out.append({
            "id": c.get("id") or name,
            "name": name,
            "emails": emails or [],
            "sfu": {"phase": "unknown"},
        })
    return out


def _settings_path() -> Optional[Path]:
    p = Path(__file__).resolve().parents[2] / "AudoProcessor Iterations" / "settings.json"
    return p if p.exists() else None


def _store_base() -> Optional[Path]:
    sp = _settings_path()
    if not sp:
        return None
    try:
        st = json.loads(sp.read_text(encoding="utf-8"))
        sb = (
            (st.get("by_os", {}).get("windows", {}).get("store_base"))
            or st.get("store_base")
        )
        return Path(sb) if sb else None
    except Exception:
        return None


def _load_clients_registry() -> Optional[dict]:
    sb = _store_base()
    if not sb:
        return None
    rp = sb / "clients.json"
    if not rp.exists():
        return None
    try:
        return json.loads(rp.read_text(encoding="utf-8"))
    except Exception:
        return None


def _email_index_path() -> Path:
    # Local index built by tools/email_catalog.py
    return Path(__file__).resolve().parents[1] / "clients" / "email_index.sqlite"


def _db_get_message_by_id(message_id: str) -> Optional[dict]:
    dbp = _email_index_path()
    if not dbp.exists():
        return None
    conn = sqlite3.connect(str(dbp))
    try:
        row = conn.execute(
            "SELECT id, client, received, subject, from_addr, to_addrs, cc_addrs, json_path, eml_path, outlook_link "
            "FROM messages WHERE id = ?",
            (message_id,),
        ).fetchone()
        if not row:
            return None
        keys = [
            "id",
            "client",
            "received",
            "subject",
            "from",
            "to",
            "cc",
            "json",
            "eml",
            "outlook_link",
        ]
        return {keys[i]: row[i] for i in range(len(keys))}
    finally:
        conn.close()


def _db_update_message_paths(
    message_id: str,
    eml_path: Optional[str] = None,
    json_path: Optional[str] = None,
    outlook_link: Optional[str] = None,
) -> None:
    dbp = _email_index_path()
    if not dbp.exists():
        return
    conn = sqlite3.connect(str(dbp))
    try:
        updates = []
        params: List[object] = []
        if eml_path is not None:
            updates.append("eml_path = ?")
            params.append(eml_path)
        if json_path is not None:
            updates.append("json_path = ?")
            params.append(json_path)
        if outlook_link is not None:
            updates.append("outlook_link = ?")
            params.append(outlook_link)
        if updates:
            params.append(message_id)
            conn.execute(f"UPDATE messages SET {', '.join(updates)} WHERE id = ?", params)
            conn.commit()
    finally:
        conn.close()


def _query_client_emails(client_name: str, limit: int = 50) -> List[dict]:
    dbp = _email_index_path()
    if not dbp.exists():
        return []
    conn = sqlite3.connect(str(dbp))
    try:
        q = (
            "SELECT id, thread_id, client, client_path, received, subject, from_addr, to_addrs, cc_addrs, json_path, eml_path, outlook_link "
            "FROM messages WHERE client = ? ORDER BY received DESC LIMIT ?"
        )
        rows = conn.execute(q, (client_name, limit)).fetchall()
        cols = [d[0] for d in conn.execute("PRAGMA table_info(messages)").fetchall()]
        # Fallback if PRAGMA not helpful
        keys = [
            "id","thread_id","client","client_path","received","subject","from_addr","to_addrs","cc_addrs","json_path","eml_path","outlook_link"
        ]
        out = []
        for r in rows:
            obj = {k: r[i] for i, k in enumerate(keys)}
            out.append(obj)
        return out
    finally:
        conn.close()


# ===== Email index API (Phase 1 scaffold) =====

def _db_list_messages_by_client(name: str, limit: int = 50, offset: int = 0) -> Tuple[List[dict], int]:
    dbp = _email_index_path()
    if not dbp.exists():
        return [], 0
    conn = sqlite3.connect(str(dbp))
    try:
        try:
            total = conn.execute("SELECT COUNT(1) FROM messages WHERE client = ?", (name,)).fetchone()[0]
        except sqlite3.OperationalError:
            return [], 0
        # adapt to legacy schemas without body_preview
        cols = [r[1] for r in conn.execute("PRAGMA table_info(messages)").fetchall()]  # r[1] is column name
        has_preview = 'body_preview' in cols
        if has_preview:
            q = (
                "SELECT id, received, subject, from_addr, to_addrs, cc_addrs, body_preview, json_path, eml_path "
                "FROM messages WHERE client = ? ORDER BY received DESC LIMIT ? OFFSET ?"
            )
            rows = conn.execute(q, (name, int(limit), int(offset))).fetchall()
            items = []
            for (mid, received, subject, from_addr, to_addrs, cc_addrs, body_preview, json_path, eml_path) in rows:
                meta_flags = _email_json_meta(json_path, eml_path)
                items.append({
                    "id": mid,
                    "received": received,
                    "subject": subject or "",
                    "from": from_addr or "",
                    "to": to_addrs or "",
                    "cc": cc_addrs or "",
                    "preview": body_preview or "",
                    "json": json_path or "",
                    "eml": eml_path or "",
                    "has_attachments": meta_flags.get("has_attachments", False),
                    "attachments_count": meta_flags.get("attachments_count", 0),
                })
        else:
            q = (
                "SELECT id, received, subject, from_addr, to_addrs, cc_addrs, json_path, eml_path "
                "FROM messages WHERE client = ? ORDER BY received DESC LIMIT ? OFFSET ?"
            )
            rows = conn.execute(q, (name, int(limit), int(offset))).fetchall()
            items = []
            for (mid, received, subject, from_addr, to_addrs, cc_addrs, json_path, eml_path) in rows:
                meta_flags = _email_json_meta(json_path, eml_path)
                items.append({
                    "id": mid,
                    "received": received,
                    "subject": subject or "",
                    "from": from_addr or "",
                    "to": to_addrs or "",
                    "cc": cc_addrs or "",
                    "preview": "",
                    "json": json_path or "",
                    "eml": eml_path or "",
                    "has_attachments": meta_flags.get("has_attachments", False),
                    "attachments_count": meta_flags.get("attachments_count", 0),
                })
        return items, int(total)
    finally:
        conn.close()


def _registry_entry_for(name: Optional[str]) -> Optional[dict]:
    if not name:
        return None
    candidates = [name]
    try:
        trimmed = name.strip()
        if trimmed and trimmed not in candidates:
            candidates.append(trimmed)
    except Exception:
        pass
    registries = [_registry_read(), _load_clients_registry()]
    for reg in registries:
        if not reg:
            continue
        for entry in reg.get("clients", []):
            display = entry.get("display_name") or entry.get("name") or entry.get("slug")
            folder = entry.get("folder")
            folder_name = Path(folder).name if folder else None
            if display in candidates or folder_name in candidates:
                return entry
    return None


def _safe_segment(text: Optional[str]) -> str:
    import re
    if not text:
        return "Unassigned"
    cleaned = re.sub(r"[<>:\"/\\|?*]+", "_", text.strip())
    cleaned = cleaned.strip() or "client"
    return cleaned


def _email_archive_dir(client_name: Optional[str]) -> Path:
    entry = _registry_entry_for(client_name)
    folder = (entry or {}).get("folder")
    candidates: List[Path] = []
    if folder:
        candidates.append(Path(folder))
    sb = _store_base()
    if sb and client_name:
        candidates.append(Path(sb) / client_name)
    fallback = Path(__file__).resolve().parents[1] / "clients" / "Unassigned" / _safe_segment(client_name)
    candidates.append(fallback)
    for base in candidates:
        try:
            base.mkdir(parents=True, exist_ok=True)
            archive = base / "Emails Indexed"
            archive.mkdir(parents=True, exist_ok=True)
            return archive
        except Exception:
            continue
    fallback.mkdir(parents=True, exist_ok=True)
    archive = fallback / "Emails Indexed"
    archive.mkdir(parents=True, exist_ok=True)
    return archive


def _entry_emails(entry: Optional[dict]) -> List[str]:
    emails: List[str] = []
    if not entry:
        return emails
    raw = entry.get("email")
    if isinstance(raw, list):
        emails.extend([e for e in raw if e])
    elif isinstance(raw, str) and raw:
        emails.append(raw)
    for contact in entry.get("contacts") or []:
        em = contact.get("email")
        if em:
            emails.append(em)
    # Deduplicate while preserving order
    seen = set()
    unique: List[str] = []
    for e in emails:
        low = e.strip().lower()
        if not low or low in seen:
            continue
        seen.add(low)
        unique.append(e.strip())
    return unique


@app.get("/email/by_client")
async def email_by_client(name: str, limit: int = 50, offset: int = 0):
    try:
        limit = max(1, min(int(limit), 100))
        offset = max(0, int(offset))
    except Exception:
        raise HTTPException(status_code=400, detail={"error": {"code": "bad_request", "message": "invalid limit/offset"}})
    items, total = _db_list_messages_by_client(name, limit=limit, offset=offset)
    mode = "client"
    if total == 0:
        # Fallback: link by participant emails from registry (canonical ID)
        emails = []
        try:
            reg = _registry_read() or {}
            for c in reg.get("clients", []):
                nm = c.get("display_name") or c.get("name") or c.get("slug")
                if nm == name or (c.get("folder") and Path(c["folder"]).name == name):
                    es = c.get("email")
                    if isinstance(es, str):
                        es = [es]
                    emails.extend([e for e in (es or []) if e])
                    for ct in c.get("contacts", []) or []:
                        e = (ct or {}).get("email")
                        if e:
                            emails.extend([e])
                    break
        except Exception:
            emails = []
        # Dedup
        seen = set(); dedup = []
        for e in emails:
            el = e.lower()
            if el not in seen:
                seen.add(el); dedup.append(e)
        if dedup:
            # Query by addresses across from/to/cc
            dbp = _email_index_path()
            if dbp.exists():
                conn = sqlite3.connect(str(dbp))
                try:
                    ors = []
                    params = []
                    for e in dedup:
                        ors.append("from_addr = ?"); params.append(e)
                    for e in dedup:
                        ors.append("to_addrs LIKE ?"); params.append(f"%{e}%")
                    for e in dedup:
                        ors.append("cc_addrs LIKE ?"); params.append(f"%{e}%")
                    wh = " WHERE (" + " OR ".join(ors) + ")"
                    total = conn.execute(f"SELECT COUNT(1) FROM messages{wh}", params).fetchone()[0]
                    q = f"SELECT id, received, subject, from_addr, to_addrs, cc_addrs, body_preview, json_path, eml_path FROM messages{wh} ORDER BY received DESC LIMIT ? OFFSET ?"
                    rows = conn.execute(q, (*params, int(limit), int(offset))).fetchall()
                    items = []
                    for (mid, received, subject, from_addr, to_addrs, cc_addrs, body_preview, json_path, eml_path) in rows:
                        meta_flags = _email_json_meta(json_path, eml_path)
                        items.append({
                            "id": mid,
                            "received": received,
                            "subject": subject or "",
                            "from": from_addr or "",
                            "to": to_addrs or "",
                            "cc": cc_addrs or "",
                            "preview": body_preview or "",
                            "json": json_path or "",
                            "eml": eml_path or "",
                            "has_attachments": meta_flags.get("has_attachments", False),
                            "attachments_count": meta_flags.get("attachments_count", 0),
                        })
                    mode = "email"
                finally:
                    conn.close()
    return {"items": items, "total": total, "mode": mode, "next_offset": (offset + limit) if (offset + limit) < total else None}


def _ensure_email_file(message_id: str, client_name: Optional[str]) -> Optional[Path]:
    record = _db_get_message_by_id(message_id)
    existing = None
    if record:
        existing = record.get("eml") or record.get("eml_path")
    if existing:
        path = Path(existing)
        if path.exists():
            return path
    target_client = client_name or (record or {}).get("client")
    archive_dir = _email_archive_dir(target_client)
    dest = archive_dir / f"{message_id}.eml"
    if dest.exists():
        return dest
    creds = _graph_app_creds()
    if not creds:
        return None
    raw = _graph_download_message_raw(creds, message_id)
    if not raw:
        return None
    try:
        dest.write_bytes(raw)
        if record:
            _db_update_message_paths(message_id, eml_path=str(dest))
        return dest
    except Exception:
        return None


def _sanitize_email_html(content: str) -> str:
    if not content:
        return "<p>(empty)</p>"
    cleaned = re.sub(r"<script.*?>.*?</script>", "", content, flags=re.IGNORECASE | re.DOTALL)
    cleaned = re.sub(r"<style.*?>.*?</style>", "", cleaned, flags=re.IGNORECASE | re.DOTALL)
    cleaned = re.sub(r"on\w+\s*=\s*\".*?\"", "", cleaned, flags=re.IGNORECASE | re.DOTALL)
    cleaned = re.sub(r"on\w+\s*=\s*\'.*?\'", "", cleaned, flags=re.IGNORECASE | re.DOTALL)
    return cleaned


def _email_render_content(message_id: str, client_name: Optional[str]) -> Optional[dict]:
    path = _ensure_email_file(message_id, client_name)
    if not path:
        return None
    try:
        with path.open("rb") as fh:
            msg = BytesParser(policy=policy.default).parse(fh)
        body = msg.get_body(preferencelist=("html", "plain"))
        html_body = None
        if body:
            if body.get_content_type() == "text/html":
                html_body = body.get_content()
            else:
                text = body.get_content()
                html_body = "<pre>{}</pre>".format(html.escape(text or ""))
        if not html_body:
            html_body = "<p>(No body available)</p>"
        html_body = _sanitize_email_html(html_body)
        return {
            "subject": msg.get("subject") or "",
            "from": msg.get("from") or "",
            "to": msg.get("to") or "",
            "received": msg.get("date") or "",
            "html": html_body,
        }
    except Exception:
        return None


def _load_email_json(json_path: Optional[str]) -> Optional[dict]:
    if not json_path:
        return None
    try:
        path = Path(json_path)
        if not path.exists():
            return None
        raw = path.read_text(encoding="utf-8", errors="ignore")
        if not raw:
            return None
        return json.loads(raw)
    except Exception:
        return None


def _email_json_meta(json_path: Optional[str], eml_path: Optional[str] = None) -> dict:
    data = _load_email_json(json_path)
    attachments = data.get("attachments") if isinstance(data, dict) else None
    has_att = False
    att_count = 0
    sender = ""
    if isinstance(data, dict):
        has_att = bool(data.get("hasAttachments")) or (isinstance(attachments, list) and len(attachments) > 0)
        if isinstance(attachments, list):
            att_count = len(attachments)
        from_addr = ((data.get("from") or {}).get("emailAddress") or {}).get("address")
        if from_addr:
            sender = from_addr
    # Fallback: parse EML to detect attachments when metadata is absent
    if not has_att and eml_path:
        try:
            from email import policy
            from email.parser import BytesParser
            p = Path(eml_path)
            if p.exists():
                msg = BytesParser(policy=policy.default).parse(p.open("rb"))
                attach_cnt = 0
                for part in msg.walk():
                    disp = part.get_content_disposition()
                    filename = part.get_filename()
                    if disp in ("attachment", "inline") and filename:
                        attach_cnt += 1
                if attach_cnt > 0:
                    has_att = True
                    att_count = attach_cnt
                if not sender:
                    sender = msg.get("from") or sender
        except Exception:
            pass
    return {
        "has_attachments": has_att,
        "attachments_count": att_count,
        "from_addr": sender,
    }


def _email_viewer_path(message_id: str, client_name: Optional[str]) -> str:
    params = {"id": message_id}
    if client_name:
        params["client"] = client_name
    return "/email/viewer?" + urllib.parse.urlencode(params)


def _absolute_url(request: Optional[Request], path: str) -> str:
    if not path:
        return ""
    if path.startswith(("http://", "https://")):
        return path
    base = ""
    if request is not None:
        try:
            base = str(request.base_url).rstrip("/")
        except Exception:
            base = ""
    if base:
        if not path.startswith("/"):
            path = "/" + path
        return base + path
    return path


def _render_email_view_page(info: dict) -> str:
    subject = html.escape(info.get("subject") or "")
    sender = html.escape(info.get("from") or "")
    to_line = html.escape(info.get("to") or "")
    received = html.escape(info.get("received") or "")
    client = html.escape(info.get("client") or "")
    body = info.get("html") or "<p>(No body available)</p>"
    outlook_link = info.get("outlook_link") or ""
    viewer_header = f"{subject or '(no subject)'}"
    actions = []
    if outlook_link:
        safe_link = html.escape(outlook_link, quote=True)
        actions.append(f'<a href="{safe_link}" target="_blank" rel="noreferrer noopener">Open in Outlook</a>')
    download_info = html.escape(info.get("eml_path") or "", quote=True)
    if download_info:
        actions.append(f'<span class="file-path" title="{download_info}">Saved at: {download_info}</span>')
    actions_html = ""
    if actions:
        actions_html = '<div class="actions">' + " · ".join(actions) + "</div>"
    meta_lines = []
    if sender:
        meta_lines.append(f"<div><strong>From:</strong> {sender}</div>")
    if to_line:
        meta_lines.append(f"<div><strong>To:</strong> {to_line}</div>")
    if received:
        meta_lines.append(f"<div><strong>Received:</strong> {received}</div>")
    if client:
        meta_lines.append(f"<div><strong>Client:</strong> {client}</div>")
    meta_html = "".join(meta_lines) or "<div class=\"muted\">No metadata available</div>"
    return f"""<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Email · {viewer_header}</title>
    <style>
      body {{
        font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        background: #f5f6f8;
        color: #0b2137;
        margin: 0;
        padding: 24px;
      }}
      .card {{
        max-width: 960px;
        margin: 0 auto;
        background: #ffffff;
        border-radius: 16px;
        box-shadow: 0 10px 40px rgba(15, 23, 42, 0.12);
        overflow: hidden;
        border: 1px solid #e2e8f0;
      }}
      header {{
        background: linear-gradient(135deg, #0B3B5A, #0f6d84);
        color: #fff;
        padding: 24px 32px;
      }}
      header h1 {{
        font-size: 20px;
        margin: 0 0 8px 0;
      }}
      header p {{
        margin: 0;
        opacity: 0.85;
      }}
      .meta {{
        padding: 24px 32px 8px 32px;
        font-size: 14px;
        color: #1f2937;
        background: #f8fafc;
      }}
      .actions {{
        margin-top: 12px;
        font-size: 14px;
      }}
      .actions a {{
        color: #0B3B5A;
        text-decoration: none;
        font-weight: 600;
      }}
      .actions a:hover {{
        text-decoration: underline;
      }}
      .body {{
        padding: 32px;
        background: #fff;
      }}
      iframe, .body-content {{
        width: 100%;
        min-height: 60vh;
        border: none;
      }}
      .muted {{
        color: #94a3b8;
      }}
      .body :where(p, div, td, li) {{
        font-size: 15px;
        line-height: 1.6;
      }}
    </style>
  </head>
  <body>
    <div class="card">
      <header>
        <h1>{viewer_header}</h1>
        <p>Indexed email viewer · secure snapshot</p>
      </header>
      <section class="meta">
        {meta_html}
        {actions_html}
      </section>
      <section class="body">
        <div class="body-content">{body}</div>
      </section>
    </div>
  </body>
</html>"""


def _launch_outlook_app(url: str) -> bool:
    if not url:
        return False
    if not (os.environ.get("DEV_DESKTOP_ENABLE") or os.environ.get("DEV_ENABLE_OPEN")):
        return False
    cmds = [
        ["msedge", f"--app={url}", "--start-minimized"],
        [str(Path(os.environ.get("ProgramFiles(x86)", r"C:\\Program Files (x86)")) / "Microsoft" / "Edge" / "Application" / "msedge.exe"), f"--app={url}", "--start-minimized"],
    ]
    for cmd in cmds:
        try:
            subprocess.Popen(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            return True
        except Exception:
            continue
    try:
        os.startfile(url)  # type: ignore[attr-defined]
        return True
    except Exception:
        return False


@app.get("/email/search")
async def email_search(q: Optional[str] = None, mailbox: Optional[str] = None, limit: int = 50, offset: int = 0):
    dbp = _email_index_path()
    if not dbp.exists():
        return {"items": [], "total": 0, "next_offset": None}
    try:
        limit = max(1, min(int(limit), 100))
        offset = max(0, int(offset))
    except Exception:
        raise HTTPException(status_code=400, detail={"error": {"code": "bad_request", "message": "invalid limit/offset"}})
    # Try Meilisearch first if available
    if _meili_enabled():
        filters = []
        res = _meili_search(q or "", filters, limit, offset)
        # If Meili returns any items, use it; otherwise fall back to SQLite
        if (res.get("items") or []) or res.get("total", 0) > 0:
            return res

    conn = sqlite3.connect(str(dbp))
    try:
        # Basic LIKE search on subject/from/to fields for MVP (FTS later)
        qs = (q or "").strip()
        where = []
        params: List[object] = []
        if qs:
            like = f"%{qs}%"
            where.append("(subject LIKE ? OR from_addr LIKE ? OR to_addrs LIKE ? OR cc_addrs LIKE ?)")
            params.extend([like, like, like, like])
        if mailbox:
            where.append("(user_upn = ?)")
            params.append(mailbox)
        wh = (" WHERE " + " AND ".join(where)) if where else ""
        try:
            total = conn.execute(f"SELECT COUNT(1) FROM messages{wh}", params).fetchone()[0]
        except sqlite3.OperationalError:
            return {"items": [], "total": 0, "next_offset": None}
        cols = [r[1] for r in conn.execute("PRAGMA table_info(messages)").fetchall()]
        has_preview = 'body_preview' in cols
        if has_preview:
            qsql = (
                f"SELECT id, received, subject, from_addr, to_addrs, cc_addrs, body_preview, json_path, eml_path, outlook_link FROM messages{wh} "
                "ORDER BY received DESC LIMIT ? OFFSET ?"
            )
            rows = conn.execute(qsql, (*params, int(limit), int(offset))).fetchall()
            items = []
            for (mid, received, subject, from_addr, to_addrs, cc_addrs, body_preview, json_path, eml_path, outlook_link) in rows:
                meta_flags = _email_json_meta(json_path, eml_path)
                if not from_addr:
                    from_addr = meta_flags.get("from_addr", "")
                items.append({
                    "id": mid,
                    "received": received,
                    "subject": subject or "",
                    "from": from_addr or meta_flags.get("from_addr", "") or "",
                    "to": to_addrs or "",
                    "cc": cc_addrs or "",
                    "preview": body_preview or "",
                    "json": json_path or "",
                    "eml": eml_path or "",
                    "outlook_link": outlook_link or "",
                    "has_attachments": meta_flags.get("has_attachments", False),
                    "attachments_count": meta_flags.get("attachments_count", 0),
                })
        else:
            qsql = (
                f"SELECT id, received, subject, from_addr, to_addrs, cc_addrs, json_path, eml_path, outlook_link FROM messages{wh} "
                "ORDER BY received DESC LIMIT ? OFFSET ?"
            )
            rows = conn.execute(qsql, (*params, int(limit), int(offset))).fetchall()
            items = []
            for (mid, received, subject, from_addr, to_addrs, cc_addrs, json_path, eml_path, outlook_link) in rows:
                meta_flags = _email_json_meta(json_path, eml_path)
                items.append({
                    "id": mid,
                    "received": received,
                    "subject": subject or "",
                    "from": from_addr or meta_flags.get("from_addr", "") or "",
                    "to": to_addrs or "",
                    "cc": cc_addrs or "",
                    "preview": "",
                    "json": json_path or "",
                    "eml": eml_path or "",
                    "outlook_link": outlook_link or "",
                    "has_attachments": meta_flags.get("has_attachments", False),
                    "attachments_count": meta_flags.get("attachments_count", 0),
                })
        return {"items": items, "total": int(total), "next_offset": (offset + limit) if (offset + limit) < total else None}
    finally:
        conn.close()


@app.post("/email/open")
async def email_open(payload: dict = Body(default=None), request: Request = None):
    message_id = (payload or {}).get("id")
    client_name = (payload or {}).get("client")
    launch = _bool_from_payload((payload or {}).get("launch_outlook"), True)
    if not message_id:
        raise HTTPException(status_code=400, detail="id required")
    record = _db_get_message_by_id(message_id)
    link = (record or {}).get("outlook_link") or ""
    viewer_path = _email_viewer_path(message_id, client_name)
    viewer_absolute = _absolute_url(request, viewer_path)
    if not link:
        creds = _graph_app_creds()
        if creds:
            link = _graph_message_weblink(creds, message_id) or ""
            if link:
                _db_update_message_paths(message_id, outlook_link=link)
    if link:
        desktop_launched = False
        if launch:
            desktop_launched = _launch_outlook_app(link)
        return {
            "link": link,
            "launched": desktop_launched,
            "desktop_launched": desktop_launched,
            "viewer": viewer_absolute or viewer_path,
            "viewer_path": viewer_path,
        }
    path = _ensure_email_file(message_id, client_name)
    if not path:
        raise HTTPException(status_code=502, detail="Unable to fetch email content")
    opened = False
    if os.environ.get("DEV_ENABLE_OPEN"):
        try:
            os.startfile(str(path))
            opened = True
        except Exception:
            opened = False
    return {
        "path": str(path),
        "opened": opened,
        "viewer": viewer_absolute or viewer_path,
        "viewer_path": viewer_path,
        "desktop_launched": False,
    }


@app.get("/email/content")
async def email_content(id: str, client: Optional[str] = None):
    data = _email_render_content(id, client)
    if not data:
        raise HTTPException(status_code=404, detail="Email content unavailable")
    return data


@app.get("/email/viewer")
async def email_viewer(id: str, client: Optional[str] = None):
    data = _email_render_content(id, client)
    if not data:
        raise HTTPException(status_code=404, detail="Email content unavailable")
    record = _db_get_message_by_id(id)
    outlook_link = (record or {}).get("outlook_link") or ""
    eml_path = (record or {}).get("eml_path") or (record or {}).get("eml") or ""
    if not outlook_link:
        creds = _graph_app_creds()
        if creds:
            new_link = _graph_message_weblink(creds, id) or ""
            if new_link:
                outlook_link = new_link
                _db_update_message_paths(id, outlook_link=outlook_link)
    payload = dict(data)
    payload.update({
        "id": id,
        "client": client or (record or {}).get("client") or "",
        "outlook_link": outlook_link,
        "eml_path": eml_path,
    })
    html_page = _render_email_view_page(payload)
    return HTMLResponse(content=html_page)


@app.post("/email/sync_client")
async def email_sync_client(payload: dict = Body(default=None)):
    data = payload or {}
    name = data.get("name") or data.get("client_name")
    participants: List[str] = []
    raw_participants = data.get("participants") or data.get("emails") or []
    if isinstance(raw_participants, str):
        raw_participants = [raw_participants]
    if isinstance(raw_participants, list):
        for item in raw_participants:
            if isinstance(item, str) and item.strip():
                participants.append(item.strip())
    if not participants and name:
        entry = _registry_entry_for(name)
        participants = _entry_emails(entry)
    if not participants:
        raise HTTPException(status_code=400, detail="Provide participants or a client name with registered emails")
    try:
        since_days = int(data.get("since_days") or data.get("days") or 45)
        since_days = max(1, min(since_days, 365))
    except Exception:
        raise HTTPException(status_code=400, detail="since_days must be an integer between 1 and 365")
    try:
        timeout_seconds = int(data.get("timeout_seconds") or 320)
        timeout_seconds = max(30, min(timeout_seconds, 900))
    except Exception:
        timeout_seconds = 320

    repo_root = Path(__file__).resolve().parents[1]
    worker = repo_root / "tools" / "email_sync_worker.py"
    if not worker.exists():
        raise HTTPException(status_code=500, detail="email sync worker not found")

    cmd = [
        sys.executable or "python",
        str(worker),
        "--participants",
        ",".join(participants),
        "--since-days",
        str(since_days),
    ]
    try:
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            cwd=str(repo_root),
            timeout=timeout_seconds,
        )
    except subprocess.TimeoutExpired:
        raise HTTPException(status_code=504, detail="Email sync timed out")

    stdout_lines = (result.stdout or "").strip().splitlines()
    stderr_lines = (result.stderr or "").strip().splitlines()
    summary = None
    for line in reversed(stdout_lines):
        line = line.strip()
        if not line:
            continue
        try:
            summary = json.loads(line)
            break
        except json.JSONDecodeError:
            continue

    if result.returncode != 0:
        raise HTTPException(
            status_code=500,
            detail={
                "exit_code": result.returncode,
                "stdout_tail": stdout_lines[-5:] if stdout_lines else [],
                "stderr_tail": stderr_lines[-5:] if stderr_lines else [],
            },
        )

    response = {
        "ok": True,
        "client": {"name": name},
        "participants": participants,
        "since_days": since_days,
        "summary": summary,
        "stdout": stdout_lines[-20:] if stdout_lines else [],
    }
    if stderr_lines:
        response["stderr"] = stderr_lines[-20:]
    return response


@app.get("/api/client/summary")
async def client_summary(name: str, limit: int = 50):
    entry = _registry_entry_for(name)
    if not entry:
        return {"client": {"name": name}, "emails": [], "files": []}

    # Files: list top-level files in client folder (non-recursive)
    files = []
    folder = entry.get("folder")
    if folder and Path(folder).exists():
        for p in sorted(Path(folder).iterdir()):
            if p.is_file():
                files.append({"name": p.name, "path": str(p)})

    emails = _query_client_emails(Path(folder).name if folder else name, limit=limit)
    return {
        "client": {
            "name": entry.get("display_name") or name,
            "emails": _entry_emails(entry),
            "folder": folder or "",
            "phone": entry.get("phone") or "",
            "contacts": entry.get("contacts") or [],
        },
        "emails": emails,
        "files": files,
    }


# ===== Registry endpoints (local JSON under store_base) =====

def _registry_path() -> Optional[Path]:
    sb = _store_base()
    if not sb:
        return None
    return Path(sb) / "clients.json"


def _registry_read() -> dict:
    # Try SharePoint first
    reg = _sp_registry_read()
    if isinstance(reg, dict) and reg.get("clients") is not None:
        return reg
    # Fallback: local mirror
    rp = _registry_path()
    if rp and rp.exists():
        try:
            return json.loads(rp.read_text(encoding="utf-8"))
        except Exception:
            return {"clients": []}
    return {"clients": []}


def _registry_write(reg: dict) -> None:
    # Attempt SharePoint write; always also mirror locally if possible
    _sp_registry_write_safe(reg)
    rp = _registry_path()
    if rp:
        try:
            rp.write_text(json.dumps(reg, ensure_ascii=False, indent=2), encoding="utf-8")
        except Exception:
            pass


@app.get("/registry/clients")
async def registry_clients():
    return _registry_read()


@app.post("/registry/clients")
async def registry_clients_upsert(payload: dict = Body(default=None)):
    if not isinstance(payload, dict):
        raise HTTPException(status_code=400, detail="invalid body")
    name = (payload.get("display_name") or payload.get("name") or "").strip()
    if not name:
        raise HTTPException(status_code=400, detail="name required")
    reg = _registry_read()
    clients = reg.setdefault("clients", [])
    existing = None
    for c in clients:
        nm = c.get("display_name") or c.get("name") or c.get("slug")
        if nm == name:
            existing = c
            break
    if not existing:
        existing = {"id": str(uuid.uuid4()), "display_name": name}
        clients.append(existing)
    # Merge allowed fields
    for k in [
        "email",
        "folder",
        "phone",
        "notes",
        "contacts",
        "airtable_id",
        "slug",
        "client_type",
        "stage",
        "airtable_url",
        "metadata",
    ]:
        if k in payload and payload[k] is not None:
            existing[k] = payload[k]
    # default folder if not set
    if not existing.get("folder"):
        sb = _store_base()
        if sb:
            existing["folder"] = str(Path(sb) / name)
    _registry_write(reg)
    return existing


def _graph_app_creds() -> Optional[dict]:
    cid = os.environ.get("GRAPH_CLIENT_ID")
    csec = os.environ.get("GRAPH_CLIENT_SECRET")
    tid = os.environ.get("GRAPH_TENANT_ID")
    endpoint = os.environ.get("GRAPH_ENDPOINT", "https://graph.microsoft.com/v1.0")
    mailbox = os.environ.get("GRAPH_MAILBOX", "eitan@eislaw.co.il")
    if not (cid and csec and tid):
        # Fallback to secrets.local.json if env not present
        try:
            sec_path = Path(__file__).resolve().parents[1] / 'secrets.local.json'
            sec = json.loads(sec_path.read_text(encoding='utf-8'))
            mg = sec.get('microsoft_graph') or {}
            cid = cid or mg.get('client_id')
            csec = csec or mg.get('client_secret')
            tid = tid or mg.get('tenant_id')
        except Exception:
            pass
    if not (cid and csec and tid):
        return None
    return {"client_id": cid, "client_secret": csec, "tenant_id": tid, "endpoint": endpoint, "mailbox": mailbox}


# ===== Delegated (Device Code) support =====
# Use resource-scoped permissions for delegated device flow
_GRAPH_SCOPES = ["https://graph.microsoft.com/Mail.Read", "offline_access"]
_graph_cache_path = Path(__file__).resolve().parent / ".graph_cache.json"
_graph_ready_flag = False
_graph_lock = threading.Lock()


def _msal_app() -> Optional["msal.PublicClientApplication"]:
    if msal is None:
        return None
    # Use the same app registration (public client flow must be enabled)
    try:
        sec = json.loads((Path(__file__).resolve().parents[1] / "secrets.local.json").read_text(encoding="utf-8"))
        client_id = sec.get("microsoft_graph", {}).get("client_id")
        tenant_id = sec.get("microsoft_graph", {}).get("tenant_id")
        if not client_id or not tenant_id:
            return None
        authority = f"https://login.microsoftonline.com/{tenant_id}"
        cache = msal.SerializableTokenCache()
        if _graph_cache_path.exists():
            try:
                cache.deserialize(_graph_cache_path.read_text(encoding="utf-8"))
            except Exception:
                pass
        app = msal.PublicClientApplication(client_id, authority=authority, token_cache=cache)
        return app
    except Exception:
        return None


def _graph_save_cache(app: "msal.PublicClientApplication"):
    try:
        cache = app.token_cache
        if getattr(cache, "has_state_changed", lambda: False)():
            _graph_cache_path.write_text(cache.serialize(), encoding="utf-8")
    except Exception:
        pass


def _graph_acquire_silent() -> bool:
    global _graph_ready_flag
    app = _msal_app()
    if not app:
        return False
    try:
        accounts = app.get_accounts()
        if accounts:
            res = app.acquire_token_silent(_GRAPH_SCOPES, account=accounts[0])
            if res and res.get("access_token"):
                with _graph_lock:
                    _graph_ready_flag = True
                return True
    except Exception:
        pass
    return False


def _graph_acquire_by_device_flow_background(flow: dict):
    global _graph_ready_flag
    app = _msal_app()
    if not app:
        return
    try:
        res = app.acquire_token_by_device_flow(flow)  # blocks until completed or expired
        _graph_save_cache(app)
        if res and res.get("access_token"):
            with _graph_lock:
                _graph_ready_flag = True
    except Exception:
        pass


def _graph_get_delegated_token() -> Optional[str]:
    app = _msal_app()
    if not app:
        return None
    try:
        accounts = app.get_accounts()
        if accounts:
            res = app.acquire_token_silent(_GRAPH_SCOPES, account=accounts[0])
            if res and res.get("access_token"):
                return res["access_token"]
    except Exception:
        pass
    return None


def _http_post(url: str, data: dict, headers: dict) -> dict:
    body = urllib.parse.urlencode(data).encode("utf-8")
    req = urllib.request.Request(url, data=body, headers=headers, method="POST")
    ctx = ssl.create_default_context()
    with urllib.request.urlopen(req, context=ctx, timeout=30) as resp:
        return json.loads(resp.read().decode("utf-8"))


def _http_get(url: str, headers: dict) -> dict:
    req = urllib.request.Request(url, headers=headers, method="GET")
    ctx = ssl.create_default_context()
    with urllib.request.urlopen(req, context=ctx, timeout=30) as resp:
        return json.loads(resp.read().decode("utf-8"))


def _http_put_json(url: str, data: dict, headers: dict) -> dict:
    body = json.dumps(data or {}).encode("utf-8")
    H = dict(headers)
    H.setdefault("Content-Type", "application/json")
    req = urllib.request.Request(url, data=body, headers=H, method="PUT")
    ctx = ssl.create_default_context()
    with urllib.request.urlopen(req, context=ctx, timeout=30) as resp:
        raw = resp.read().decode("utf-8") or "{}"
        try:
            return json.loads(raw)
        except Exception:
            return {"raw": raw}


def _http_put_bytes(url: str, data: bytes, headers: dict) -> dict:
    H = dict(headers)
    H.setdefault("Content-Type", "application/octet-stream")
    req = urllib.request.Request(url, data=data, headers=H, method="PUT")
    ctx = ssl.create_default_context()
    with urllib.request.urlopen(req, context=ctx, timeout=30) as resp:
        raw = resp.read().decode("utf-8", errors="ignore") or "{}"
        try:
            return json.loads(raw)
        except Exception:
            return {"raw": raw}


def _graph_token(creds: dict) -> Optional[str]:
    tok_url = f"https://login.microsoftonline.com/{creds['tenant_id']}/oauth2/v2.0/token"
    data = {
        "grant_type": "client_credentials",
        "client_id": creds["client_id"],
        "client_secret": creds["client_secret"],
        "scope": "https://graph.microsoft.com/.default",
    }
    try:
        out = _http_post(tok_url, data, {"Content-Type": "application/x-www-form-urlencoded"})
        return out.get("access_token")
    except Exception:
        return None


def _graph_send_mail(creds: dict, to_addr: str, subject: str, html_body: str) -> dict:
    """Send an email via Microsoft Graph using application permissions.

    Requires creds = { client_id, client_secret, tenant_id, endpoint, mailbox }.
    Uses client credentials flow to obtain a token and calls users/{mailbox}/sendMail.
    """
    if not to_addr:
        raise HTTPException(status_code=400, detail="recipient email required")
    mailbox = (creds or {}).get("mailbox")
    if not mailbox:
        raise HTTPException(status_code=500, detail="Graph mailbox not configured")
    token = _graph_token(creds)
    if not token:
        raise HTTPException(status_code=500, detail="Graph token acquisition failed")
    endpoint = (creds or {}).get("endpoint") or "https://graph.microsoft.com/v1.0"
    url = f"{endpoint.rstrip('/')}/users/{urllib.parse.quote(mailbox)}/sendMail"
    body = {
        "message": {
            "subject": subject or "",
            "body": {"contentType": "HTML", "content": html_body or ""},
            "toRecipients": [{"emailAddress": {"address": to_addr}}],
        },
        "saveToSentItems": True,
    }
    headers = {"Authorization": f"Bearer {token}"}
    return _http_post_json(url, body, headers=headers)


# ===== Airtable helpers and endpoints =====

CLIENT_NAME_FIELDS = ["לקוחות", "לקוח", "Name", "Client"]
CLIENT_EMAIL_FIELDS = ["אימייל", "Email", "email"]
CLIENT_PHONE_FIELDS = ["מספר טלפון", "טלפון", "Phone"]
CLIENT_TYPE_FIELDS = ["סוג לקוח"]
CLIENT_STATUS_FIELDS = ["בטיפול", "Status"]
CLIENT_NOTES_FIELDS = ["הערות", "נתונים משפטי", "Notes"]
CLIENT_CONTACT_LINK_FIELDS = ["אנשי קשר נוספים 2", "אנשי קשר נוספים"]
CLIENT_PROJECT_FIELDS = ["תיקים ופרוייקטים 2", "Table 6"]

CONTACT_NAME_FIELDS = ["שם איש קשר", "Contact Name", "שם"]
CONTACT_EMAIL_FIELDS = ["מייל", "Email", "email"]
CONTACT_PHONE_FIELDS = ["טלפון", "Phone"]


def _airtable_conf() -> Optional[dict]:
    try:
        sec = json.loads((Path(__file__).resolve().parents[1] / "secrets.local.json").read_text(encoding="utf-8"))
        air = sec.get("airtable", {})
        tok = air.get("token") or air.get("token_alt")
        base = air.get("base_id")
        clients_table = air.get("clients_table") or "לקוחות"
        contacts_table = air.get("contacts_table")
        # Discover contacts table if not specified (requires Metadata API permission on PAT)
        if (not contacts_table) and requests and tok and base:
            try:
                url = f"https://api.airtable.com/v0/meta/bases/{base}/tables"
                r = requests.get(url, headers={"Authorization": f"Bearer {tok}"}, timeout=30)
                if r.status_code == 200:
                    names = [t.get("name") for t in r.json().get("tables", [])]
                    preferred = ["Contacts", "אנשי קשר", "אנשי קשר נוספים"]
                    for p in preferred:
                        if p in names:
                            contacts_table = p
                            break
                    if not contacts_table:
                        # pick any table containing 'contact'
                        for n in names:
                            if isinstance(n, str) and ("contact" in n.lower() or "קשר" in n):
                                contacts_table = n
                                break
            except Exception:
                pass
        contacts_table = contacts_table or "Contacts"
        # Also read optional default view for UI navigation
        view = air.get("view") or ""
        view_clients = air.get("view_clients") or view
        view_contacts = air.get("view_contacts") or view
        view_privacy = air.get("view_privacy") or view
        return {
            "token": tok,
            "base": base,
            "clients_table": clients_table,
            "contacts_table": contacts_table,
            "view": view,
            "clients_view": view_clients,
            "contacts_view": view_contacts,
            "privacy_view": view_privacy,
        }
    except Exception:
        return None


def _airtable_pick(fields: dict, candidates: list[str]) -> Optional[Any]:
    for key in candidates:
        if key in fields and fields[key]:
            return fields[key]
    return None


def _flatten_strings(value: Any) -> Iterable[str]:
    if isinstance(value, str):
        yield value
    elif isinstance(value, list):
        for item in value:
            yield from _flatten_strings(item)
    elif isinstance(value, dict):
        for item in value.values():
            yield from _flatten_strings(item)


def _collect_search_tokens(fields: dict) -> set[str]:
    tokens = set()
    for s in _flatten_strings(fields):
        if not isinstance(s, str):
            continue
        s = s.strip()
        if not s:
            continue
        lower = s.lower()
        tokens.add(lower)
        if "@" in s:
            local = lower.split("@", 1)[0]
            tokens.add(local)
            tokens.update(part for part in local.replace(".", " ").split() if part)
        digits = "".join(ch for ch in s if ch.isdigit())
        if len(digits) >= 5:
            tokens.add(digits)
    return tokens


def _airtable_normalize_client_record(rec: dict, conf: dict) -> Tuple[dict, List[str], set[str]]:
    fields = rec.get("fields", {})
    name = _airtable_pick(fields, CLIENT_NAME_FIELDS) or rec.get("id")
    email_val = _airtable_pick(fields, CLIENT_EMAIL_FIELDS)
    emails = []
    if isinstance(email_val, list):
        emails = [str(v).strip() for v in email_val if isinstance(v, str) and v.strip()]
    elif isinstance(email_val, str) and email_val.strip():
        emails = [email_val.strip()]
    phone = _airtable_pick(fields, CLIENT_PHONE_FIELDS)
    client_type = _airtable_pick(fields, CLIENT_TYPE_FIELDS) or []
    status = _airtable_pick(fields, CLIENT_STATUS_FIELDS)
    notes = _airtable_pick(fields, CLIENT_NOTES_FIELDS)
    whatsapp = fields.get("ווצאפ") or {}
    meeting = fields.get("מייל תיאום פגישה") or {}
    calc = fields.get("Calculation") or fields.get("fillout formula")
    project_refs = []
    for key in CLIENT_PROJECT_FIELDS:
        val = fields.get(key)
        if isinstance(val, list):
            project_refs.extend(val)
    contact_ids = []
    for key in CLIENT_CONTACT_LINK_FIELDS:
        val = fields.get(key)
        if isinstance(val, list):
            for item in val:
                if isinstance(item, str):
                    contact_ids.append(item)
    table_seg = conf.get("clients_table") or ""
    view_seg = conf.get("clients_view") or ""
    table_component = urllib.parse.quote(table_seg) if table_seg and not table_seg.startswith("tbl") else table_seg
    url_base = conf.get("base")
    record_url = None
    if url_base and rec.get("id"):
        seg = table_component or view_seg or ""
        record_url = f"https://airtable.com/{url_base}/{seg}/{rec.get('id')}".rstrip("/")
    normalized = {
        "id": rec.get("id"),
        "name": name,
        "emails": emails,
        "phone": phone,
        "client_type": client_type if isinstance(client_type, list) else [client_type] if client_type else [],
        "status": status,
        "notes": notes,
        "whatsapp_url": whatsapp.get("url") if isinstance(whatsapp, dict) else None,
        "meeting_email_url": meeting.get("url") if isinstance(meeting, dict) else None,
        "calculation_url": calc,
        "projects": project_refs,
        "airtable_url": record_url,
        "_contact_ids": contact_ids,
    }
    registry_defaults = {
        "display_name": name,
        "email": emails,
        "phone": phone,
        "client_type": normalized["client_type"],
        "stage": status,
        "notes": notes,
        "airtable_id": rec.get("id"),
        "airtable_url": normalized["airtable_url"],
    }
    normalized["registry_defaults"] = registry_defaults
    tokens = _collect_search_tokens(fields)
    return normalized, contact_ids, tokens


def _chunk_list(items: List[str], size: int) -> Iterable[List[str]]:
    for i in range(0, len(items), size):
        yield items[i : i + size]


def _airtable_fetch_contacts_by_ids(conf: dict, ids: List[str]) -> dict:
    ids = [i for i in ids if i]
    if not ids:
        return {}
    tok = conf.get("token")
    base = conf.get("base")
    contacts_table = conf.get("contacts_table") or "Contacts"
    view = conf.get("contacts_view")
    results = {}
    for chunk in _chunk_list(ids, 10):
        try:
            formula = "OR(" + ",".join(f"RECORD_ID()='{i}'" for i in chunk) + ")"
            params = {"filterByFormula": formula, "maxRecords": len(chunk)}
            if view:
                params["view"] = view
            data = _airtable_list_v2(base, contacts_table, tok, params)
            for rec in data.get("records", []):
                fields = rec.get("fields", {})
                contact = {
                    "id": rec.get("id"),
                    "name": _airtable_pick(fields, CONTACT_NAME_FIELDS),
                    "email": _airtable_pick(fields, CONTACT_EMAIL_FIELDS),
                    "phone": _airtable_pick(fields, CONTACT_PHONE_FIELDS),
                }
                results[rec.get("id")] = contact
        except Exception:
            continue
    return results


def _airtable_headers(tok: str) -> dict:
    return {"Authorization": f"Bearer {tok}", "Content-Type": "application/json"}


def _airtable_list_v2(base: str, table: str, tok: str, params: dict) -> dict:
    if requests is None:
        raise HTTPException(status_code=500, detail="requests not installed")
    import urllib.parse as _up
    url = f"https://api.airtable.com/v0/{base}/{_up.quote(table)}"
    r = requests.get(url, headers=_airtable_headers(tok), params=params, timeout=30)
    if r.status_code != 200:
        raise HTTPException(status_code=502, detail=f"Airtable list {r.status_code}: {r.text[:300]}")
    return r.json()


def _airtable_list_all(base: str, table: str, tok: str, params: dict, max_pages: int = 20) -> list:
    out = []
    p = dict(params or {})
    for _ in range(max_pages):
        data = _airtable_list_v2(base, table, tok, p)
        out.extend(data.get("records", []))
        off = data.get("offset")
        if not off:
            break
        p["offset"] = off
    return out


def _airtable_create(base: str, table: str, tok: str, fields: dict) -> dict:
    if requests is None:
        raise HTTPException(status_code=500, detail="requests not installed")
    import urllib.parse as _up
    url = f"https://api.airtable.com/v0/{base}/{_up.quote(table)}"
    body = {"records": [{"fields": fields}], "typecast": True}
    r = requests.post(url, headers=_airtable_headers(tok), data=json.dumps(body), timeout=30)
    if r.status_code not in (200, 201):
        raise HTTPException(status_code=502, detail=f"Airtable create {r.status_code}: {r.text[:300]}")
    return r.json()


@app.get("/airtable/search_open")
async def airtable_search_open(name: Optional[str] = None, email: Optional[str] = None):
    """Return an Airtable UI URL to open a matching client record if found.
    Falls back to the Clients table view when no match is found or Airtable is not configured.
    """
    conf = _airtable_conf()
    if not conf or not conf.get("token") or not conf.get("base"):
        # Open base root if we can, else signal not available
        base = (conf or {}).get("base") or ""
        if base:
            return {"openUrl": f"https://airtable.com/{base}"}
        raise HTTPException(status_code=503, detail="airtable not configured")
    base = conf["base"]
    table = conf.get("clients_table") or "לקוחות"
    tok = conf["token"]
    # Try to find record by name/email via API
    rec_id = None
    try:
        # Build a permissive formula over common fields
        safe_name = (name or "").replace("'", "\'")
        safe_email = (email or "").replace("'", "\'")
        ffs = []
        if safe_name:
            ffs.append(f"OR({{שם}}='{safe_name}', {{Name}}='{safe_name}', {{לקוח}}='{safe_name}', {{Client}}='{safe_name}')")
        if safe_email:
            ffs.append(f"OR({{Email}}='{safe_email}', FIND('{safe_email}', {{Email}}))")
        formula = f"OR({', '.join(ffs)})" if len(ffs) > 1 else (ffs[0] if ffs else "")
        params = {"maxRecords": 1}
        if formula:
            params["filterByFormula"] = formula
        recs = _airtable_list_all(base, table, tok, params, max_pages=1)
        if recs:
            rec_id = recs[0].get("id") or recs[0].get("recordId")
    except Exception:
        rec_id = None
    # Compose a UI URL
    if rec_id:
        return {"openUrl": f"https://airtable.com/{base}/{urllib.parse.quote(table)}/{rec_id}?blocks=hide"}
    view = conf.get("view")
    if view:
        return {"openUrl": f"https://airtable.com/{base}/{urllib.parse.quote(view)}"}
    return {"openUrl": f"https://airtable.com/{base}/{urllib.parse.quote(table)}"}


@app.get("/airtable/search")
async def airtable_search(q: Optional[str] = None, limit: int = 10):
    conf = _airtable_conf()
    if not conf or not conf.get("token") or not conf.get("base"):
        raise HTTPException(status_code=503, detail="Airtable not configured")
    try:
        limit = max(1, min(int(limit), 50))
    except Exception:
        limit = 10
    params = {"pageSize": max(25, min(limit * 5, 100))}
    if conf.get("clients_view"):
        params["view"] = conf["clients_view"]
    records = _airtable_list_all(conf["base"], conf["clients_table"], conf["token"], params, max_pages=5)
    qnorm = (q or "").strip().lower()
    matches: list[dict] = []
    contact_ids: list[str] = []
    for rec in records:
        normalized, contact_refs, tokens = _airtable_normalize_client_record(rec, conf)
        if qnorm:
            if not any(qnorm in tok for tok in tokens):
                continue
        normalized["_contact_ids"] = contact_refs
        normalized["_search_tokens"] = list(tokens)
        matches.append(normalized)
        contact_ids.extend(contact_refs)
        if len(matches) >= limit:
            break
    contact_lookup = _airtable_fetch_contacts_by_ids(conf, contact_ids)
    for item in matches:
        ids = item.pop("_contact_ids", [])
        item.pop("_search_tokens", None)
        item["contacts"] = [contact_lookup[i] for i in ids if i in contact_lookup]
    return {"items": matches}


def _airtable_update(base: str, table: str, tok: str, rec_id: str, fields: dict) -> dict:
    if requests is None:
        raise HTTPException(status_code=500, detail="requests not installed")
    import urllib.parse as _up
    url = f"https://api.airtable.com/v0/{base}/{_up.quote(table)}"
    body = {"records": [{"id": rec_id, "fields": fields}], "typecast": True}
    r = requests.patch(url, headers=_airtable_headers(tok), data=json.dumps(body), timeout=30)
    if r.status_code != 200:
        raise HTTPException(status_code=502, detail=f"Airtable update {r.status_code}: {r.text[:300]}")
    return r.json()


def _airtable_find_client(base: str, tok: str, table: str, name: str) -> Optional[str]:
    # Try filterByFormula across common Hebrew/English fields
    formulas = [
        f"OR({{שם}}='{name}', {{Name}}='{name}', {{לקוח}}='{name}', {{Client}}='{name}')",
        f"{{שם}}='{name}'",
    ]
    for f in formulas:
        try:
            data = _airtable_list_v2(base, table, tok, {"maxRecords": 1, "filterByFormula": f})
            recs = data.get("records", [])
            if recs:
                return recs[0]["id"]
        except Exception:
            pass
    # Fallback: scan first page
    recs = _airtable_list_all(base, table, tok, {"pageSize": 100})
    target = name.strip().lower()
    for rec in recs:
        fields = rec.get("fields", {})
        for k, v in fields.items():
            if isinstance(v, str) and v.strip().lower() == target:
                return rec.get("id")
    return None


def _airtable_detect_client_fields(base: str, tok: str, table: str) -> dict:
    recs = _airtable_list_all(base, table, tok, {"pageSize": 25})
    seen = set()
    sample_fields = []
    for rec in recs:
        f = (rec.get("fields") or {})
        seen.update(f.keys())
        if f:
            sample_fields.append(f)
    def pick(cands):
        for c in cands:
            if c in seen:
                return c
        return None
    name_field = pick(["לקוחות", "שם", "Name", "לקוח", "Client"]) or None
    email_field = pick(["אימייל", "מייל", "Email", "דוא\"ל", "E-mail", "email", "EMAIL"]) or None
    phone_field = pick(["טלפון", "Phone", "phone", "מספר טלפון", "Cell", "Mobile", "טל'"]) or None
    # If nothing matched, pick the first string-typed field from the first sample record
    if (not name_field) and sample_fields:
        for k, v in sample_fields[0].items():
            if isinstance(v, str) and v.strip():
                name_field = k
                break
    if (not email_field) and sample_fields:
        # choose any field containing '@'
        for k, v in sample_fields[0].items():
            if isinstance(v, str) and '@' in v:
                email_field = k
                break
    if (not phone_field) and sample_fields:
        for k, v in sample_fields[0].items():
            if isinstance(v, str) and any(ch.isdigit() for ch in v):
                phone_field = k
                break
    return {"name": name_field, "email": email_field, "phone": phone_field}


def _airtable_client_fields(name: str, email: str, fields_detect: dict, phone: Optional[str] = None) -> dict:
    out = {}
    if fields_detect.get("name"):
        out[fields_detect["name"]] = name
    if fields_detect.get("email"):
        out[fields_detect["email"]] = email
    if fields_detect.get("phone") and phone:
        out[fields_detect["phone"]] = phone
    # If nothing detected, fallback to a conventional field name 'Name'
    if not out and name:
        out["Name"] = name
    return out


@app.post("/airtable/clients_upsert")
async def airtable_clients_upsert(payload: dict = Body(default=None)):
    cfg = _airtable_conf()
    if not cfg or not cfg.get("token") or not cfg.get("base"):
        raise HTTPException(status_code=500, detail="Airtable not configured")
    name = (payload or {}).get("name")
    email = (payload or {}).get("email")
    phone = (payload or {}).get("phone")
    if not name or not email:
        raise HTTPException(status_code=400, detail="name and email required")
    base = cfg["base"]; tok = cfg["token"]; tbl = cfg["clients_table"]
    rec_id = _airtable_find_client(base, tok, tbl, name)
    fd = _airtable_detect_client_fields(base, tok, tbl)
    fields = _airtable_client_fields(name, email, fd, phone)
    if rec_id:
        out = _airtable_update(base, tbl, tok, rec_id, fields)
        return {"updated": True, "id": rec_id, "response": out}
    out = _airtable_create(base, tbl, tok, fields)
    rid = (out.get("records") or [{}])[0].get("id")
    return {"created": True, "id": rid, "response": out}


def _graph_list_messages_for_address(creds: dict, address: str, days: int = 365, top: int = 50) -> List[dict]:
    tok = _graph_token(creds)
    if not tok:
        return []
    # Filter by receivedDateTime and participant address (from/to/cc)
    # NOTE: OData any() is supported on recipients collections
    import datetime as dt

    since_iso = (dt.datetime.utcnow() - dt.timedelta(days=days)).strftime("%Y-%m-%dT%H:%M:%SZ")
    addr = address.replace("'", "''")
    filt = (
        f"receivedDateTime ge {since_iso} and ("
        f" from/emailAddress/address eq '{addr}' or "
        f" toRecipients/any(a:a/emailAddress/address eq '{addr}') or "
        f" ccRecipients/any(a:a/emailAddress/address eq '{addr}') )"
    )
    url = (
        f"{creds['endpoint'].rstrip('/')}/users/{urllib.parse.quote(creds['mailbox'])}/messages"
        f"?$top={top}&$orderby&$filter={urllib.parse.quote(filt)}"
        f"&$select=id,conversationId,receivedDateTime,subject,from,toRecipients,ccRecipients,bodyPreview"
    )
    H = {"Authorization": f"Bearer {tok}"}
    try:
        data = _http_get(url, H)
        return data.get("value", [])
    except Exception:
        return []


def _graph_sharepoint_site(creds: dict) -> Optional[dict]:
    tok = _graph_token(creds)
    if not tok:
        return None
    sp_site_path = os.environ.get("SP_SITE_PATH", "eislaw.sharepoint.com:/sites/EISLAWTEAM")
    url = f"{creds['endpoint'].rstrip('/')}/sites/{sp_site_path}"
    try:
        return _http_get(url, {"Authorization": f"Bearer {tok}"})
    except Exception:
        return None


def _graph_sharepoint_drive(creds: dict, site_id: str) -> Optional[str]:
    """Return drive id by env SP_DRIVE_NAME (displayName), else default drive id."""
    tok = _graph_token(creds)
    if not tok:
        return None
    drive_name = os.environ.get("SP_DRIVE_NAME")  # e.g., 'Documents' or 'מסמכים'
    H = {"Authorization": f"Bearer {tok}"}
    # Default drive
    if not drive_name:
        try:
            d = _http_get(f"{creds['endpoint'].rstrip('/')}/sites/{site_id}/drive", H)
            return d.get("id")
        except Exception:
            return None
    # Find by displayName
    try:
        drives = _http_get(f"{creds['endpoint'].rstrip('/')}/sites/{site_id}/drives", H).get("value", [])
        for dv in drives:
            if (dv.get("name") or dv.get("driveType") or "").lower() == drive_name.lower():
                return dv.get("id")
            if (dv.get("name") or "").lower() == drive_name.lower() or (dv.get("webUrl") or "").lower().endswith(drive_name.lower()):
                return dv.get("id")
        # Fallback to first (Documents)
        if drives:
            return drives[0].get("id")
    except Exception:
        return None


def _graph_sharepoint_client_item(creds: dict, rel_folder: str, client_name: str) -> Optional[dict]:
    tok = _graph_token(creds)
    if not tok:
        return None
    site = _graph_sharepoint_site(creds)
    if not site:
        return None
    # Pick drive
    drive_id = _graph_sharepoint_drive(creds, site['id'])
    if not drive_id:
        return None
    H = {"Authorization": f"Bearer {tok}"}
    # Build encoded path under chosen drive and try direct hit first
    segs = [s for s in [rel_folder, client_name] if s]
    enc_path = "/".join(urllib.parse.quote(s, safe='') for s in segs)
    url = f"{creds['endpoint'].rstrip('/')}/drives/{drive_id}/root:/{enc_path}"
    try:
        return _http_get(url, H)
    except Exception:
        pass
    # Fallback: list base folder children and fuzzy match by name
    try:
        base_url = f"{creds['endpoint'].rstrip('/')}/drives/{drive_id}/root:/{urllib.parse.quote(rel_folder, safe='')}:"
        base = _http_get(base_url, H)
        children = _http_get(base_url + "/children", H).get("value", [])
        def norm(s: str) -> str:
            import re
            return re.sub(r"\W+", "", (s or "").lower())
        target = norm(client_name)
        # 1) exact normalized match
        for it in children:
            if norm(it.get("name")) == target:
                return it
        # 2) startswith/contains
        for it in children:
            nm = norm(it.get("name"))
            if nm.startswith(target) or target.startswith(nm):
                return it
        # 3) first folder with target token
        for it in children:
            if target and target[:3] in norm(it.get("name")):
                return it
    except Exception:
        pass
    return None


def _graph_sharepoint_get_drive_and_base(creds: dict) -> Tuple[Optional[str], Optional[str]]:
    """Return (drive_id, base_path) where base_path is SP_DOC_BASE env or default.
    """
    site = _graph_sharepoint_site(creds)
    if not site:
        return None, None
    drive_id = _graph_sharepoint_drive(creds, site.get("id")) if site else None
    base = os.environ.get("SP_DOC_BASE") or "לקוחות משרד"
    return drive_id, base


def _graph_sharepoint_ensure_client_folder(creds: dict, rel_folder: str, client_name: str) -> dict:
    """Ensure SharePoint folder exists under rel_folder/client_name. Creates if missing.
    Returns { created: bool, item: {...} }.
    """
    tok = _graph_token(creds)
    if not tok:
        raise HTTPException(status_code=500, detail="Graph auth failed")
    def _norm(s: str) -> str:
        import re
        return re.sub(r"\W+", "", (s or "").lower())
    item = _graph_sharepoint_client_item(creds, rel_folder, client_name)
    if item and _norm(item.get("name")) == _norm(client_name):
        return {"created": False, "item": item}

    # Ensure base folder exists
    drive_id, base = _graph_sharepoint_get_drive_and_base(creds)
    if not drive_id:
        raise HTTPException(status_code=500, detail="Drive not found")
    H = {"Authorization": f"Bearer {tok}"}
    base_url = f"{creds['endpoint'].rstrip('/')}/drives/{drive_id}/root:/{urllib.parse.quote(rel_folder or base, safe='')}:"
    try:
        _http_get(base_url, H)
    except Exception:
        # Create base folder
        _http_put_json(base_url, {"folder": {}, "@microsoft.graph.conflictBehavior": "fail"}, H)

    # Create client folder via PUT root:/base/client:
    target_path = "/".join([rel_folder or base, client_name])
    tgt_url = f"{creds['endpoint'].rstrip('/')}/drives/{drive_id}/root:/{urllib.parse.quote(target_path, safe='')}:"
    out = _http_put_json(tgt_url, {"folder": {}, "@microsoft.graph.conflictBehavior": "fail"}, H)
    # Re-fetch to standardize shape if needed
    try:
        item2 = _http_get(tgt_url, H)
    except Exception:
        item2 = out
    return {"created": True, "item": item2}


def _graph_sharepoint_ensure_path(creds: dict, rel_path: str) -> dict:
    """Ensure an arbitrary folder path exists under the root drive. rel_path uses '/'."""
    tok = _graph_token(creds)
    if not tok:
        raise HTTPException(status_code=500, detail="Graph auth failed")
    drive_id, _ = _graph_sharepoint_get_drive_and_base(creds)
    if not drive_id:
        raise HTTPException(status_code=500, detail="Drive not found")
    H = {"Authorization": f"Bearer {tok}"}
    base_url = f"{creds['endpoint'].rstrip('/')}/drives/{drive_id}/root:/{urllib.parse.quote(rel_path, safe='')}:"
    try:
        _http_get(base_url, H)
        return {"created": False, "path": rel_path}
    except Exception:
        _http_put_json(base_url, {"folder": {}, "@microsoft.graph.conflictBehavior": "fail"}, H)
        return {"created": True, "path": rel_path}


def _sp_registry_path() -> str:
    # Path relative to the root drive, default System/registry.json
    return os.environ.get("SP_REGISTRY_PATH", "System/registry.json")


def _sp_registry_read() -> Optional[dict]:
    creds = _graph_app_creds()
    if not creds:
        return None
    tok = _graph_token(creds)
    if not tok:
        return None
    drive_id, _ = _graph_sharepoint_get_drive_and_base(creds)
    if not drive_id:
        return None
    H = {"Authorization": f"Bearer {tok}"}
    path = urllib.parse.quote(_sp_registry_path(), safe='')
    url = f"{creds['endpoint'].rstrip('/')}/drives/{drive_id}/root:/{path}:/content"
    try:
        req = urllib.request.Request(url, headers=H, method="GET")
        ctx = ssl.create_default_context()
        with urllib.request.urlopen(req, context=ctx, timeout=30) as resp:
            raw = resp.read().decode("utf-8")
            return json.loads(raw)
    except Exception:
        return None


def _sp_registry_write_safe(reg: dict) -> bool:
    try:
        creds = _graph_app_creds()
        if not creds:
            return False
        tok = _graph_token(creds)
        if not tok:
            return False
        drive_id, _ = _graph_sharepoint_get_drive_and_base(creds)
        if not drive_id:
            return False
        H = {"Authorization": f"Bearer {tok}", "Content-Type": "application/json"}
        path = urllib.parse.quote(_sp_registry_path(), safe='')
        url = f"{creds['endpoint'].rstrip('/')}/drives/{drive_id}/root:/{path}:/content"
        _http_put_bytes(url, json.dumps(reg, ensure_ascii=False).encode("utf-8"), H)
        return True
    except Exception:
        return False


def _sp_write_json(rel_path: str, obj: dict) -> bool:
    """Write arbitrary JSON to SharePoint drive under rel_path."""
    try:
        creds = _graph_app_creds()
        if not creds:
            return False
        tok = _graph_token(creds)
        if not tok:
            return False
        drive_id, _ = _graph_sharepoint_get_drive_and_base(creds)
        if not drive_id:
            return False
        H = {"Authorization": f"Bearer {tok}", "Content-Type": "application/json"}
        url = f"{creds['endpoint'].rstrip('/')}/drives/{drive_id}/root:/{urllib.parse.quote(rel_path, safe='') }:/content"
        _http_put_bytes(url, json.dumps(obj, ensure_ascii=False, indent=2).encode("utf-8"), H)
        return True
    except Exception:
        return False


def _sp_read_json(rel_path: str) -> Optional[dict]:
    """Read arbitrary JSON from SharePoint drive under rel_path. Returns None on failure."""
    try:
        creds = _graph_app_creds()
        if not creds:
            return None
        tok = _graph_token(creds)
        if not tok:
            return None
        drive_id, _ = _graph_sharepoint_get_drive_and_base(creds)
        if not drive_id:
            return None
        H = {"Authorization": f"Bearer {tok}"}
        url = f"{creds['endpoint'].rstrip('/')}/drives/{drive_id}/root:/{urllib.parse.quote(rel_path, safe='') }:/content"
        req = urllib.request.Request(url, headers=H, method="GET")
        ctx = ssl.create_default_context()
        with urllib.request.urlopen(req, context=ctx, timeout=30) as resp:
            raw = resp.read().decode("utf-8")
            return json.loads(raw)
    except Exception:
        return None


def _ensure_local_task_folder(client_name: str, task_id: str) -> Optional[Path]:
    sb = _store_base()
    if not sb:
        return None
    p = sb / client_name / "Tasks" / task_id
    try:
        p.mkdir(parents=True, exist_ok=True)
    except Exception:
        pass
    return p


@app.get("/api/task/local_folder")
async def api_task_local_folder(client_name: str, task_id: str):
    p = _ensure_local_task_folder(client_name, task_id)
    return {"localFolder": str(p) if p else ""}


# ===== Task Files canonical model (SharePoint JSON metadata) =====

def _tasks_meta_path(task_id: str) -> str:
    return f"System/tasks/{task_id}.json"


def _tasks_meta_read(task_id: str) -> dict:
    meta = _sp_read_json(_tasks_meta_path(task_id)) or {}
    meta.setdefault("task_id", task_id)
    meta.setdefault("folder_drive_id", None)
    meta.setdefault("folder_web_url", None)
    meta.setdefault("primary_output_drive_id", None)
    meta.setdefault("files_json", [])
    return meta


def _tasks_meta_write(task_id: str, meta: dict) -> bool:
    return _sp_write_json(_tasks_meta_path(task_id), meta)


def _http_patch_json(url: str, data: dict, headers: dict) -> dict:
    body = json.dumps(data).encode("utf-8")
    H = dict(headers or {})
    H.setdefault("Content-Type", "application/json")
    req = urllib.request.Request(url, data=body, headers=H, method="PATCH")
    ctx = ssl.create_default_context()
    with urllib.request.urlopen(req, context=ctx, timeout=30) as resp:
        return json.loads(resp.read().decode("utf-8"))


def _sanitize_hebrew_filename(s: str) -> str:
    # Replace illegal characters for SharePoint/Windows with maqaf (U+05BE)
    if s is None:
        return ""
    repl = "־"  # Hebrew maqaf
    bad = set('/\\:*?"<>|')
    out = "".join((ch if ch not in bad else repl) for ch in str(s))
    # Collapse spaces and trim
    out = " ".join(out.split())
    return out.strip()


def _truncate_middle(s: str, max_len: int) -> str:
    s = str(s or "")
    if len(s) <= max_len:
        return s
    if max_len <= 4:
        return s[:max_len]
    keep = max_len - 1
    head = keep // 2
    tail = keep - head
    return s[:head] + "…" + s[-tail:]


def _today_ddmmyy() -> str:
    dt = datetime.date.today()
    return f"{dt.day:02d}.{dt.month:02d}.{str(dt.year)[-2:]}"


def _sha256_bytes(b: bytes) -> str:
    return hashlib.sha256(b or b"").hexdigest()


def _strip_ext(name: str) -> Tuple[str, str]:
    base = (name or "").rsplit("/", 1)[-1].rsplit("\\", 1)[-1]
    if "." in base:
        i = base.rfind(".")
        return base[:i], base[i+1:]
    return base, ""


def _make_regular_effective_name(client_name: str, task_title: str, base_title: str, date_ddmmyy: Optional[str], ext: str) -> str:
    base_title = _sanitize_hebrew_filename(base_title)
    client_name = _sanitize_hebrew_filename(client_name)
    task_title = _sanitize_hebrew_filename(task_title)
    parts = [p for p in [client_name, task_title, base_title] if p]
    stub = "־".join(parts)
    date_seg = date_ddmmyy or _today_ddmmyy()
    name = f"{stub}_{date_seg}"
    if ext:
        name = f"{name}.{ext}"
    # Enforce overall max length (~180)
    name = _truncate_middle(name, 180)
    return name


def _sp_drive_and_token() -> Tuple[Optional[str], Optional[str], Optional[dict]]:
    creds = _graph_app_creds()
    if not creds:
        return None, None, None
    tok = _graph_token(creds)
    if not tok:
        return None, None, None
    drive_id, base = _graph_sharepoint_get_drive_and_base(creds)
    if not drive_id:
        return None, None, None
    H = {"Authorization": f"Bearer {tok}"}
    return drive_id, base, {"H": H, "creds": creds}


def _sp_children_of_folder(drive_id: str, folder_id: str, H: dict, creds: dict) -> List[dict]:
    url = f"{creds['endpoint'].rstrip('/')}/drives/{drive_id}/items/{folder_id}/children"
    try:
        data = _http_get(url, H)
        return data.get("value", [])
    except Exception:
        return []


def _sp_ensure_client_tasks_folder(creds: dict, base: str, client_name: str) -> dict:
    _graph_sharepoint_ensure_client_folder(creds, base, client_name)
    return _graph_sharepoint_ensure_path(creds, f"{base}/{client_name}/Tasks")


@app.post("/tasks/create_or_get_folder")
async def tasks_create_or_get_folder(payload: dict = Body(default=None)):
    client_name = (payload or {}).get("client_name") or ""
    task_title = (payload or {}).get("task_title") or ""
    task_id = (payload or {}).get("task_id") or ""
    if not client_name or not task_title:
        raise HTTPException(status_code=400, detail="client_name and task_title required")
    drive_id, base, ctx = _sp_drive_and_token()
    if not drive_id:
        raise HTTPException(status_code=500, detail="Graph not ready")
    creds = ctx["creds"]; H = ctx["H"]
    _sp_ensure_client_tasks_folder(creds, base, client_name)
    # Human-readable folder name
    fname = _sanitize_hebrew_filename(f"{client_name} — {task_title}")
    rel = f"{base}/{client_name}/Tasks/{fname}"
    _graph_sharepoint_ensure_path(creds, rel)
    url = f"{creds['endpoint'].rstrip('/')}/drives/{drive_id}/root:/{urllib.parse.quote(rel, safe='')}:"
    info = _http_get(url, H)
    resp = {"drive_id": info.get("id"), "web_url": info.get("webUrl"), "name": info.get("name")}
    # Persist to task meta if task_id provided
    if task_id:
        meta = _tasks_meta_read(task_id)
        meta["folder_drive_id"] = info.get("id")
        meta["folder_web_url"] = info.get("webUrl")
        _tasks_meta_write(task_id, meta)
    return resp


@app.post("/tasks/{task_id}/files/upload")
async def tasks_files_upload(task_id: str, file: UploadFile = File(...), kind: str = Form("work"), user_title: Optional[str] = Form(None), date: Optional[str] = Form(None), client_name: Optional[str] = Form(None), task_title: Optional[str] = Form(None)):
    drive_id, base, ctx = _sp_drive_and_token()
    if not drive_id:
        raise HTTPException(status_code=500, detail="Graph not ready")
    creds = ctx["creds"]; H = ctx["H"]
    meta = _tasks_meta_read(task_id)
    # Ensure a folder exists: prefer canonical folder; else fallback to id-based path if client/task provided
    folder_id = meta.get("folder_drive_id")
    parent_url = None
    if not folder_id:
        if client_name and task_title:
            _sp_ensure_client_tasks_folder(creds, base, client_name)
            fname = _sanitize_hebrew_filename(f"{client_name} — {task_title}")
            rel = f"{base}/{client_name}/Tasks/{fname}"
            _graph_sharepoint_ensure_path(creds, rel)
            url = f"{creds['endpoint'].rstrip('/')}/drives/{drive_id}/root:/{urllib.parse.quote(rel, safe='')}:"
            info = _http_get(url, H)
            folder_id = info.get("id"); parent_url = info.get("webUrl")
        elif client_name:
            rel = f"{base}/{client_name}/Tasks/{task_id}"
            _graph_sharepoint_ensure_client_folder(creds, base, client_name)
            _graph_sharepoint_ensure_path(creds, f"{base}/{client_name}/Tasks")
            _graph_sharepoint_ensure_path(creds, rel)
            url = f"{creds['endpoint'].rstrip('/')}/drives/{drive_id}/root:/{urllib.parse.quote(rel, safe='')}:"
            info = _http_get(url, H)
            folder_id = info.get("id"); parent_url = info.get("webUrl")
        else:
            raise HTTPException(status_code=400, detail="No task folder; provide client_name and optionally task_title to create")
        # Persist folder in meta
        meta["folder_drive_id"] = folder_id
        meta["folder_web_url"] = parent_url
    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="empty file")
    source_name = file.filename or "upload.bin"
    base_title, ext = _strip_ext(source_name)
    if user_title:
        base_title = user_title
    eff = _make_regular_effective_name(client_name or "", task_title or "", base_title, date or None, ext)
    # Collision handling: list children and append -1, -2 if needed
    kids = _sp_children_of_folder(drive_id, folder_id, H, creds)
    names = {k.get("name") for k in (kids or [])}
    final_name = eff
    idx = 1
    while final_name in names:
        base_no_ext, _ = _strip_ext(eff)
        cand = f"{base_no_ext}-{idx}.{ext}" if ext else f"{base_no_ext}-{idx}"
        final_name = _truncate_middle(cand, 180)
        idx += 1
    up_url = f"{creds['endpoint'].rstrip('/')}/drives/{drive_id}/items/{folder_id}:/{urllib.parse.quote(final_name, safe='') }:/content"
    up = _http_put_bytes(up_url, content, H)
    item_id = up.get("id") or (up.get("parentReference", {}).get("id"))
    web_url = up.get("webUrl")
    rec = {
        "drive_id": item_id,
        "web_url": web_url,
        "source_name": source_name,
        "user_title": user_title or None,
        "effective_name": up.get("name") or final_name,
        "kind": kind,
        "sha256": _sha256_bytes(content),
        "size": len(content),
        "added_at": datetime.datetime.utcnow().isoformat() + "Z",
    }
    # Update meta
    arr = meta.get("files_json") or []
    if not any((x.get("sha256") == rec["sha256"]) for x in arr):
        arr.append(rec)
        meta["files_json"] = arr
    _tasks_meta_write(task_id, meta)
    return rec


@app.patch("/tasks/{task_id}/files/{drive_item_id}/title")
async def tasks_files_rename_title(task_id: str, drive_item_id: str, payload: dict = Body(default=None)):
    user_title = (payload or {}).get("user_title")
    date = (payload or {}).get("date")
    client_name = (payload or {}).get("client_name") or ""
    task_title = (payload or {}).get("task_title") or ""
    drive_id, _, ctx = _sp_drive_and_token()
    if not drive_id:
        raise HTTPException(status_code=500, detail="Graph not ready")
    H = ctx["H"]; creds = ctx["creds"]
    meta = _tasks_meta_read(task_id)
    # Find the record to determine ext and existing name
    rec = None
    for f in meta.get("files_json") or []:
        if f.get("drive_id") == drive_item_id:
            rec = f; break
    if not rec:
        raise HTTPException(status_code=404, detail="file record not found")
    _, ext = _strip_ext(rec.get("effective_name") or rec.get("source_name") or "")
    eff = _make_regular_effective_name(client_name, task_title, user_title or (rec.get("user_title") or rec.get("source_name") or ""), date or None, ext)
    url = f"{creds['endpoint'].rstrip('/')}/drives/{drive_id}/items/{drive_item_id}"
    out = _http_patch_json(url, {"name": eff}, {"Authorization": H["Authorization"]})
    rec["user_title"] = user_title or rec.get("user_title")
    rec["effective_name"] = out.get("name") or eff
    _tasks_meta_write(task_id, meta)
    return rec


@app.post("/tasks/{task_id}/deliverable/set_current")
async def tasks_set_current_deliverable(task_id: str, payload: dict = Body(default=None)):
    drive_item_id = (payload or {}).get("drive_id")
    if not drive_item_id:
        raise HTTPException(status_code=400, detail="drive_id required")
    meta = _tasks_meta_read(task_id)
    meta["primary_output_drive_id"] = drive_item_id
    _tasks_meta_write(task_id, meta)
    return {"ok": True, "drive_id": drive_item_id}


@app.get("/tasks/{task_id}/files")
async def tasks_files_list(task_id: str):
    meta = _tasks_meta_read(task_id)
    return {"files": meta.get("files_json") or [], "folder": {"id": meta.get("folder_drive_id"), "web_url": meta.get("folder_web_url")}, "primary_output_drive_id": meta.get("primary_output_drive_id")}


@app.post("/tasks/{task_id}/emails/attach")
async def tasks_emails_attach(task_id: str, payload: dict = Body(default=None)):
    graph_id = (payload or {}).get("graph_id") or (payload or {}).get("id")
    mailbox = (payload or {}).get("mailbox")
    save_pdf = bool((payload or {}).get("save_pdf", True))
    save_attachments = bool((payload or {}).get("save_attachments", True))
    user_title = (payload or {}).get("user_title")
    client_name = (payload or {}).get("client_name") or ""
    task_title = (payload or {}).get("task_title") or ""
    if not graph_id:
        raise HTTPException(status_code=400, detail="graph_id required")
    drive_id, base, ctx = _sp_drive_and_token()
    if not drive_id:
        raise HTTPException(status_code=500, detail="Graph not ready")
    H = ctx["H"]; creds = ctx["creds"]
    # Ensure folder
    meta = _tasks_meta_read(task_id)
    folder_id = meta.get("folder_drive_id")
    if not folder_id:
        if not client_name:
            raise HTTPException(status_code=400, detail="client_name required to create task folder")
        _sp_ensure_client_tasks_folder(creds, base, client_name)
        fname = _sanitize_hebrew_filename(f"{client_name} — {task_title}")
        rel = f"{base}/{client_name}/Tasks/{fname}"
        _graph_sharepoint_ensure_path(creds, rel)
        f_url = f"{creds['endpoint'].rstrip('/')}/drives/{drive_id}/root:/{urllib.parse.quote(rel, safe='')}:"
        info = _http_get(f_url, H)
        folder_id = info.get("id"); meta["folder_drive_id"] = folder_id; meta["folder_web_url"] = info.get("webUrl")
    # Try to locate EML bytes from local index
    eml_bytes: Optional[bytes] = None
    record = _db_get_message_by_id(graph_id)
    subject = (record or {}).get("subject") or ""
    received_dt = (record or {}).get("received") or ""
    from_addr = (record or {}).get("from") or ""
    eml_path = (record or {}).get("eml") or (record or {}).get("eml_path") or ""
    json_path = (record or {}).get("json") or ""
    if not client_name:
        client_name = (record or {}).get("client") or ""
    if eml_path and Path(eml_path).exists():
        try:
            eml_bytes = Path(eml_path).read_bytes()
        except Exception:
            eml_bytes = None
    # Fallback to Graph message $value if needed
    if eml_bytes is None and mailbox:
        try:
            url = f"{creds['endpoint'].rstrip('/')}/users/{urllib.parse.quote(mailbox)}/messages/{urllib.parse.quote(graph_id)}/$value"
            req = urllib.request.Request(url, headers=H, method="GET")
            ctx2 = ssl.create_default_context()
            with urllib.request.urlopen(req, context=ctx2, timeout=30) as resp:
                eml_bytes = resp.read()
        except Exception:
            eml_bytes = None
    if eml_bytes is None:
        raise HTTPException(status_code=404, detail="EML not available")
    # Compute mkey
    mkey = hashlib.sha256((graph_id or "").encode("utf-8")).hexdigest()[:8]
    # Upload EML
    subj_short = _truncate_middle(_sanitize_hebrew_filename(subject or user_title or "email"), 32)
    date_seg = _today_ddmmyy()
    eml_name = f"מייל_{subj_short}_{date_seg}__m-{mkey}.eml"
    eml_url = f"{creds['endpoint'].rstrip('/')}/drives/{drive_id}/items/{folder_id}:/{urllib.parse.quote(eml_name, safe='') }:/content"
    eml_up = _http_put_bytes(eml_url, eml_bytes, H)
    eml_item_id = eml_up.get("id"); eml_web = eml_up.get("webUrl")
    viewer_path = _email_viewer_path(graph_id, client_name or (record or {}).get("client"))
    # Record base file record
    meta_flags = _email_json_meta(json_path)
    eml_rec = {
        "drive_id": eml_item_id,
        "web_url": eml_web,
        "source_name": f"{subject or ''}.eml",
        "user_title": user_title or None,
        "effective_name": eml_up.get("name") or eml_name,
        "kind": "email",
        "sha256": _sha256_bytes(eml_bytes),
        "size": len(eml_bytes),
        "added_at": datetime.datetime.utcnow().isoformat() + "Z",
        "mkey": mkey,
        "email_meta": {
            "id": graph_id,
            "client": client_name,
            "subject": subject,
            "from": from_addr or meta_flags.get("from_addr") or "",
            "received": received_dt,
            "has_attachments": meta_flags.get("has_attachments", False),
            "attachments_count": meta_flags.get("attachments_count", 0),
            "viewer": viewer_path,
            "viewer_path": viewer_path,
            "outlook_link": (record or {}).get("outlook_link") or "",
        },
    }
    files = meta.get("files_json") or []
    files.append(eml_rec)
    # Optionally save PDF (best-effort; silently skip on failure)
    pdf_rec = None
    if save_pdf:
        try:
            # Placeholder: no PDF rendering engine wired here
            pdf_bytes = None
            if pdf_bytes:
                pdf_name = f"מייל_{subj_short}_{date_seg}__m-{mkey}.pdf"
                pdf_url = f"{creds['endpoint'].rstrip('/')}/drives/{drive_id}/items/{folder_id}:/{urllib.parse.quote(pdf_name, safe='') }:/content"
                pdf_up = _http_put_bytes(pdf_url, pdf_bytes, H)
                pdf_rec = {
                    "drive_id": pdf_up.get("id"),
                    "web_url": pdf_up.get("webUrl"),
                    "source_name": f"{subject or ''}.pdf",
                    "user_title": user_title or None,
                    "effective_name": pdf_up.get("name") or pdf_name,
                    "kind": "pdf",
                    "sha256": _sha256_bytes(pdf_bytes),
                    "size": len(pdf_bytes),
                    "added_at": datetime.datetime.utcnow().isoformat() + "Z",
                    "mkey": mkey,
                    "parent_eml_drive_id": eml_item_id,
                }
                files.append(pdf_rec)
        except Exception:
            pass
    # Optionally save attachments
    attachments = []
    if save_attachments and mailbox:
        try:
            aurl = f"{creds['endpoint'].rstrip('/')}/users/{urllib.parse.quote(mailbox)}/messages/{urllib.parse.quote(graph_id)}/attachments"
            att_data = _http_get(aurl, H).get("value", [])
            att_idx = 1
            for att in att_data:
                if att.get("@odata.type") == "#microsoft.graph.fileAttachment":
                    orig = att.get("name") or "attachment"
                    base_title, ext = _strip_ext(orig)
                    orig_short = _truncate_middle(_sanitize_hebrew_filename(base_title), 50)
                    fname = f"m-{mkey}__att-{att_idx}_{orig_short}.{ext}" if ext else f"m-{mkey}__att-{att_idx}_{orig_short}"
                    content_bytes = None
                    try:
                        b64 = att.get("contentBytes")
                        if b64:
                            import base64
                            content_bytes = base64.b64decode(b64)
                    except Exception:
                        content_bytes = None
                    if content_bytes:
                        up_url = f"{creds['endpoint'].rstrip('/')}/drives/{drive_id}/items/{folder_id}:/{urllib.parse.quote(fname, safe='') }:/content"
                        up = _http_put_bytes(up_url, content_bytes, H)
                        arec = {
                            "drive_id": up.get("id"),
                            "web_url": up.get("webUrl"),
                            "source_name": orig,
                            "user_title": None,
                            "effective_name": up.get("name") or fname,
                            "kind": "attachment",
                            "sha256": _sha256_bytes(content_bytes),
                            "size": len(content_bytes),
                            "added_at": datetime.datetime.utcnow().isoformat() + "Z",
                            "mkey": mkey,
                            "parent_eml_drive_id": eml_item_id,
                        }
                        files.append(arec)
                        attachments.append(arec)
                        att_idx += 1
        except Exception:
            pass
    meta["files_json"] = files
    _tasks_meta_write(task_id, meta)
    return {"eml": eml_rec, "pdf": pdf_rec, "attachments": attachments}


@app.post("/tasks/{task_id}/links/add")
async def tasks_links_add(task_id: str, payload: dict = Body(default=None)):
    url = (payload or {}).get("url") or ""
    user_title = (payload or {}).get("user_title") or ""
    if not url or not (url.startswith("http://") or url.startswith("https://")):
        raise HTTPException(status_code=400, detail="valid http(s) url required")
    meta = _tasks_meta_read(task_id)
    rec = {
        "drive_id": None,
        "web_url": url,
        "source_name": url,
        "user_title": user_title or None,
        "effective_name": user_title or url,
        "kind": "link",
        "sha256": None,
        "size": 0,
        "added_at": datetime.datetime.utcnow().isoformat() + "Z",
    }
    files = meta.get("files_json") or []
    files.append(rec)
    meta["files_json"] = files
    _tasks_meta_write(task_id, meta)
    return rec


@app.post("/tasks/{task_id}/folder_link_add")
async def tasks_folder_link_add(task_id: str, payload: dict = Body(default=None)):
    """Add a folder reference to a task.
    Accepts either a SharePoint/HTTP URL (web_url) or a local filesystem path (local_path).
    """
    web_url = (payload or {}).get("web_url") or ""
    local_path = (payload or {}).get("local_path") or ""
    user_title = (payload or {}).get("user_title") or ""
    if not web_url and not local_path:
        raise HTTPException(status_code=400, detail="web_url or local_path required")
    if web_url and not (web_url.startswith("http://") or web_url.startswith("https://")):
        raise HTTPException(status_code=400, detail="invalid web_url")
    try:
        name_guess = user_title or (os.path.basename(local_path) if local_path else urllib.parse.urlparse(web_url).path.split("/")[-1])
    except Exception:
        name_guess = user_title or (local_path or web_url)
    meta = _tasks_meta_read(task_id)
    rec = {
        "drive_id": None,
        "web_url": web_url or None,
        "local_path": local_path or None,
        "source_name": local_path or web_url,
        "user_title": user_title or None,
        "effective_name": name_guess,
        "kind": "folder",
        "sha256": None,
        "size": 0,
        "added_at": datetime.datetime.utcnow().isoformat() + "Z",
    }
    files = meta.get("files_json") or []
    files.append(rec)
    meta["files_json"] = files
    _tasks_meta_write(task_id, meta)
    return rec


@app.patch("/tasks/{task_id}/links/update")
async def tasks_links_update(task_id: str, payload: dict = Body(default=None)):
    """Update a link record (by current web_url)."""
    cur = (payload or {}).get("current_web_url") or ""
    new_url = (payload or {}).get("new_web_url") or ""
    user_title = (payload or {}).get("user_title") or None
    if not cur:
        raise HTTPException(status_code=400, detail="current_web_url required")
    meta = _tasks_meta_read(task_id)
    files = meta.get("files_json") or []
    hit = None
    for f in files:
        if f.get("kind") == "link" and f.get("web_url") == cur:
            hit = f
            break
    if not hit:
        raise HTTPException(status_code=404, detail="link not found")
    if new_url:
        hit["web_url"] = new_url
        hit["source_name"] = new_url
    if user_title is not None:
        hit["user_title"] = user_title or None
        hit["effective_name"] = user_title or (hit.get("effective_name") or new_url or cur)
    meta["files_json"] = files
    _tasks_meta_write(task_id, meta)
    return hit


@app.post("/tasks/{task_id}/assets/remove")
async def tasks_assets_remove(task_id: str, payload: dict = Body(default=None)):
    """Remove an asset by any identifier (drive_id/web_url/local_path)."""
    drive_id = (payload or {}).get("drive_id")
    web_url = (payload or {}).get("web_url")
    local_path = (payload or {}).get("local_path")
    if not any([drive_id, web_url, local_path]):
        raise HTTPException(status_code=400, detail="identifier required")
    meta = _tasks_meta_read(task_id)
    files = meta.get("files_json") or []
    kept = []
    removed = 0
    for f in files:
        if drive_id and f.get("drive_id") == drive_id:
            removed += 1; continue
        if web_url and f.get("web_url") == web_url:
            removed += 1; continue
        if local_path and f.get("local_path") == local_path:
            removed += 1; continue
        kept.append(f)
    meta["files_json"] = kept
    _tasks_meta_write(task_id, meta)
    return {"removed": removed, "files": kept}
def _sp_list_client_folders() -> Optional[set]:
    """Return the set of client folder names under the SharePoint base folder.
    Returns None on failure (treated as unknown)."""
    try:
        creds = _graph_app_creds()
        if not creds:
            return None
        tok = _graph_token(creds)
        if not tok:
            return None
        drive_id, base = _graph_sharepoint_get_drive_and_base(creds)
        if not drive_id:
            return None
        H = {"Authorization": f"Bearer {tok}"}
        base_url = f"{creds['endpoint'].rstrip('/')}/drives/{drive_id}/root:/{urllib.parse.quote(base, safe='')}:"
        try:
            children = _http_get(base_url + "/children", H).get("value", [])
        except Exception:
            children = []
        out = set()
        for it in children:
            if it.get("folder") and it.get("name"):
                out.add(it.get("name"))
        return out
    except Exception:
        return None


def _local_list_client_folders() -> set:
    """Return set of folder names under local store_base (if available)."""
    out = set()
    sb = _store_base()
    if not sb:
        return out
    try:
        for p in sb.iterdir():
            if p.is_dir():
                out.add(p.name)
    except Exception:
        pass
    return out


def _should_remove_entry(entry: dict, present_names: set) -> bool:
    import re
    # Heuristic: remove records produced by earlier bug (airtable+rec...)
    nm = (entry.get("display_name") or entry.get("name") or entry.get("slug") or "").strip()
    em = entry.get("email")
    if isinstance(em, list):
        em = em[0] if em else ""
    if isinstance(em, str) and em.startswith("airtable+rec"):
        return True
    if nm.startswith("airtable+rec"):
        return True
    # Determine folder-based presence
    folder = entry.get("folder") or ""
    folder_name = None
    try:
        if folder:
            folder_name = Path(folder).name
    except Exception:
        folder_name = None
    key = folder_name or nm
    # Keep if present in SharePoint/local lists
    if key and key in present_names:
        return False
    # Otherwise remove
    return True


@app.get("/registry/cleanup")
async def registry_cleanup_preview():
    """Preview registry cleanup. Returns items that would be removed."""
    reg = _registry_read()
    clients = reg.get("clients", [])
    sp_names = _sp_list_client_folders() or set()
    local_names = _local_list_client_folders()
    present = set(sp_names) | set(local_names)
    to_remove = []
    to_keep = []
    for c in clients:
        if _should_remove_entry(c, present):
            to_remove.append({"name": c.get("display_name") or c.get("name"), "folder": c.get("folder"), "email": c.get("email")})
        else:
            to_keep.append(c.get("display_name") or c.get("name"))
    return {
        "present_folders": sorted(list(present)),
        "remove_count": len(to_remove),
        "keep_count": len(to_keep),
        "to_remove": to_remove[:200],  # cap payload
    }


@app.post("/registry/cleanup")
async def registry_cleanup_apply():
    """Apply cleanup: remove entries not backed by SharePoint/local folders and bugged airtable+rec entries.
    Creates a backup (SharePoint and local) before writing.
    """
    reg = _registry_read()
    clients = reg.get("clients", [])
    sp_names = _sp_list_client_folders() or set()
    local_names = _local_list_client_folders()
    present = set(sp_names) | set(local_names)
    cleaned = [c for c in clients if not _should_remove_entry(c, present)]
    removed = [c for c in clients if c not in cleaned]
    if len(cleaned) == len(clients):
        return {"changed": False, "removed": 0}
    # Backups
    try:
        ts = int(time.time())
        backup_name = f"System/registry.backup.{ts}.json"
        _sp_registry_write_safe(reg)  # write current as main copy
        # explicit backup in SP
        creds = _graph_app_creds()
        if creds:
            tok = _graph_token(creds)
            drive_id, _ = _graph_sharepoint_get_drive_and_base(creds)
            if tok and drive_id:
                H = {"Authorization": f"Bearer {tok}", "Content-Type": "application/json"}
                url = f"{creds['endpoint'].rstrip('/')}/drives/{drive_id}/root:/{urllib.parse.quote(backup_name, safe='') }:/content"
                _http_put_bytes(url, json.dumps(reg, ensure_ascii=False, indent=2).encode("utf-8"), H)
    except Exception:
        pass
    # Write cleaned
    reg["clients"] = cleaned
    _registry_write(reg)
    return {"changed": True, "removed": len(removed)}


def _airtable_discover_contact_fields(base: str, tok: str, table: str) -> dict:
    recs = _airtable_list_all(base, table, tok, {"pageSize": 50})
    seen = set()
    for rec in recs:
        seen.update((rec.get("fields") or {}).keys())

    def pick(cands: list, use_default: bool = True) -> Optional[str]:
        for c in cands:
            if c in seen:
                return c
        # If the table is empty (no seen fields), fall back to the first candidate to avoid missing required fields
        return cands[0] if (use_default and cands) else None

    return {
        "name": pick(["שם איש קשר", "שם", "Name"]),
        "email": pick(["מייל", "Email", "דוא\"ל", "E-mail", "email", "EMAIL"]),
        "phone": pick(["טלפון", "Phone", "טלפון נייד", "phone"]),
        "role": pick(["תפקיד איש קשר", "Contact Role", "Role", "תפקיד"]),
        "link": pick(["לקוח", "Client", "לקוח/ים", "Clients"]),
    }


def _airtable_discover_contact_fields_extras(base: str, tok: str, table: str, fmap: dict) -> dict:
    try:
        recs = _airtable_list_all(base, table, tok, {"pageSize": 50})
    except Exception:
        recs = []
    seen = set()
    for rec in recs:
        seen.update((rec.get("fields") or {}).keys())

    def pick(cands: list) -> Optional[str]:
        for c in cands:
            if c in seen:
                return c
        return None

    out = dict(fmap or {})
    out.setdefault("desc", pick(["תיאור", "תאור", "Description", "Desc"]))
    out.setdefault("address", pick(["כתובת", "Address"]))
    out.setdefault("id", pick(["מספר זיהוי", "ID Number", "ID"]))
    return out

def _airtable_build_contact_fields(fields_map: dict, name: str, email: str, phone: str, role: str, client_id: str) -> dict:
    out = {}
    if fields_map.get("name"):
        out[fields_map["name"]] = name
    if fields_map.get("email"):
        out[fields_map["email"]] = email
    if phone and fields_map.get("phone"):
        out[fields_map["phone"]] = phone
    if role and fields_map.get("role"):
        out[fields_map["role"]] = role
    if fields_map.get("link") and client_id:
        out[fields_map["link"]] = [client_id]
    return out

def _airtable_build_contact_fields_ext(fields_map: dict, name: str, email: str, phone: str, role: str, client_id: str, desc: str = "", address: str = "", id_number: str = "") -> dict:
    base = _airtable_build_contact_fields(fields_map, name, email, phone, role, client_id)
    if desc and fields_map.get("desc"):
        base[fields_map["desc"]] = desc
    elif role and fields_map.get("desc"):
        base[fields_map["desc"]] = role
    if address and fields_map.get("address"):
        base[fields_map["address"]] = address
    if id_number and fields_map.get("id"):
        base[fields_map["id"]] = id_number
    return base


@app.get("/api/client/summary_online")
async def client_summary_online(name: Optional[str] = None, email: Optional[str] = None, limit: int = 25):
    creds = _graph_app_creds()
    if not creds:
        raise HTTPException(status_code=500, detail="Graph credentials not configured")
    # Prefer email; if only name is provided, try to resolve from registry
    if not email and name:
        reg = _load_clients_registry() or {}
        for c in reg.get("clients", []):
            nm = c.get("display_name") or c.get("name") or c.get("slug")
            if nm == name:
                em = c.get("email")
                if isinstance(em, list) and em:
                    email = em[0]
                elif isinstance(em, str):
                    email = em
                break
    if not email:
        raise HTTPException(status_code=400, detail="Provide email or name")

    msgs = _graph_list_messages_for_address(creds, email, top=limit)
    out = []
    for m in msgs:
        out.append({
            "id": m.get("id"),
            "received": m.get("receivedDateTime"),
            "subject": m.get("subject"),
            "from": ((m.get("from") or {}).get("emailAddress") or {}).get("address"),
            "bodyPreview": m.get("bodyPreview"),
        })
    return {"client": {"name": name, "email": email}, "emails": out}


def _graph_latest_weblink_for_address(creds: dict, address: str) -> Optional[str]:
    tok = _graph_token(creds)
    if not tok:
        return None
    # Use AQS search over messages for participants:address, newest first
    import datetime as dt
    base = creds['endpoint'].rstrip('/')
    mailbox = urllib.parse.quote(creds.get('mailbox') or '')
    search = urllib.parse.quote(f'"participants:{address}"')
    url = f"{base}/users/{mailbox}/messages?$search={search}&$top=1&$orderby&$select=webLink,receivedDateTime,subject"
    req = urllib.request.Request(url, headers={ 'Authorization': f'Bearer {tok}', 'ConsistencyLevel': 'eventual', 'X-AnchorMailbox': creds.get('mailbox') or '' })
    try:
        ctx = ssl.create_default_context()
        with urllib.request.urlopen(req, context=ctx, timeout=30) as resp:
            data = json.loads(resp.read().decode('utf-8'))
            items = data.get('value') or []
            if items:
                return items[0].get('webLink')
    except Exception:
        return None
    return None


def _graph_download_message_raw(creds: dict, message_id: str, mailbox: Optional[str] = None) -> Optional[bytes]:
    mailbox = mailbox or creds.get("mailbox")
    if not mailbox:
        return None
    token = _graph_token(creds)
    if not token:
        return None
    endpoint = creds.get("endpoint") or "https://graph.microsoft.com/v1.0"
    url = (
        f"{endpoint.rstrip('/')}/users/{urllib.parse.quote(mailbox)}/messages/"
        f"{urllib.parse.quote(message_id)}/$value"
    )
    req = urllib.request.Request(url, headers={"Authorization": f"Bearer {token}"}, method="GET")
    ctx = ssl.create_default_context()
    try:
        with urllib.request.urlopen(req, context=ctx, timeout=30) as resp:
            return resp.read()
    except Exception:
        return None


@app.get("/api/outlook/latest_link")
async def outlook_latest_link(email: str):
    creds = _graph_app_creds()
    if not creds:
        raise HTTPException(status_code=500, detail="Graph credentials not configured")
    wl = _graph_latest_weblink_for_address(creds, email)
    if not wl:
        raise HTTPException(status_code=404, detail="No messages found")
    return {"webLink": wl}


def _graph_message_weblink(creds: dict, message_id: str) -> Optional[str]:
    tok = _graph_token(creds)
    if not tok or not message_id:
        return None
    mailbox = urllib.parse.quote(creds.get("mailbox") or "", safe="")
    mid = urllib.parse.quote(message_id, safe="")
    url = f"{creds['endpoint'].rstrip('/')}/users/{mailbox}/messages/{mid}?$select=webLink"
    req = urllib.request.Request(url, headers={"Authorization": f"Bearer {tok}"}, method="GET")
    ctx = ssl.create_default_context()
    try:
        with urllib.request.urlopen(req, context=ctx, timeout=30) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            wl = data.get("webLink")
            return wl
    except Exception:
        return None


@app.get("/email/outlook_link")
async def email_outlook_link(id: Optional[str] = None):
    if not id:
        raise HTTPException(status_code=400, detail="id required")
    record = _db_get_message_by_id(id)
    link = (record or {}).get("outlook_link") or ""
    if not link:
        creds = _graph_app_creds()
        if not creds:
            raise HTTPException(status_code=500, detail="Graph credentials not configured")
        link = _graph_message_weblink(creds, id) or ""
        if link:
            _db_update_message_paths(id, outlook_link=link)
    if not link:
        raise HTTPException(status_code=404, detail="Outlook link unavailable")
    return {"webLink": link}


@app.get("/sp/check")
async def sp_check(ensure_base: bool = False):
    """Verify SharePoint connectivity: site, drive, and base folder.
    Optionally create the base folder when missing.
    """
    creds = _graph_app_creds()
    if not creds:
        raise HTTPException(status_code=500, detail="Graph credentials not configured")
    tok = _graph_token(creds)
    if not tok:
        raise HTTPException(status_code=500, detail="Graph auth failed")
    site = _graph_sharepoint_site(creds)
    ok_site = bool(site and site.get("id"))
    drive_id = _graph_sharepoint_drive(creds, site.get("id")) if ok_site else None
    ok_drive = bool(drive_id)
    base = os.environ.get("SP_DOC_BASE") or "לקוחות משרד"
    H = {"Authorization": f"Bearer {tok}"}
    ok_base = False
    base_url = None
    if ok_drive:
        base_url = f"{creds['endpoint'].rstrip('/')}/drives/{drive_id}/root:/{urllib.parse.quote(base, safe='')}:"
        try:
            _http_get(base_url, H)
            ok_base = True
        except Exception:
            if ensure_base:
                try:
                    _http_put_json(base_url, {"folder": {}, "@microsoft.graph.conflictBehavior": "fail"}, H)
                    ok_base = True
                except Exception:
                    ok_base = False
    return {
        "site": ok_site,
        "drive": ok_drive,
        "base": ok_base,
        "drive_id": drive_id,
        "base_folder": base,
    }


@app.post("/sp/folder_create")
async def sp_folder_create(payload: dict = Body(default=None)):
    name = (payload or {}).get("name")
    if not name:
        raise HTTPException(status_code=400, detail="name required")
    creds = _graph_app_creds()
    if not creds:
        raise HTTPException(status_code=500, detail="Graph credentials not configured")
    base = os.environ.get("SP_DOC_BASE") or "לקוחות משרד"
    try:
        res = _graph_sharepoint_ensure_client_folder(creds, base, name)
        item = res.get("item") or {}
        return {
            "created": bool(res.get("created")),
            "id": item.get("id"),
            "name": item.get("name"),
            "webUrl": item.get("webUrl"),
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/sp/task_folder_ensure")
async def sp_task_folder_ensure(payload: dict = Body(default=None)):
    client_name = (payload or {}).get("client_name") or ""
    task_id = (payload or {}).get("task_id") or ""
    if not client_name or not task_id:
        raise HTTPException(status_code=400, detail="client_name and task_id required")
    creds = _graph_app_creds()
    if not creds:
        raise HTTPException(status_code=500, detail="Graph credentials not configured")
    drive_id, base = _graph_sharepoint_get_drive_and_base(creds)
    if not drive_id:
        raise HTTPException(status_code=500, detail="Drive not found")
    # Ensure client and task folder: <base>/<client>/Tasks/<task_id>
    rel = f"{base}/{client_name}/Tasks/{task_id}"
    _graph_sharepoint_ensure_client_folder(creds, base, client_name)
    _graph_sharepoint_ensure_path(creds, f"{base}/{client_name}/Tasks")
    _graph_sharepoint_ensure_path(creds, rel)
    tok = _graph_token(creds)
    H = {"Authorization": f"Bearer {tok}"}
    url = f"{creds['endpoint'].rstrip('/')}/drives/{drive_id}/root:/{urllib.parse.quote(rel, safe='')}:"
    info = _http_get(url, H)
    return {"ok": True, "webUrl": info.get("webUrl"), "path": rel}


@app.post("/sp/task_upload")
async def sp_task_upload(client_name: str = Form(...), task_id: str = Form(...), file: UploadFile = File(...)):
    creds = _graph_app_creds()
    if not creds:
        raise HTTPException(status_code=500, detail="Graph credentials not configured")
    drive_id, base = _graph_sharepoint_get_drive_and_base(creds)
    if not drive_id:
        raise HTTPException(status_code=500, detail="Drive not found")
    # Ensure folder
    rel = f"{base}/{client_name}/Tasks/{task_id}"
    _graph_sharepoint_ensure_client_folder(creds, base, client_name)
    _graph_sharepoint_ensure_path(creds, f"{base}/{client_name}/Tasks")
    _graph_sharepoint_ensure_path(creds, rel)
    # Upload
    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="empty file")
    fname = file.filename or "upload.bin"
    path = f"{rel}/{fname}"
    tok = _graph_token(creds)
    if not tok:
        raise HTTPException(status_code=500, detail="Graph auth failed")
    url = f"{creds['endpoint'].rstrip('/')}/drives/{drive_id}/root:/{urllib.parse.quote(path, safe='') }:/content"
    up = _http_put_bytes(url, content, {"Authorization": f"Bearer {tok}"})
    return {"ok": True, "name": fname, "webUrl": up.get("webUrl") or up.get("parentReference", {}).get("path"), "path": path}


@app.post("/airtable/contacts_upsert")
async def airtable_contacts_upsert(payload: dict = Body(default=None)):
    cfg = _airtable_conf()
    if not cfg or not cfg.get("token") or not cfg.get("base"):
        raise HTTPException(status_code=500, detail="Airtable not configured")
    name = (payload or {}).get("client_name") or (payload or {}).get("name")
    contacts = (payload or {}).get("contacts") or []
    if not name or not contacts:
        raise HTTPException(status_code=400, detail="client_name and contacts required")
    base = cfg["base"]; tok = cfg["token"]; clients_tbl = cfg["clients_table"]; contacts_tbl = cfg["contacts_table"]
    client_id = _airtable_find_client(base, tok, clients_tbl, name)
    if not client_id:
        rid = (_airtable_create(base, clients_tbl, tok, _airtable_client_fields(name, contacts[0].get("email", ""))).get("records") or [{}])[0].get("id")
        client_id = rid
    fmap = _airtable_discover_contact_fields(base, tok, contacts_tbl)
    fmap = _airtable_discover_contact_fields_extras(base, tok, contacts_tbl, fmap)
    out_ids = []
    for ct in contacts:
        email = ct.get("email") or ""
        # Try find contact by email; if schema unknown, just create
        rec_id = None
        if fmap.get("email") and email:
            try:
                data = _airtable_list_v2(base, contacts_tbl, tok, {"maxRecords": 1, "filterByFormula": f"{{{fmap['email']}}}='{email}'"})
                recs = data.get("records", [])
                if recs:
                    rec_id = recs[0].get("id")
            except Exception:
                rec_id = None
        fields = _airtable_build_contact_fields_ext(
            fmap,
            ct.get("name") or "",
            email,
            ct.get("phone") or "",
            ct.get("role") or "",
            client_id,
            desc=ct.get("desc") or ct.get("role_desc") or "",
            address=ct.get("address") or "",
            id_number=ct.get("id_number") or ct.get("national_id") or "",
        )
        if rec_id:
            _airtable_update(base, contacts_tbl, tok, rec_id, fields)
            out_ids.append(rec_id)
        else:
            rid = (_airtable_create(base, contacts_tbl, tok, fields).get("records") or [{}])[0].get("id")
            out_ids.append(rid)
    return {"client_id": client_id, "contact_ids": out_ids}

@app.get("/graph/check")
async def graph_check():
    ready = _graph_acquire_silent()
    return {"ready": bool(ready)}


@app.post("/graph/device_start")
async def graph_device_start():
    if msal is None:
        raise HTTPException(status_code=500, detail="msal not installed")
    appm = _msal_app()
    if not appm:
        raise HTTPException(status_code=500, detail="Graph client_id/tenant_id missing")
    try:
        flow = appm.initiate_device_flow(scopes=_GRAPH_SCOPES)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"device flow init failed: {e}")
    # Start background poller
    th = threading.Thread(target=_graph_acquire_by_device_flow_background, args=(flow,), daemon=True)
    th.start()
    return {
        "user_code": flow.get("user_code"),
        "verification_uri": flow.get("verification_uri"),
        "message": flow.get("message"),
        "expires_in": flow.get("expires_in"),
        "interval": flow.get("interval"),
    }


@app.get("/graph/list")
async def graph_list(email: str, since: Optional[str] = None, top: int = 10):
    tok = _graph_get_delegated_token()
    if not tok:
        raise HTTPException(status_code=401, detail="Graph not authorized (device flow)")
    # Build AQS query
    q_parts = [f"participants:{email}"]
    if since:
        q_parts.append(f"received>={since}")
    q = ' AND '.join(q_parts)
    q_enc = urllib.parse.quote(f'"{q}"')
    url = f"https://graph.microsoft.com/v1.0/me/messages?$top={int(top)}&$select=webLink,subject,receivedDateTime,from,toRecipients&$search={q_enc}"
    req = urllib.request.Request(url, headers={
        'Authorization': f'Bearer {tok}',
        'ConsistencyLevel': 'eventual'
    })
    try:
        ctx = ssl.create_default_context()
        with urllib.request.urlopen(req, context=ctx, timeout=30) as resp:
            data = json.loads(resp.read().decode('utf-8'))
            return {"value": data.get("value", [])}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


def _client_folder_context(name: str) -> Tuple[str, str, Optional[str]]:
    reg = _load_clients_registry() or {}
    entry = None
    for c in reg.get("clients", []):
        nm = c.get("display_name") or c.get("name") or c.get("slug")
        if nm == name:
            entry = c
            break
        folder = c.get("folder")
        if folder:
            try:
                if Path(folder).name == name:
                    entry = c
                    break
            except Exception:
                continue
    client_seg = name
    folder_path = None
    rel_base = os.environ.get("SP_DOC_BASE")
    if entry:
        folder_path = entry.get("folder") or None
        if folder_path:
            try:
                seg = Path(folder_path).name
                if seg:
                    client_seg = seg
            except Exception:
                pass
    if not rel_base and folder_path:
        try:
            parent = Path(folder_path).parent
            if parent.name:
                rel_base = parent.name
        except Exception:
            pass
    if not rel_base:
        rel_base = "לקוחות משרד"
    return client_seg, rel_base, folder_path


@app.get("/api/client/sharepoint_link")
async def client_sharepoint_link(name: Optional[str] = None):
    if not name:
        raise HTTPException(status_code=400, detail="name required")
    client_seg, rel_base, _ = _client_folder_context(name)

    creds = _graph_app_creds()
    if not creds:
        raise HTTPException(status_code=500, detail="Graph credentials not configured")
    item = _graph_sharepoint_client_item(creds, rel_base, client_seg)
    if not item or not item.get("webUrl"):
        raise HTTPException(status_code=404, detail="SharePoint folder not found")
    return {"webUrl": item["webUrl"]}


@app.post("/dev/open_folder")
async def dev_open_folder(name: str | None = None, payload: dict = Body(default=None)):
    if os.name != "nt" and not os.environ.get("DEV_ENABLE_OPEN"):
        raise HTTPException(status_code=403, detail="desktop open not supported")
    if not name and isinstance(payload, dict):
        name = payload.get("name")
    if not name:
        raise HTTPException(status_code=400, detail="name required")
    client_seg, rel_base, folder_path = _client_folder_context(name)
    sb = _store_base()
    if not sb:
        raise HTTPException(status_code=400, detail="store_base not found")
    target = folder_path
    if not target:
        target = str(Path(sb) / client_seg)
    if not target or not Path(target).exists():
        raise HTTPException(status_code=404, detail="folder not found")
    p = Path(target).resolve()
    # Constrain to store_base
    try:
        if not str(p).lower().startswith(str(sb.resolve()).lower()):
            raise HTTPException(status_code=400, detail="invalid path")
    except Exception:
        raise HTTPException(status_code=400, detail="invalid path")
    try:
        os.startfile(str(p))  # Windows only
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    web_url = ""
    try:
        creds = _graph_app_creds()
        if creds:
            item = _graph_sharepoint_client_item(creds, rel_base, client_seg)
            if item and item.get("webUrl"):
                web_url = item["webUrl"]
    except Exception:
        web_url = ""
    resp = {"ok": True, "path": str(p)}
    if web_url:
        resp["webUrl"] = web_url
    return resp


@app.post("/dev/open_outlook_app")
async def dev_open_outlook_app(payload: dict = Body(default=None)):
    """Launch an Edge app-window for Outlook OWA (local-only convenience).
    Requires DEV_DESKTOP_ENABLE or DEV_ENABLE_OPEN.
    Body (optional): { url: string }
    """
    if not (os.environ.get("DEV_DESKTOP_ENABLE") or os.environ.get("DEV_ENABLE_OPEN")):
        raise HTTPException(status_code=403, detail="disabled")
    realm = 'eislaw.co.il'
    url = (payload or {}).get('url') or f"https://outlook.office.com/owa/?realm={urllib.parse.quote(realm)}&exsvurl=1"
    started = _launch_outlook_app(url)
    if not started:
        raise HTTPException(status_code=500, detail="could not start edge/app window")
    return {"ok": True}

@app.get("/api/client/locations")
async def client_locations(name: str):
    """Return both the local folder (if known) and SharePoint webUrl for a client.
    Works for both local and cloud — caller chooses how to open.
    """
    # local folder from registry
    local_folder = None
    reg = _load_clients_registry() or {}
    for c in reg.get("clients", []):
        nm = c.get("display_name") or c.get("name") or c.get("slug")
        if nm == name or (c.get("folder") and Path(c["folder"]).name == name):
            local_folder = c.get("folder")
            break
    # Fallback from store_base
    if not local_folder:
        sb = _store_base()
        if sb:
            candidate = Path(sb) / name
            if candidate.exists():
                local_folder = str(candidate)

    # SharePoint link via Graph
    sp_url = None
    try:
        creds = _graph_app_creds()
        if creds:
            seg = Path(local_folder).name if local_folder else name
            rel_base = os.environ.get("SP_DOC_BASE") or "לקוחות משרד"
            item = _graph_sharepoint_client_item(creds, rel_base, seg)
            sp_url = item.get("webUrl") if item else None
    except Exception:
        pass

    return {"localFolder": local_folder, "sharepointUrl": sp_url}


def _dev_allowed() -> bool:
    return bool(os.environ.get("DEV_DESKTOP_ENABLE") or os.environ.get("DEV_ENABLE_OPEN"))


@app.post("/dev/desktop/pick_file")
async def dev_desktop_pick_file(payload: dict = Body(default=None)):
    """Open a native file selection dialog (filtered to templates) and return the chosen path.
    Enabled only when DEV_DESKTOP_ENABLE/DEV_ENABLE_OPEN is set.
    Payload (optional): { "initialdir": "<path>" } to set the starting folder.
    """
    if not _dev_allowed():
        raise HTTPException(status_code=403, detail="disabled")
    initialdir = None
    if isinstance(payload, dict):
        initialdir = payload.get("initialdir")
    try:
        import tkinter  # type: ignore
        from tkinter import filedialog  # type: ignore
        root = tkinter.Tk()
        root.withdraw()
        try:
            root.attributes('-topmost', True)
        except Exception:
            pass
        path = filedialog.askopenfilename(
            title="Select a template file",
            initialdir=initialdir or "",
            filetypes=[("Templates", "*.dotx *.docx"), ("All files", "*.*")]
        )
        try:
            root.destroy()
        except Exception:
            pass
        return {"path": path or None}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/dev/desktop/open_path")
async def dev_desktop_open_path(payload: dict = Body(default=None)):
    if not _dev_allowed():
        raise HTTPException(status_code=403, detail="disabled")
    path = (payload or {}).get("path")
    if not path:
        raise HTTPException(status_code=400, detail="path required")
    try:
        os.startfile(path)
        return {"ok": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/dev/desktop/open_url")
async def dev_desktop_open_url(payload: dict = Body(default=None)):
    if not _dev_allowed():
        raise HTTPException(status_code=403, detail="disabled")
    url = (payload or {}).get("url")
    if not url:
        raise HTTPException(status_code=400, detail="url required")
    try:
        if os.name == "nt":
            os.startfile(url)
        else:
            subprocess.Popen(["xdg-open", url])
        return {"ok": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/dev/desktop/playwright_probe")
async def dev_desktop_playwright_probe(payload: dict = Body(default=None)):
    if not _dev_allowed():
        raise HTTPException(status_code=403, detail="disabled")
    url = (payload or {}).get("url") or "http://127.0.0.1:4173/#/"
    script = str(Path(__file__).resolve().parents[1] / "tools" / "playwright_probe.mjs")
    try:
        out = subprocess.check_output(["node", script, url], stderr=subprocess.STDOUT, timeout=30)
        try:
            return json.loads(out.decode("utf-8", errors="ignore"))
        except Exception:
            return {"raw": out.decode("utf-8", errors="ignore")}
    except subprocess.CalledProcessError as e:
        raise HTTPException(status_code=500, detail=e.output.decode("utf-8", errors="ignore"))




# ===== Privacy (Fillout-driven Phase 1) =====

def _repo_root() -> Path:
    return Path(__file__).resolve().parents[1]


def _load_secrets() -> dict:
    """Load secrets from repo file; fall back to environment variables in cloud.

    Env fallback keys (when secrets.local.json is absent):
      FILLOUT_API_KEY
      AIRTABLE_TOKEN, AIRTABLE_BASE_ID, AIRTABLE_TABLE_ID, AIRTABLE_VIEW (optional)
      GRAPH_CLIENT_ID, GRAPH_CLIENT_SECRET, GRAPH_TENANT_ID, GRAPH_ENDPOINT, GRAPH_MAILBOX
    """
    try:
        p = _repo_root() / "secrets.local.json"
        return json.loads(p.read_text(encoding="utf-8"))
    except Exception:
        pass
    # Build from environment
    env = os.environ
    out = {
        "fillout": {
            "api_key": env.get("FILLOUT_API_KEY", "").strip(),
        },
        "airtable": {
            "token": env.get("AIRTABLE_TOKEN", "").strip(),
            "base_id": env.get("AIRTABLE_BASE_ID", "").strip(),
            "table_id": env.get("AIRTABLE_TABLE_ID", "").strip(),
            "view": env.get("AIRTABLE_VIEW", "").strip() or None,
        },
        "microsoft_graph": {
            "client_id": env.get("GRAPH_CLIENT_ID", "").strip(),
            "client_secret": env.get("GRAPH_CLIENT_SECRET", "").strip(),
            "tenant_id": env.get("GRAPH_TENANT_ID", "").strip(),
            "endpoint": env.get("GRAPH_ENDPOINT", "https://graph.microsoft.com/v1.0").strip(),
            "mailbox": env.get("GRAPH_MAILBOX", "").strip() or "eitan@eislaw.co.il",
        },
    }
    return out


def _http_get_json(url: str, headers: Optional[dict] = None, timeout: int = 30) -> dict:
    req = urllib.request.Request(url, headers=headers or {})
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        data = resp.read()
    return json.loads(data.decode("utf-8"))


def _http_post_json(url: str, body: dict, headers: Optional[dict] = None, timeout: int = 30) -> dict:
    data = json.dumps(body, ensure_ascii=False).encode("utf-8")
    hs = dict(headers or {})
    hs.setdefault("Content-Type", "application/json")
    req = urllib.request.Request(url, data=data, headers=hs, method="POST")
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        raw = resp.read()
        status = getattr(resp, 'status', None)
    try:
        return json.loads(raw.decode("utf-8"))
    except Exception:
        return {"status": status, "raw": raw.decode("utf-8", errors="replace")}


def _fillout_list_submissions(api_key: str, form_id: str, limit: int = 10) -> dict:
    base = f"https://api.fillout.com/v1/api/forms/{form_id}/submissions?limit={int(limit)}"
    return _http_get_json(base, headers={"Authorization": f"Bearer {api_key}"})


def _load_mapping() -> dict:
    try:
        p = _repo_root() / "docs" / "fillout_field_mapping.json"
        return json.loads(p.read_text(encoding="utf-8"))
    except Exception:
        return {}


def _hebrew_bool(val):
    if isinstance(val, str):
        s = val.strip()
        if s in {"כן", "כן.", "Yes", "yes", "TRUE", "true"}:
            return True
        if s in {"לא", "No", "no", "FALSE", "false"}:
            return False
    return val


def _map_submission(sub: dict, mapping: dict) -> dict:
    answers = {}
    q_by_id = {q.get("id"): q for q in sub.get("questions", [])}
    q_by_name = {q.get("name"): q for q in sub.get("questions", [])}
    url_params = {p.get("name"): p.get("value") for p in sub.get("urlParameters", [])}
    url_fallback = {
        "contact_email": "email",
        "contact_phone": "phone",
        "contact_name": "name",
        "business_name": "business_name",
    }
    for target, spec in (mapping or {}).items():
        val = None
        if isinstance(spec, dict):
            if "id" in spec and spec["id"] in q_by_id:
                val = q_by_id[spec["id"].strip()].get("value")
            elif "name" in spec and spec["name"] in q_by_name:
                val = q_by_name[spec["name"].strip()].get("value")
            elif "name_contains" in spec:
                for nm, q in q_by_name.items():
                    if spec["name_contains"] in (nm or ""):
                        val = q.get("value")
                        break
        if val is None:
            up = url_fallback.get(target)
            if up and up in url_params:
                val = url_params.get(up)
        if val is not None:
            if isinstance(val, str):
                val = _hebrew_bool(val)
            answers[target] = val
    return answers


def _label_map() -> dict:
    return {
        # identity
        "contact_name": "שם ממלא הטופס",
        "business_name": "שם העסק",
        "contact_email": "דוא" + '"' + "ל",
        "contact_phone": "טלפון נייד",
        "submitted_at": "זמן שליחה",
        "submission_id": "מזהה הגשה",
        "form_id": "מזהה טופס",
        # scoring inputs
        "owners": "מספר בעלי העסק",
        "access": "מספר מורשי גישה",
        "ethics": "סודיות מקצועית/אתית",
        "ppl": "מספר נושאי מידע במאגר",
        "sensitive": "מידע בעל רגישות מיוחדת",
        "sensitive_people": "מספר נושאי מידע רגיש",
        "sensitive_types": "סוגי מידע רגיש",
        "biometric_100k": "מידע ביומטרי (≥100K)",
        "transfer": "העברת נתונים לאחרים בתמורה",
        "directmail_biz": "שיווק ישיר עבור אחרים",
        "directmail_self": "שיווק ישיר עבור העסק",
        "monitor_1000": "ניטור ≥ 1,000 אנשים",
        "processor": "מעבד מידע (Processor)",
        "processor_large_org": "Processor לגוף גדול/רגיש",
        "employees_exposed": "עובדים חשופים למידע אישי",
        "cameras": "מצלמות מעקב",
    }


def _level_label(level: Optional[str]) -> str:
    if level == "lone":
        return "מאגר מנוהל בידי יחיד"
    if level == "basic":
        return "בסיסית"
    if level == "mid":
        return "ביניים"
    if level == "high":
        return "גבוהה"
    return level or ""


@app.get("/privacy/labels")
async def privacy_labels():
    return {"labels": _label_map()}


@app.get("/privacy/submissions")
async def privacy_submissions(form_id: str, limit: int = 10):
    secrets = _load_secrets()
    api_key = ((secrets.get("fillout") or {}).get("api_key") or "").strip()
    if not api_key:
        raise HTTPException(status_code=500, detail="Missing Fillout API key")
    try:
        subs = _fillout_list_submissions(api_key, form_id, max(1, min(limit, 50)))
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Fillout error: {e}")
    mapping = _load_mapping()
    rules = load_rules()
    items = []
    for sub in subs.get("responses", [])[:limit]:
        answers_raw = _map_submission(sub, mapping)
        ans = coerce_inputs(answers_raw)
        score = evaluate(rules, ans)
        items.append({
            "submission_id": sub.get("submissionId"),
            "submitted_at": sub.get("submissionTime"),
            "contact_name": ans.get("contact_name"),
            "contact_email": ans.get("contact_email"),
            "contact_phone": ans.get("contact_phone"),
            "business_name": ans.get("business_name"),
            "level": score.get("level"),
            "level_label": _level_label(score.get("level")),
            "dpo": bool(score.get("dpo")),
            "reg": bool(score.get("reg")),
            "report": bool(score.get("report")),
            "requirements_count": len(score.get("requirements") or []),
            "status": None,
        })
    return {
        "items": items,
        "totalResponses": subs.get("totalResponses"),
        "pageCount": subs.get("pageCount"),
    }


@app.get("/privacy/submissions/{submission_id}")
async def privacy_submission_detail(submission_id: str, form_id: str):
    secrets = _load_secrets()
    api_key = ((secrets.get("fillout") or {}).get("api_key") or "").strip()
    if not api_key:
        raise HTTPException(status_code=500, detail="Missing Fillout API key")
    subs = _fillout_list_submissions(api_key, form_id, limit=50)
    hit = next((r for r in subs.get("responses", []) if r.get("submissionId") == submission_id), None)
    if not hit:
        raise HTTPException(status_code=404, detail="submission not found")
    mapping = _load_mapping()
    answers_raw = _map_submission(hit, mapping)
    ans = coerce_inputs(answers_raw)
    score = evaluate(load_rules(), ans)
    return {
        "submission_id": hit.get("submissionId"),
        "submitted_at": hit.get("submissionTime"),
        "answers": ans,
        "labels": _label_map(),
        "score": score,
        "level_label": _level_label(score.get("level")),
    }


def _render_email_from_template(ctx: dict) -> dict:
    """Render subject/body from docs/PrivacyExpress/ResultTexts/email_to_client.md.
    Supports {{vars}} and {{#if path}} ... {{/if}} for booleans under ctx.
    """
    p = _repo_root() / "docs" / "PrivacyExpress" / "ResultTexts" / "email_to_client.md"
    raw = p.read_text(encoding="utf-8")
    lines = raw.splitlines()
    subject = ""
    body = raw
    if lines and lines[0].startswith("[EMAIL_SUBJECT]:"):
        subject = lines[0].split(":", 1)[1].strip()
        body = "\n".join(lines[1:])

    def get_path(d: dict, path: str):
        cur = d
        for part in path.split('.'):
            if isinstance(cur, dict) and part in cur:
                cur = cur[part]
            else:
                return None
        return cur

    # Handle conditionals {{#if a.b}} ... {{/if}}
    import re
    def render_conditionals(text: str) -> str:
        pattern = re.compile(r"\{\{#if\s+([a-zA-Z0-9_\.]+)\}\}(.*?)\{\{\/if\}\}", re.S)
        def repl(m):
            key = m.group(1)
            inner = m.group(2)
            val = get_path(ctx, key)
            return inner if val else ""
        return pattern.sub(repl, text)

    def render_vars(text: str) -> str:
        pattern = re.compile(r"\{\{\s*([a-zA-Z0-9_\.]+)\s*\}\}")
        def repl(m):
            key = m.group(1)
            val = get_path(ctx, key)
            return str(val) if val is not None else ""
        return pattern.sub(repl, text)

    subject = render_vars(render_conditionals(subject))
    body = render_vars(render_conditionals(body))
    return {"subject": subject, "body": body}


@app.post("/privacy/preview_email")
async def privacy_preview_email(payload: dict = Body(default=None)):
    if not isinstance(payload, dict):
        raise HTTPException(status_code=400, detail="invalid body")
    # Expect { contact_name, business_name, score: {level,dpo,reg,report}, selected_modules: [] }
    score = payload.get("score") or {}
    selected = payload.get("selected_modules") or []
    ctx = {
        "contact_name": payload.get("contact_name"),
        "business_name": payload.get("business_name"),
        "report_url": payload.get("report_url") or "",
        "level_label": _level_label(score.get("level")),
        "score": {
            "level": score.get("level"),
            "dpo": bool(score.get("dpo")),
            "reg": bool(score.get("reg")),
            "report": bool(score.get("report")),
        },
        "selected_modules_list": ", ".join(selected),
    }
    return _render_email_from_template(ctx)


def _airtable_cfg_optional():
    try:
        from tools.airtable_utils import get_cfg
    except Exception:
        return None
    try:
        return get_cfg(_load_secrets())
    except Exception:
        return None


def _airtable_upsert_submission(fields: dict) -> dict:
    try:
        from tools.airtable_utils import upsert_security_submission
        cfg = _airtable_cfg_optional()
        if not cfg:
            return {"ok": False, "reason": "no_cfg"}
        r = upsert_security_submission(cfg, fields)
        return {"ok": True, "result": r}
    except Exception as e:
        return {"ok": False, "error": str(e)}


def _airtable_create_local(table: str, fields: dict) -> dict:
    try:
        from tools.airtable_utils import get_cfg, create_record
        cfg = get_cfg(_load_secrets())
        r = create_record(cfg["token"], cfg["base_id"], table, fields)
        return {"ok": True, "result": r}
    except Exception as e:
        return {"ok": False, "error": str(e)}


def _airtable_list(table: str, params: dict) -> dict:
    # Simple GET wrapper for Airtable list with query params
    try:
        cfg = _airtable_cfg_optional()
        if not cfg:
            return {"ok": False, "reason": "no_cfg"}
        base_id = cfg["base_id"]
        table_id = table
        q = dict(params or {})
        # include view from config unless caller overrides
        if cfg.get("view") and not q.get("view"):
            q["view"] = cfg["view"]
        qp = urllib.parse.urlencode(q, doseq=True, safe="(){}[]=,' :")
        url = f"https://api.airtable.com/v0/{urllib.parse.quote(base_id)}/{urllib.parse.quote(table_id)}?{qp}"
        out = _http_get_json(url, headers={"Authorization": f"Bearer {cfg['token']}"})
        out["ok"] = True
        return out
    except Exception as e:
        return {"ok": False, "error": str(e)}


def _set_from_score(score: dict) -> set:
    s = set()
    lvl = (score or {}).get("level")
    if lvl:
        s.add(f"level_{lvl}")
    if score.get("dpo"): s.add("DPO")
    if score.get("reg"): s.add("Registration")
    if score.get("report"): s.add("Report")
    for r in (score.get("requirements") or []):
        s.add(r)
    return s


@app.post("/privacy/save_review")
async def privacy_save_review(payload: dict = Body(default=None)):
    if not isinstance(payload, dict):
        raise HTTPException(status_code=400, detail="invalid body")
    submission_id = (payload.get("submission_id") or "").strip()
    form_id = (payload.get("form_id") or "").strip()
    if not submission_id or not form_id:
        raise HTTPException(status_code=400, detail="submission_id and form_id required")
    selected = set(payload.get("selected_modules") or [])
    selected_level = (payload.get("selected_level") or "").strip() or None
    if selected_level:
        # ensure selected modules contains the chosen level module
        selected.add(f"level_{selected_level}")
    status = payload.get("status") or None
    reviewer = payload.get("reviewer") or os.environ.get("REVIEWER_NAME") or "reviewer"
    override_reason = payload.get("override_reason") or ""
    per_change_notes = payload.get("per_change_notes") or {}

    # Fetch submission detail to compute auto selection
    secrets = _load_secrets()
    api_key = ((secrets.get("fillout") or {}).get("api_key") or "").strip()
    subs = _fillout_list_submissions(api_key, form_id, limit=50)
    hit = next((r for r in subs.get("responses", []) if r.get("submissionId") == submission_id), None)
    if not hit:
        raise HTTPException(status_code=404, detail="submission not found")
    answers_raw = _map_submission(hit, _load_mapping())
    ans = coerce_inputs(answers_raw)
    score = evaluate(load_rules(), ans)
    auto = _set_from_score(score)

    added = sorted(list(selected - auto))
    removed = sorted(list(auto - selected))
    is_correct_auto = (selected == auto)
    auto_level = (score or {}).get("level")
    level_overridden = (selected_level is not None and selected_level != auto_level)

    now_iso = datetime.datetime.utcnow().replace(microsecond=0).isoformat() + "Z"
    fields = {
        "submission_id": submission_id,
        "form_id": form_id,
        "submitted_at": hit.get("submissionTime"),
        "email": ans.get("contact_email"),
        "contact_name": ans.get("contact_name"),
        "contact_phone": ans.get("contact_phone"),
        "business_name": ans.get("business_name"),
        "status": status or "in_review",
        "reviewer": reviewer,
        "reviewed_at": now_iso,
        "auto_selected_modules": sorted(list(auto)),
        "selected_modules": sorted(list(selected)),
        "auto_level": auto_level,
        "selected_level": selected_level or auto_level,
        "level_overridden": bool(level_overridden),
        "overrides_added": added,
        "overrides_removed": removed,
        "overrides_diff_json": json.dumps({"auto": sorted(list(auto)), "selected": sorted(list(selected)), "added": added, "removed": removed}, ensure_ascii=False),
        "override_reason": override_reason,
        "score_level": score.get("level"),
        "score_reg": bool(score.get("reg")),
        "score_report": bool(score.get("report")),
        "score_dpo": bool(score.get("dpo")),
        "score_requirements": list(score.get("requirements") or []),
        "is_correct_auto": is_correct_auto,
    }
    at_res = _airtable_upsert_submission(fields)

    # Audit rows for each change
    for mod in added + removed:
        _airtable_create_local("Review_Audit", {
            "submission_id": submission_id,
            "module": mod,
            "from": mod not in added,  # False if added; True if removed (was auto)
            "to": mod in added,        # True if added; False if removed
            "reviewer": reviewer,
            "timestamp": now_iso,
            "note": (per_change_notes or {}).get(mod) or "",
        })

    return {
        "ok": True,
        "auto": sorted(list(auto)),
        "selected": sorted(list(selected)),
        "added": added,
        "removed": removed,
        "airtable": at_res,
    }


@app.get("/privacy/metrics")
async def privacy_metrics(window: int = Query(10, ge=1, le=200)):
    cfg = _airtable_cfg_optional()
    if not cfg:
        return {"ok": False, "reason": "no_airtable"}
    # last N reviewed
    params = {
        "filterByFormula": "NOT({reviewed_at} = BLANK())",
        "sort[0][field]": "reviewed_at",
        "sort[0][direction]": "desc",
        "maxRecords": str(window),
    }
    last = _airtable_list(cfg["table_id"], params)
    last_items = (last.get("records") or []) if last.get("ok") else []
    def rec_ok(rec):
        f = rec.get("fields", {})
        val = f.get("is_correct_reviewed")
        if val is None:
            val = f.get("is_correct_auto")
        return bool(val)
    acc_last = sum(1 for r in last_items if rec_ok(r)) / max(1, len(last_items))

    # overall (pull up to 1000)
    params2 = {"filterByFormula": "NOT({reviewed_at} = BLANK())", "pageSize": "100"}
    all_ok = 0; all_total = 0; offset = None; loop = 0
    while True:
        q = dict(params2)
        if offset: q["offset"] = offset
        page = _airtable_list(cfg["table_id"], q)
        if not page.get("ok"): break
        recs = page.get("records") or []
        for r in recs:
            all_total += 1
            if rec_ok(r): all_ok += 1
        offset = page.get("offset")
        loop += 1
        if not offset or loop > 50: break

    # top changed modules
    freq = {}
    for r in last_items:
        f = r.get("fields", {})
        for k in (f.get("overrides_added") or []): freq[k] = freq.get(k, 0) + 1
        for k in (f.get("overrides_removed") or []): freq[k] = freq.get(k, 0) + 1
    top = sorted(freq.items(), key=lambda x: x[1], reverse=True)[:5]

    return {
        "ok": True,
        "accuracy_overall": (all_ok / max(1, all_total)) if all_total else None,
        "accuracy_lastN": acc_last,
        "window": window,
        "total_reviewed": all_total,
        "overrides_rate_lastN": (sum(v for _, v in freq.items()) / max(1, len(last_items))) if last_items else 0,
        "top_changed_modules": top,
    }


# ====== Approve & Publish + tokenized report ======

def _sha256(s: str) -> str:
    return hashlib.sha256(s.encode("utf-8")).hexdigest()


def _airtable_update_fields_by_submission(submission_id: str, fields: dict) -> dict:
    try:
        from tools.airtable_utils import get_cfg, find_by_submission_id, update_record
        cfg = get_cfg(_load_secrets())
        cur = find_by_submission_id(cfg["token"], cfg["base_id"], cfg["table_id"], submission_id)
        if not cur:
            return {"ok": False, "error": "submission not found in airtable"}
        rec_id = cur.get("id")
        out = update_record(cfg["token"], cfg["base_id"], cfg["table_id"], rec_id, fields)
        return {"ok": True, "result": out}
    except Exception as e:
        return {"ok": False, "error": str(e)}


def _airtable_find_by_hash(field: str, hash_val: str) -> dict | None:
    cfg = _airtable_cfg_optional()
    if not cfg:
        return None
    formula = f"{{{field}}} = '{hash_val}'"
    out = _airtable_list(cfg["table_id"], {"filterByFormula": formula, "maxRecords": "1"})
    if not out.get("ok"):
        return None
    recs = out.get("records") or []
    return recs[0] if recs else None


def _local_token_store_path() -> Path:
    p = _repo_root() / "build" / "report_tokens_local.json"
    p.parent.mkdir(parents=True, exist_ok=True)
    return p


def _local_token_store_load() -> dict:
    p = _local_token_store_path()
    if not p.exists():
        return {}
    try:
        return json.loads(p.read_text(encoding="utf-8"))
    except Exception:
        return {}


def _local_token_store_save(obj: dict) -> None:
    p = _local_token_store_path()
    p.write_text(json.dumps(obj, ensure_ascii=False, indent=2), encoding="utf-8")


def _md_to_html_simple(md: str) -> str:
    # extremely small MD to HTML, mirroring compose_report_from_md
    import re
    def unescape(text: str) -> str:
        return (text.replace("\\*", "*").replace("\\_", "_")
                    .replace("\\#", "#").replace("\\-", "-"))
    md = unescape(md)
    lines = [l.rstrip("\n\r") for l in md.splitlines()]
    html = []
    in_ul = False
    in_ol = False
    def close_lists():
        nonlocal in_ul, in_ol
        if in_ul: html.append("</ul>"); in_ul = False
        if in_ol: html.append("</ol>"); in_ol = False
    for raw in lines:
        line = raw.strip()
        if not line:
            close_lists(); html.append("<p></p>"); continue
        if line.startswith("---"):
            close_lists(); html.append('<div class="line"></div>'); continue
        if line.startswith("#### "):
            close_lists(); html.append(f"<h4>{line[5:]}</h4>"); continue
        if line.startswith("### "):
            close_lists(); html.append(f"<h4>{line[4:]}</h4>"); continue
        if line.startswith("## "):
            close_lists(); html.append(f"<h3>{line[3:]}</h3>"); continue
        mnum = re.match(r"^\d+\.\s+(.*)$", line)
        if mnum:
            if in_ul: html.append("</ul>"); in_ul=False
            if not in_ol: html.append("<ol>"); in_ol=True
            html.append(f"<li>{mnum.group(1)}</li>"); continue
        if re.match(r"^[-*]\s+", line):
            if in_ol: html.append("</ol>"); in_ol=False
            if not in_ul: html.append("<ul>"); in_ul=True
            html.append(f"<li>{re.sub(r'^[-*]\s+', '', line)}</li>"); continue
        if line.startswith("> "):
            close_lists(); html.append(f"<div class=\"note\">{line[2:]}</div>"); continue
        line = re.sub(r"\*\*(.+?)\*\*", r"<strong>\1</strong>", line)
        html.append(f"<p>{line}</p>")
    close_lists()
    return "\n".join(html)


def _render_html_wrapper(title: str, subtitle: str, hero_text: str, inner_html: str) -> str:
    CSS = """
    :root { --petrol:#0B3B5A; --copper:#D07655; --text:#1F2733; --muted:#666A72; --line:#F3F4F6; --card:#F7F8FA; }
    html,body{height:100%}
    body{margin:0;background:#fff;color:var(--text);font-family:"Noto Sans Hebrew","David",system-ui,-apple-system,Segoe UI,Arial,sans-serif;line-height:1.6;font-size:15pt}
    .wrapper{max-width:900px;margin:0 auto;padding:32px}
    .header{position:relative;padding-top:12px;padding-bottom:18px;border-bottom:4px solid var(--copper)}
    .header .logo{position:absolute;top:0;right:0;display:flex;align-items:center;justify-content:flex-end;width:160px;height:60px}
    .header .logo .fallback{width:140px;height:40px;border:1px dashed var(--line);display:flex;align-items:center;justify-content:center;color:var(--muted);font-size:12pt}
    .doc-title{margin:0;text-align:center;color:var(--petrol);font-size:26pt;font-weight:700}
    .doc-subtitle{margin:6px 0 0 0;text-align:center;color:var(--muted);font-size:18pt;font-weight:600}
    h3{color:var(--petrol);font-size:20pt;margin:24px 0 10px;font-weight:700}
    h4{color:var(--petrol);font-size:18pt;margin:16px 0 8px;font-weight:600}
    p{margin:8px 0}
    ul{margin:8px 0 8px 0;padding-inline-start:20px}
    ul li{margin:4px 0}
    .note{background:var(--card);border-right:4px solid var(--copper);padding:12px;border-radius:10px}
    .line{height:1px;background:var(--line);margin:22px 0}
    .footer{margin-top:32px;padding-top:12px;border-top:1px solid var(--line);color:var(--muted);text-align:center;font-size:13pt}
    @media print{.wrapper{padding:2.5cm}.header,.note{-webkit-print-color-adjust:exact;print-color-adjust:exact}h3,h4,.note,.header{page-break-inside:avoid;break-inside:avoid}}
    """
    return f"""<!DOCTYPE html>
<html lang=\"he\" dir=\"rtl\"><head>
<meta charset=\"utf-8\" />
<meta name=\"viewport\" content=\"width=device-width, initial-scale=1\" />
<title>EISLAW — {title}</title>
<link href=\"https://fonts.googleapis.com/css2?family=Noto+Sans+Hebrew:wght@400;600;700&display=swap\" rel=\"stylesheet\">
<style>{CSS}</style>
<meta property=\"og:title\" content=\"{title}\" />
<meta property=\"og:description\" content=\"{subtitle}\" />
</head>
<body>
  <div class=\"wrapper\"> 
    <header class=\"header\">
      <div class=\"logo\"><div class=\"fallback\">EISLAW</div></div>
      <h1 class=\"doc-title\">{title}</h1>
      <div class=\"doc-subtitle\">{subtitle}</div>
    </header>
    <section>
      <div class=\"note\">{hero_text}</div>
      {inner_html}
    </section>
    <footer class=\"footer\">© EISLAW · Adv. Eitan Shamir · eitan@eislaw.co.il · www.eislaw.co.il</footer>
  </div>
</body></html>"""


def _compose_report_html(ctx: dict, selected_level: str, selected_modules: list[str]) -> str:
    root = _repo_root() / "docs" / "PrivacyExpress" / "ResultTexts"
    pieces = []
    # Map files
    level_file = root / f"level_{selected_level}.md"
    if level_file.exists(): pieces.append(level_file.read_text(encoding="utf-8"))
    mapping = {
        "DPO": root / "dpo.md",
        "Registration": root / "reg.md",
        "Report": root / "report.md",
        "worker_security_agreement": root / "worker_security_agreement.md",
        "cameras_policy": root / "cameras_policy.md",
        "consultation_call": root / "consultation_call.md",
        "outsourcing_text": root / "outsourcing_text.md",
        "direct_marketing_rules": root / "direct_marketing_rules.md",
    }
    for key, path in mapping.items():
        if key in selected_modules and path.exists():
            pieces.append(path.read_text(encoding="utf-8"))
    # replace placeholders
    md_all = "\n\n---\n\n".join(pieces)
    for k, v in {
        "business_name": ctx.get("business_name", ""),
        "contact_name": ctx.get("contact_name", ""),
        "contact_email": ctx.get("contact_email", ""),
        "contact_phone": ctx.get("contact_phone", ""),
    }.items():
        md_all = md_all.replace("{{"+k+"}}", str(v))
    inner = _md_to_html_simple(md_all)
    title = "דו\"ח פרטיות"
    subtitle = ctx.get("business_name") or ""
    hero = "הדו\"ח האישי שלכם מוכן לצפייה."
    return _render_html_wrapper(title, subtitle, hero, inner)


@app.post("/privacy/approve_and_publish")
async def privacy_approve_and_publish(payload: dict = Body(default=None), request: Request = None):
    if not isinstance(payload, dict):
        raise HTTPException(status_code=400, detail="invalid body")
    submission_id = (payload.get("submission_id") or "").strip()
    form_id = (payload.get("form_id") or "").strip()
    selected_level = (payload.get("selected_level") or "").strip()
    selected_modules = payload.get("selected_modules") or []
    if not submission_id or not form_id:
        raise HTTPException(status_code=400, detail="submission_id and form_id required")

    # build host
    host = os.environ.get("REPORT_LINK_HOST")
    if not host:
        try:
            base = str(request.base_url).rstrip('/') if request else ''
            host = base
        except Exception:
            host = ''

    # fetch details
    secrets_d = _load_secrets()
    api_key = ((secrets_d.get("fillout") or {}).get("api_key") or "").strip()
    subs = _fillout_list_submissions(api_key, form_id, limit=50)
    hit = next((r for r in subs.get("responses", []) if r.get("submissionId") == submission_id), None)
    if not hit:
        raise HTTPException(status_code=404, detail="submission not found")
    answers_raw = _map_submission(hit, _load_mapping())
    ans = coerce_inputs(answers_raw)
    score = evaluate(load_rules(), ans)
    if not selected_level:
        selected_level = score.get("level") or "basic"
    if not selected_modules:
        selected_modules = sorted(list(_set_from_score(score)))

    # token + URL
    token = secrets.token_urlsafe(32)
    token_hash = _sha256(token)
    path_report = f"/privacy/report/{token}"
    path_short = f"/r/{token}"
    report_url = (host + path_report) if host else path_report
    share_url = (host + path_short) if host else path_short
    exp = (datetime.datetime.utcnow() + datetime.timedelta(days=int(os.environ.get("REPORT_TOKEN_TTL_DAYS", "30")))).replace(microsecond=0).isoformat() + "Z"

    # store in Airtable (best-effort)
    _airtable_update_fields_by_submission(submission_id, {
        "report_token_hash": token_hash,
        "report_expires_at": exp,
        "report_url": report_url,
        "share_url": share_url,
        "selected_level": selected_level,
        "selected_modules": selected_modules,
    })

    # local fallback store
    local = _local_token_store_load()
    local[token_hash] = {
        "submission_id": submission_id,
        "report_expires_at": exp,
        "report_url": report_url,
        "share_url": share_url,
        "selected_level": selected_level,
        "selected_modules": selected_modules,
        "business_name": ans.get("business_name", ""),
        "contact_name": ans.get("contact_name", ""),
        "email": ans.get("contact_email", ""),
        "contact_phone": ans.get("contact_phone", ""),
    }
    _local_token_store_save(local)

    # build HTML now (optional immediate view)
    html = _compose_report_html({
        "business_name": ans.get("business_name"),
        "contact_name": ans.get("contact_name"),
        "contact_email": ans.get("contact_email"),
        "contact_phone": ans.get("contact_phone"),
    }, selected_level, selected_modules)
    return {"ok": True, "report_url": report_url, "share_url": share_url, "token_preview": token[-6:], "html_len": len(html)}


@app.get("/r/{token}")
async def short_redirect(token: str):
    return RedirectResponse(url=f"/privacy/report/{token}", status_code=302)


@app.get("/privacy/report/{token}")
async def privacy_report(token: str):
    th = _sha256(token)
    rec = _airtable_find_by_hash("report_token_hash", th)
    if not rec:
        # fallback local
        local = _local_token_store_load()
        row = local.get(th)
        if not row:
            raise HTTPException(status_code=404, detail="invalid token")
        f = row
    else:
        f = rec.get("fields", {})
    exp = f.get("report_expires_at")
    try:
        if exp:
            dt = datetime.datetime.fromisoformat(exp.replace("Z", "+00:00"))
            if datetime.datetime.utcnow().replace(tzinfo=datetime.timezone.utc) > dt:
                raise HTTPException(status_code=410, detail="expired token")
    except Exception:
        pass
    # Reconstruct minimal ctx; selected
    selected_level = f.get("selected_level") or f.get("score_level") or "basic"
    selected_modules = f.get("selected_modules") or []
    # Try to show business/contact if present
    ctx = {
        "business_name": f.get("business_name", ""),
        "contact_name": f.get("contact_name", ""),
        "contact_email": f.get("email", ""),
        "contact_phone": f.get("contact_phone", ""),
    }
    html = _compose_report_html(ctx, selected_level, selected_modules)
    return HTMLResponse(content=html)
