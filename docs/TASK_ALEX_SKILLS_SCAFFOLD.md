# TASK: Create Skills Directory Scaffold

**Task ID:** SKILLS-001
**Assigned To:** Alex (Senior Backend Engineer)
**Assigned By:** Joe
**Date:** 2025-12-12
**Status:** 🟢 READY
**Branch:** feature/SKILLS-001
**Model:** Codex (default for Alex)

---

## Task Overview

Create the `.claude/skills/` directory structure and foundational documentation based on David's Skills Architecture Research (RESEARCH-SKILLS-001).

---

## Objectives

1. Create 4-tier directory taxonomy (core/quality/automation/domain/external)
2. Add README.md explaining Skills organization
3. Create template files for Skill creation
4. Document plugin CLI installation for CEO (SKILLS-006 blocker)

---

## Directory Structure to Create

```
C:\Coding Projects\EISLAW System Clean\.claude/
└── skills/
    ├── README.md                  # Taxonomy guide + how to create Skills
    ├── SKILL_TEMPLATE.md          # Template for new Skills
    ├── core/                      # Mandatory operational workflows
    │   └── .gitkeep
    ├── quality/                   # Gates before completion
    │   └── .gitkeep
    ├── automation/                # Cognitive offload
    │   └── .gitkeep
    ├── domain/                    # EISLAW-specific flows
    │   └── .gitkeep
    └── external/                  # Third-party / marketplace
        └── .gitkeep
```

---

## Deliverable 1: README.md

**Location:** `.claude/skills/README.md`

**Content:**

```markdown
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
```

---

## Deliverable 2: SKILL_TEMPLATE.md

**Location:** `.claude/skills/SKILL_TEMPLATE.md`

**Content:**

```markdown
# Skill Name

**Category:** [core / quality / automation / domain / external]
**Created:** YYYY-MM-DD
**Author:** [Name]

---

## Description

[1-2 sentences: What does this Skill do? When should Claude use it?]

---

## When to Use

- [Scenario 1]
- [Scenario 2]
- [Scenario 3]

---

## Prerequisites

- [Required file / tool / configuration]
- [Environment variable / credential]

---

## Steps

### Step 1: [Action Name]
[Detailed instructions]

```bash
# Example command
[command here]
```

### Step 2: [Action Name]
[Detailed instructions]

---

## Success Criteria

- [ ] [Check 1]
- [ ] [Check 2]
- [ ] [Check 3]

---

## Examples

### Example 1: [Use Case]
[Concrete example with input/output]

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| [Common issue] | [How to fix] |

---

## References

- [Related doc / tool / guide]
```

---

## Deliverable 3: Plugin CLI Installation Instructions

**Create:** `.claude/skills/external/ANTHROPIC_SKILLS_INSTALL.md`

**Content:**

```markdown
# Installing Anthropic Document Skills

**Task:** SKILLS-006 (CEO action required)
**Status:** Pending plugin CLI installation

---

## What This Unlocks

Anthropic's official document Skills (PDF, DOCX, Excel):
- **PDF:** Extract tables, merge/split, analyze legal documents
- **DOCX:** Generate templates, track changes, diff Hebrew text
- **Excel:** Validate formulas, audit Airtable exports, summarize sheets

**Use Cases for EISLAW:**
- Privacy report generation (DOCX)
- Client intake packet review (PDF)
- Airtable schema audits (XLSX)

---

## Installation Steps (CEO)

### Step 1: Install Claude Code Plugin Runner

[PLACEHOLDER - Research exact installation command]

Likely one of:
```bash
# Option A: npm global install
npm install -g @anthropic/claude-code-plugin

# Option B: Claude CLI command
claude plugin install
```

### Step 2: Add Anthropic Skills Marketplace

```bash
/plugin marketplace add anthropics/skills
```

### Step 3: Install Document Skills

```bash
/plugin install document-skills@anthropic-agent-skills
```

### Step 4: Verify Installation

```bash
# List installed plugins
/plugin list

# Should show:
# - anthropic-docx
# - anthropic-pdf
# - anthropic-xlsx
```

---

## Testing After Install

Try these commands to verify Skills work:

```bash
# Test PDF Skill
claude -p "Extract text from sample.pdf and summarize"

# Test DOCX Skill
claude -p "Generate a new DOCX from template.docx with {client_name} placeholder"

# Test Excel Skill
claude -p "Validate formulas in clients_export.xlsx"
```

---

## Status

- [ ] Plugin CLI installed
- [ ] Anthropic marketplace added
- [ ] Document Skills installed
- [ ] Skills verified working

Once complete, update TEAM_INBOX SKILLS-006 to ✅ COMPLETE.
```

---

## Acceptance Criteria

- [ ] Directory structure created (`.claude/skills/` with 5 subdirectories)
- [ ] README.md created with taxonomy guide
- [ ] SKILL_TEMPLATE.md created for future Skills
- [ ] ANTHROPIC_SKILLS_INSTALL.md created (plugin instructions for CEO)
- [ ] All directories have `.gitkeep` files (track empty dirs in git)
- [ ] Committed to feature/SKILLS-001 branch
- [ ] Completion message posted to TEAM_INBOX

---

## Git Workflow

```bash
# Create branch
git checkout dev-main-2025-12-11
git pull origin dev-main-2025-12-11
git checkout -b feature/SKILLS-001

# Create files (as above)

# Commit
git add .claude/
git commit -m "SKILLS-001: Create Skills directory scaffold

- Created 4-tier taxonomy (core/quality/automation/domain/external)
- Added README with Skills organization guide
- Added SKILL_TEMPLATE for creating new Skills
- Added Anthropic Skills install instructions for CEO
- All directories tracked with .gitkeep

Ready for Phase 1 Skills implementation (SKILLS-002/003/004)."

# Push
git push -u origin feature/SKILLS-001
```

---

## Estimated Time

**1-2 hours**

---

## References

- Skills research: `docs/RESEARCH_SKILLS_ARCHITECTURE.md` (Section 3)
- Anthropic Skills docs: https://docs.claude.com/en/docs/claude-code/skills

---

*Task created by Joe on 2025-12-12. For questions, update TEAM_INBOX "Messages TO Joe".*
