# EISLAW System

Start here for project structure, modules, and where to resume work.

- Project index: `docs/README.md`
- Agent boot (first steps each session): `docs/AGENT_BOOT.md`
- Current working memory (state + context): `docs/WORKING_MEMORY.md`
- Next actions (short queue): `docs/NEXT_ACTIONS.md`
- Episodic test log (issues/fixes/regressions): `docs/Testing_Episodic_Log.md`

Key modules
- Privacy (Fillout → scoring → review/send): see `docs/README.md` → Privacy.
- RAG pilot: see `docs/Implementation_Roadmap.md`.
- Desktop/Tk utility: see `README.md` in the relevant repository (module developed separately).

Dev ports (fixed)
- Frontend (Vite): 3000
- Backend API: 8080
- Dev tools (storybook/admin): 9001, 9002… (range 9000–9099)
- DB defaults: keep vendor defaults (5432 Postgres, 6379 Redis)
See `docs/DEV_PORTS.md` for rules; avoid auto-bumping ports—resolve conflicts explicitly and keep these as the standard.
