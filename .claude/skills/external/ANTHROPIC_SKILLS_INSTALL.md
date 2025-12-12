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

Once complete, update TEAM_INBOX SKILLS-006 to COMPLETE.
