# EISLAW Claude Skills

**Purpose:** Codified workflows and checklists that Claude autonomously discovers and uses.

## Directory Structure

| Directory | Purpose | Examples |
|-----------|---------|----------|
| `core/` | Mandatory operational workflows | local-dev-workflow, team-inbox-update, vm-log-viewer |
| `quality/` | Gates before completion | testing-checklist, self-heal, rtl-a11y-sweep |
| `automation/` | Cognitive offload | status-report, episodic-log-update, working-memory-refresh, adr-creator |
| `domain/` | EISLAW-specific flows | privacy-score-review, client-data-validator, rag-quality-checker |
| `external/` | Third-party / marketplace | anthropic-docx, anthropic-pdf, anthropic-xlsx |

## How Skills Work

1. **Discovery:** Claude reads Skill descriptions and activates relevant ones automatically
2. **Execution:** Skills guide Claude through procedural steps
3. **Consistency:** Skills enforce best practices (testing, documentation, security)

## Creating a New Skill

1. Copy `SKILL_TEMPLATE.md` to appropriate directory (e.g., `core/my-skill/`)
2. Fill in Skill metadata (name, description, steps)
3. Add optional supporting files (scripts, templates, references)
4. Test the Skill with a simple task
5. Update this README's examples table

## Skill Format

Each Skill is a directory containing:
- `SKILL.md` or `skill.md` - Main Skill definition (markdown with clear instructions)
- `manifest.json` - Machine-readable steps (optional)
- `tests/` - Smoke tests for the Skill (optional)
- Supporting files as needed

## Installation Status

- ✅ Directory structure created (2025-12-12)
- ✅ Phase 1 Skills implemented:
  - **Core:** team-inbox-update, local-dev-workflow, vm-log-viewer
  - **Quality:** testing-checklist, self-heal
  - **Automation:** episodic-log-update, working-memory-refresh
- ⏸️ Anthropic document Skills (PDF/DOCX/Excel) - Pending plugin CLI install (SKILLS-006)
- 🔄 Phase 2 Skills - Future (RTL/a11y, status-report, ADR creator)
- 🔄 Phase 3 Skills - Future (domain-specific: privacy, clients, RAG, marketing)

## Current Skills Inventory

### Core Skills (Operational Workflows)
| Skill | Purpose | Status |
|-------|---------|--------|
| team-inbox-update | TEAM_INBOX posting templates and rules | ✅ Complete |
| local-dev-workflow | Local development + auto-sync to VM | ✅ Complete |
| vm-log-viewer | SSH to VM and view Docker logs | ✅ Complete |

### Quality Skills (Gates Before Completion)
| Skill | Purpose | Status |
|-------|---------|--------|
| testing-checklist | Pytest/build/Playwright validation before completion | ✅ Complete |
| self-heal | Recovery from failure patterns and anti-patterns | ✅ Complete |

### Automation Skills (Cognitive Offload)
| Skill | Purpose | Status |
|-------|---------|--------|
| episodic-log-update | Append lessons learned to episodic memory | ✅ Complete |
| working-memory-refresh | Update working memory with current sprint status | ✅ Complete |

### Domain Skills (EISLAW-Specific)
| Skill | Purpose | Status |
|-------|---------|--------|
| privacy-score-review | Review privacy algorithm scoring | 🔄 Future |
| client-data-validator | Validate client registry vs Airtable/SharePoint | 🔄 Future |
| rag-quality-checker | Verify RAG embeddings and retrieval quality | 🔄 Future |

### External Skills (Third-Party)
| Skill | Purpose | Status |
|-------|---------|--------|
| anthropic-docx | Microsoft Word document generation/analysis | ⏸️ Blocked (plugin install) |
| anthropic-pdf | PDF extraction/merging/analysis | ⏸️ Blocked (plugin install) |
| anthropic-xlsx | Excel formula validation and data audits | ⏸️ Blocked (plugin install) |

## References

- Skills Architecture Research: `docs/RESEARCH_SKILLS_ARCHITECTURE.md`
- Anthropic Skills Docs: https://docs.claude.com/en/docs/claude-code/skills
- Marketplace: https://skillsmp.com/
- Task Template: `SKILL_TEMPLATE.md` (in this directory)
