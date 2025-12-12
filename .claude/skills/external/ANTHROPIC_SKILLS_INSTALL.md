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

Check if plugin CLI is available:
```bash
claude plugin --help
```

If not available, install Claude Code plugin support. Likely via:
```bash
# Check Claude Code version
claude --version

# If plugin support is missing, update Claude Code
npm install -g @anthropic/claude-code@latest
```

### Step 2: Add Anthropic Skills Marketplace

```bash
claude plugin marketplace add anthropics/skills
```

### Step 3: Install Document Skills

```bash
claude plugin install document-skills@anthropic-agent-skills
```

### Step 4: Verify Installation

```bash
# List installed plugins
claude plugin list

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

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| `claude plugin` command not found | Update Claude Code to latest version |
| Marketplace add fails | Check internet connection, verify anthropics/skills repo exists |
| Skills don't activate | Restart Claude session after install |
| Permission errors | Run with elevated permissions (Windows: Run as Administrator) |

---

## References

- Anthropic Skills marketplace: https://github.com/anthropics/skills
- Claude Code plugin docs: https://docs.claude.com/en/docs/claude-code/plugins
- EISLAW Skills research: `docs/RESEARCH_SKILLS_ARCHITECTURE.md` §5
