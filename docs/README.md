<!-- Project: PrivacyExpress | Full Context: docs/System_Definition.md#privacy-deliverable-flow -->
# Project Index

What lives here and how to resume work quickly.

- Agent Boot: `AGENT_BOOT.md` (follow this at session start)
- Working Memory (current state): `WORKING_MEMORY.md`
- Next Actions (short queue): `NEXT_ACTIONS.md`
- Episodic Test Log: `Testing_Episodic_Log.md` (incidents/fixes/regression payloads)
- Changelog (dated updates + rollback note): `CHANGELOG.md`
- Frontend Plan: `Frontend_Dashboard_Plan.md`

## Modules

- Privacy (Questionnaire → Scoring → Review → Send)
  - Rules/spec: `Security_Scoring_Spec.md`
  - Mapping: `Fillout_Mapping.md` ( + `docs/fillout_field_mapping.json` for live form IDs)
  - Integrations: `Integrations.md` (API fetch + hidden fields + tooling)
  - Service: `scoring_service/` (FastAPI webhook)
  - Tools: `tools/security_scoring_eval.py`, `tools/fillout_fetch_and_score.py`, `tools/security_email_compose.py`
  - Word flow: `tools/make_word_review_example.ps1`, `tools/word_apply_selection.ps1`, `docs/Word/ComposeCheckedBlocks.bas`
  - Text catalog (Hebrew): `docs/security_texts.he-IL.json`

- RAG Pilot
  - Roadmap: `Implementation_Roadmap.md`

## Secrets & Credentials

- Local secrets: `../secrets.local.json` (see `Integrations.md` for schema and location)

## Start-of-Session Checklist (short)

1) Read `AGENT_BOOT.md` → it links to all active artifacts and current state.
2) If working on Privacy:
   - For live form work: confirm hidden-field mapping in `docs/fillout_field_mapping.json`.
   - For tests: use `tools/fillout_fetch_and_score.py`.
   - For review: use Word scripts or Airtable (once table exists).


- Technical Overview: TECHNICAL_OVERVIEW.md (single consolidated doc for engineers)

## Frontend App (scaffold)

- Location: `EISLAW System/frontend/`
- Stack: React + Vite + Tailwind + React Router + React Query
- Start tasks: see `docs/Frontend_Dashboard_Plan.md`

## GitHub Repository & Push Flow

- Remote: `https://github.com/EISLAW/EISLAWManagerWebApp` (main branch). Keep this repo as the source of truth for code and workflows (e.g., the Airtable snapshot Action).
- Quick push steps:
  1. `git status` → ensure only intentional files are staged (secrets stay in `secrets.local.json`, which is ignored).
  2. `git add <files>` or `git add .` when ready.
  3. `git commit -m "Short description"` (small, frequent commits).
  4. `git pull --rebase origin main` if others pushed meanwhile, resolve conflicts, then `git push origin main`.
- Authentication: GitHub requires a Personal Access Token (PAT); when prompted for `https://github.com`, enter your PAT instead of a password. Store PATs securely (not in the repo).

