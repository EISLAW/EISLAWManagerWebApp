Projects Compendium (C:\Coding Projects)
========================================

> Working copy: use `/mnt/c/Coding Projects/EISLAW System Clean` (origin `github.com/EISLAW/EISLAWManagerWebApp`). The older `EISLAW System` folder is archive/reference only—do not develop or commit there.

Purpose
- One place to navigate all active projects and their key documents, grouped by project/module. This is a read‑only map — no content removed, only linked.

Legend
- Paths are relative unless a full path is needed. Click to open within the workspace.

EISLAW System (Web Interface + Services)
- Index: docs/INDEX.md
- Boot Manifest: docs/20251030_Codex_Boot_Manifest.md
- Agent Boot (session start): docs/AGENT_BOOT.md
- Dev Setup (local running): docs/DEV_SETUP.md
- Session Readiness: docs/SESSION_READINESS.md
- Desktop Automation: docs/DESKTOP_AUTOMATION.md
- MCP Bridge + Sources: docs/MCP_BRIDGE.md, docs/MCP_SOURCES.md
- Integrations: docs/Integrations.md (Fillout, Airtable, Microsoft Graph, LLMs)

PrivacyExpress module
- Overview: docs/PrivacyExpress/README.md
- Mapping spec: docs/Fillout_Mapping.md
- Scoring spec: docs/Security_Scoring_Spec.md
- Scoring service (FastAPI): scoring_service/README.md, scoring_service/main.py

RAGPilot module
- Overview: docs/RAGPilot/README.md
- Scripts: RAG_Pilot/ingest_transcripts.py, RAG_Pilot/search.py
 - Insights PRD: docs/INSIGHTS_RAG_PRD.md

Infra (Azure)
- Readme: infra/README.md
- Bicep: infra/azuredeploy.bicep
- Role helper: infra/grant_sp_roles.ps1
- Observability (local): docs/OBSERVABILITY.md (Prometheus/Grafana/Meilisearch stack; run via tools/monitoring/docker-compose.yml)
- Dockerized app: docs/DOCKER_SETUP.md (api/web/Meili compose, envs)

Frontend (Dashboard)
- Entrypoint: frontend/index.html
- App: frontend/src/App.jsx, frontend/src/pages/*

Desktop TK App (AudoProcessor Iterations)
- Readme: ..\AudoProcessor Iterations\README.md
- Prompts (marketing/storytelling): ..\AudoProcessor Iterations\prompts\
  - viral_email_prompt.txt — TK viral email system prompt
  - marketing_item_prompt.txt — generic item from transcript
  - insights_prompt.txt, transcription_prompt.txt, viral_topics_prompt.txt
- App launcher & core
  - launcher.py, app.py, clients.py, audio_processor.py
  - Docs: ..\AudoProcessor Iterations\docs\HANDBOOK.md, SYSTEM_REFERENCE.md, AGENT_PLAYBOOK.md, OPERATIONS.md, ARCHITECTURE.md, DEVELOPMENT.md

MarketingAgent (Storytelling Composer)
- System prompt (concise): tools/marketing_agent/prompt_marketing_agent.txt
- System prompt (viral, cinematic): tools/marketing_agent/prompt_marketing_agent_viral.txt
- CLI: tools/marketing_agent/marketing_agent.py
- Launchers: marketing_agent.bat, marketing_agent_viral_tk.bat
- Brand Voice (Eitan Shamir): docs/MarketingOps/VOICE_OF_BRAND.md — canonical style/voice for marketing prompts and copy.
- Marketing Content Prompt (MarketingOps): docs/MarketingOps/MARKETING_CONTENT_PROMPT_EITAN_SHAMIR.md — system prompt for generating content in brand voice.

Client Communications (Email UX)
- Outlook deep link backend: scoring_service/main.py (endpoints: /api/outlook/latest_link, /graph/*)
- Frontend Emails tab (auto‑open search): frontend/src/pages/Clients/ClientCard/ClientOverview.jsx
- Notes: warmup + same‑tab navigation to avoid Inbox bounce

Operational Logs & Memory
- Working Memory (state): docs/WORKING_MEMORY.md
- Episodic Log: docs/Testing_Episodic_Log.md
- Next Actions: docs/NEXT_ACTIONS.md

EISLAW-WebApp (Clean Web Interface Project)
- Location: C:\Coding Projects\EISLAW-WebApp
- README: C:\Coding Projects\EISLAW-WebApp\README.md
- Backend: C:\Coding Projects\EISLAW-WebApp\backend\app.py
- Backend tests: C:\Coding Projects\EISLAW-WebApp\backend\tests\
- Frontend (Vite + React): C:\Coding Projects\EISLAW-WebApp\frontend\
- Dev entry: C:\Coding Projects\EISLAW-WebApp\session_start.bat
- Docs: C:\Coding Projects\EISLAW-WebApp\docs\WebApp_Final_Development_Prompt.md, \docs\TDD_PLAN.md, \docs\SESSION_READINESS.md
 - Brand: docs/BRAND_GUIDE.md
 - Testing Protocols: docs/TESTING_PROTOCOLS.md

RAG Local (lightweight)
- README: rag_local/README.md
- CLI: rag_local/query_cli.py
- Requirements: rag_local/requirements.txt

Utilities & Launchers
- Session start: session_start.bat (single entry)
- Dev: start_dev.bat, smoke_dev.bat, tools/dev_start.ps1, tools/dev_smoke.ps1
- MCP: start_mcp.bat, tools/mcp_bridge_setup.ps1, tools/mcp-local/server.js
- Cleanup: tools/cleanup.ps1 (preview/delete)
- Client registry helper: tools/client_registry_add.ps1

Bytebot (AI Desktop Agent)
- Location: C:\Coding Projects\bytebot
- Canonical doc: bytebot/docs/codex-integration.md (MCP/REST, start stack, live view)
- Central tools index: C:\Coding Projects\docs\tools-index.md (for all tools/pointers)
- Start stack: from bytebot/ run `bash scripts/start-bytebot-stack.sh` (needs docker/.env with AI key; Gemini set)
- MCP endpoint: http://127.0.0.1:9990/mcp; Live view: http://localhost:9990/vnc (desktop) / 9992 (UI)

Notes
- This compendium is additive. If you add new modules or docs, we can append sections here without modifying the originals.
- For MCP/server availability and local checks, see docs/SESSION_READINESS.md.
