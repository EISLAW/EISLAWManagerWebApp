# Security Scoring Webhook (FastAPI)

Purpose
- Accepts Fillout form submissions (JSON), evaluates security scoring using `config/security_scoring_rules.json`, and returns outputs: `level`, `reg`, `report`, `dpo`.

Run locally
- Install deps:
  - `pip install -r C:\Coding Projects\EISLAW System\scoring_service\requirements.txt`
- Start server:
  - `uvicorn C:\Coding Projects\EISLAW System\scoring_service\main:app --host 127.0.0.1 --port 8788`
- Optional: set a shared secret so only Fillout can call it:
  - PowerShell: `$env:FILL0UT_SHARED_SECRET='your-secret'`
  - Fillout: add header `X-Fillout-Secret: your-secret`

Endpoint
- `POST /fillout/webhook`
  - Body: the submitted fields as JSON (keys should match those in `docs/Fillout_Mapping.md`).
  - Response: `{ "level": "mid|basic|...", "reg": bool, "report": bool, "dpo": bool, "requirements": string[] }`

Utility endpoints
- `GET /health` → `{ status: "ok" }`
- `GET /api/clients` → small placeholder list so the dashboard can render live data

Notes
- Rules are loaded from `config/security_scoring_rules.json` at runtime.
- The evaluator uses the same logic as `tools/security_scoring_eval.py`.
- Optional extra outputs `requirements` may include:
  - `worker_security_agreement` — if employees/freelancers are exposed to personal data (Q13)
  - `cameras_policy` — if surveillance cameras are used (Q14)
  - `consultation_call` — if processing for others (processor path) (Q12)
  - `outsourcing_text` — additional text required when processor or processor_sensitive_org is true (Q12 + follow-up)
  - `direct_marketing_rules` — if directmail_biz or directmail_self is true (Q9/Q10)

Hidden fields & mapping
- Prefer hidden fields for all scoring inputs. Current mapping is stored at `docs/fillout_field_mapping.json`.
- For local pull & score via the API, see `tools/fillout_fetch_and_score.py`.
