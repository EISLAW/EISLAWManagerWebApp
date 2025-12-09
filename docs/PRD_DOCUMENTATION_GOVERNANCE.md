# PRD: Documentation Governance & Wiki Sync Rules

**ID:** DOC-005  
**Author:** David (Product)  
**Date:** 2025-12-09  
**Status:** Draft — awaiting CEO approval  
**Related:** DOCUMENTATION_BIBLE.md, PRD_MKDOCS_WIKI.md, CLAUDE.md §8

---

## 1) Problem & Goals

Documentation now lives in markdown, a MkDocs wiki, and mirrored root docs, but there are no guardrails on what must appear in the wiki, who adds it, or how local/VM/wiki stay in sync. This PRD establishes governance so every source-of-truth doc is findable, owned, and mirrored without drift.

Goals:
- Make inclusion rules explicit (MUST/MAY/DO-NOT) so the wiki stays authoritative.
- Define when and how new docs enter the nav with required metadata.
- Standardize sync flows: local edits → VM preview → CI publish to the docs service.
- Assign ownership per doc type with escalation and handoff rules.
- Create a lightweight audit that catches drift before it hits users/agents.

Non-goals:
- Changing MkDocs theming/build tooling (see PRD_MKDOCS_WIKI.md).
- Adding authentication or public exposure controls.

---

## 2) Principles

- Single source of truth: one canonical location; other pages link to it.
- Nav reflects reality: if a doc is authoritative, it appears in mkdocs.yml.
- Ownership is explicit: every doc type has a maintainer and fallback.
- Fast recovery: a broken or stale wiki must be fixable within one working day.

---

## 3) Wiki Inclusion Rules

### MUST be in wiki nav (with canonical path)
- Tier 0/1 docs: CLAUDE.md, AGENTS.md (mirrored under `docs/root` with canonical notice), TEAM_INBOX.md, DOCUMENTATION_BIBLE.md.
- Bibles: DATA_STORES.md, API_ENDPOINTS_INVENTORY.md, DEV_PORTS.md, MARKETING_BIBLE.md, AGENT_BIBLE.md, any future `{TOPIC}_BIBLE.md`.
- Module specs: CLIENTS_FEATURES_SPEC.md, PRIVACY_FEATURES_SPEC.md, AI_STUDIO_PRD.md, RAG_FEATURES_SPEC.md, AGENT_ORCHESTRATION_STATUS.md.
- Active PRDs: any `PRD_*` marked Draft/Approved and not archived (e.g., PRD_MKDOCS_WIKI.md, PRD_CLIENT_ARCHIVE.md).
- Runbooks/Playbooks needed for day-to-day work: onboarding, deployment, rollback, monitoring, backup/restore, smoke tests.
- Acceptance/test plans that gate releases (e.g., POC_VALIDATION_RESULTS.md when active).

### MAY be in wiki (optional sections or appendices)
- Task docs (TASK_*.md) for current sprint references.
- Audit reports once finalized (AUDIT_RESULTS_*.md) with a short summary link.
- Historic PRDs that are superseded but still referenced; place under an "Archive" nav node.
- Research memos that inform active work; include only if referenced by active PRDs.

### DO NOT include
- WIP/temp/scratch files (temp_*.md, notes, quick logs).
- Auto-generated artifacts (playwright reports, coverage outputs).
- Large binary attachments; link from the wiki to their storage location instead.
- Secrets or credential playbooks (keep in secure vault docs, not MkDocs).

---

## 4) Document Addition Rules

- Triggers to add to mkdocs.yml nav:
  - New Bible, Module Spec, or Active PRD is created or status changes to Draft/Approved.
  - New Runbook/Playbook that others must follow more than once.
  - Audit/Task doc that is cited by TEAM_INBOX.md or a PRD.
- Responsibility:
  - Author adds the nav entry in `mkdocs.yml` during the same PR/commit as the doc creation.
  - Doc owner (see §6) reviews nav placement before merge.
  - If the author cannot modify nav (hotfix), they must open a follow-up task for the owner before closing their task.
- Required metadata in each wiki doc header: Title, Owner, Created/Updated (dates), Status (Draft/Approved/Deprecated), Canonical path if mirrored.
- Placement guidance:
  - Use existing nav buckets from PRD_MKDOCS_WIKI.md §4 (Home, Bibles, Modules, Runbooks, PRDs/Tasks, Changelog).
  - Archives live under an "Archive" node with a date.
  - Link to the canonical doc if the file is mirrored (e.g., `docs/root/CLAUDE.md` states canonical location in repo root).

---

## 5) Sync Procedure (Local → VM → Wiki)

1) Local edit (feature branch):
   - Update docs under `docs/` on your branch.
   - Run `python3 -m mkdocs build --clean` or `tools/docs_build.sh` to ensure a clean build.
   - For preview, run `tools/docs_serve.sh` (serves `site/` on port 9003) and spot-check nav/search.
2) Commit/push:
   - Commit doc changes and `mkdocs.yml` updates together.
   - Open PR; ensure CLAUDE.md §8 doc-update rules are satisfied.
3) Merge to `main` → CI publish:
   - GitHub Actions workflow `.github/workflows/docs.yml` builds MkDocs and deploys via `DOCS_SSH_KEY`.
   - CI rsyncs `site/` to the VM (`~/EISLAWManagerWebApp/site/`) and restarts the `docs` service (`docker compose up -d docs`, port `${DOCS_PORT:-8000}`).
4) Verification:
   - After merge, validate `http://20.217.86.4:8000` (docs service) loads the latest nav and pages.
   - If CI is red, fix and re-run; do not mark tasks complete until green.
5) Hotfix (only if CI unavailable):
   - Manually build: `python3 -m mkdocs build --clean`.
   - Deploy: `rsync -az --delete site/ azureuser@20.217.86.4:/home/azureuser/EISLAWManagerWebApp/site/` then `DOCS_PORT=8000 docker compose up -d docs`.
   - Open a ticket to restore CI and document the manual deploy in TEAM_INBOX.

---

## 6) Ownership Model

| Doc Type | Owner | Backup | Review Gate |
|----------|-------|--------|-------------|
| CLAUDE.md / AGENTS.md | Joe | Jacob | Joe approves; mirroring enforced |
| DOCUMENTATION_BIBLE.md | Joe | David | Changes reviewed by Jacob |
| Bibles (DATA_STORES, API_ENDPOINTS_INVENTORY, DEV_PORTS, MARKETING_BIBLE) | Named owner in header (Joseph/Alex/Joe/Noa) | Jacob | Owner updates; Jacob checks during reviews |
| Module Specs (`*_FEATURES_SPEC.md`) | David | Joe | Jacob spot-checks for releases |
| Active PRDs | Author | David | Jacob signs off on acceptance criteria |
| Runbooks/Playbooks | Authoring engineer | Joe | QA (Eli) validates steps when tests exist |
| Audit Reports | Auditor | Joe | Jacob verifies remediation tasks exist |

Handoff: when ownership changes, update the doc header + DOCUMENTATION_BIBLE.md and note the date. Escalate stalled docs (>1 sprint with no owner) to Joe.

---

## 7) Audit Process

- Cadence: weekly (Friday) or end-of-sprint, whichever comes first.
- Owner: Joe runs the audit; Jacob reviews results when material issues exist.
- Checklist:
  - mkdocs.yml contains all MUST docs from §3.
  - CI `Docs` workflow status = green on `main` (past 7 days).
  - Random spot-check: open 3 canonical pages (one Bible, one Module Spec, one PRD) in `http://20.217.86.4:8000` and verify updated headers.
  - Mirrored root docs show last-sync notice and match repo root.
  - No temp_* or WIP files in nav; archives are under the Archive bucket.
  - Robots.txt served at docs root (`Disallow: /`).
- Remediation:
  - Critical (missing MUST doc, broken deploy): fix within 1 business day.
  - Non-critical (nav ordering, outdated header): fix within 1 sprint.
  - Record findings in `TEAM_INBOX` Messages TO Joe with status; create tasks if work exceeds 1 hour.

---

## 8) Success Criteria

- 100% of MUST docs present in mkdocs.yml; CI build green on `main`.
- Wiki deploy matches repo within one commit (CI pipeline proves sync).
- Owners and backups listed in DOCUMENTATION_BIBLE.md and kept current.
- Audit log entries posted to TEAM_INBOX for each weekly/sprint audit.

---

## 9) Dependencies & References

- PRD_MKDOCS_WIKI.md for build/theme/navigation structure.
- DOCUMENTATION_BIBLE.md for tiered architecture and naming conventions.
- CLAUDE.md §8 for Docs Update Rule mapping.
- .github/workflows/docs.yml for CI/CD pipeline details.
