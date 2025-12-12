# EISLAW Claude Skills

**Purpose:** Codified workflows and checklists that Claude autonomously discovers and uses.

## Directory Structure

| Directory | Purpose | Examples |
|-----------|---------|----------|
| `core/` | Mandatory operational workflows | local-dev-workflow, spawn-template, team-inbox-update |
| `quality/` | Gates before completion | testing-checklist, self-heal, rtl-a11y-sweep |
| `automation/` | Cognitive offload | status-report, episodic-log-update, adr-creator |
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
- `SKILL.md` - Main Skill definition (YAML frontmatter + instructions)
- `manifest.json` - Machine-readable steps (optional)
- `tests/` - Smoke tests for the Skill (optional)
- Supporting files as needed

## Installation Status

- ✅ Directory structure created
- ⏸️ Anthropic document Skills (PDF/DOCX/Excel) - Pending plugin CLI install (SKILLS-006)
- 🔄 Phase 1 Skills - In progress (SKILLS-002, SKILLS-003, SKILLS-004)

## References

- Skills Architecture Research: `docs/RESEARCH_SKILLS_ARCHITECTURE.md`
- Anthropic Skills Docs: https://docs.claude.com/en/docs/claude-code/skills
- Marketplace: https://skillsmp.com/
