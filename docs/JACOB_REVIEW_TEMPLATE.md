# Jacob Review Template

**Template Version:** 1.1 | **Updated:** 2025-12-09
**Purpose:** Standard template for ALL Jacob (Skeptical CTO) code reviews

---

## ⚠️ CRITICAL: VM-FIRST RULE

> **All work lives on the VM (20.217.86.4). Local files are backups only.**
> **ALWAYS check the VM FIRST. A task is only "done" when it's on the VM.**

```bash
# ALWAYS start reviews with SSH to VM:
wsl -e bash -c "ssh -i ~/.ssh/eislaw-dev-vm.pem azureuser@20.217.86.4 'ls -la ~/EISLAWManagerWebApp/{path}'"
```

**Why?** Per CLAUDE.md Rule #1: "All code lives on Azure VM. SSH first. Never edit local files."
Local-only changes are NOT complete. VM is the source of truth.

---

## Pre-Review Checklist

Before starting review, verify:
- [ ] **VM CHECK FIRST:** Files exist on VM (`~/EISLAWManagerWebApp/`)
- [ ] Task exists in TEAM_INBOX with status (usually "✅ DONE" from agent)
- [ ] Agent posted completion message in "Messages TO Joe"
- [ ] PRD/spec document is identified

---

## Mandatory Review Checklist (from CLAUDE.md §1)

> **CRITICAL:** Jacob MUST verify ALL items before issuing verdict.

### 1. Code Quality
- [ ] Code matches PRD/spec requirements?
- [ ] Logic is correct and handles edge cases?
- [ ] No security vulnerabilities (OWASP top 10)?
- [ ] Follows existing code patterns?

### 2. Tests
- [ ] Tests pass (if applicable)?
- [ ] Test coverage adequate for changes?

### 3. Documentation Updated (CLAUDE.md §8)

| If agent changed... | Doc to check | Updated? |
|---------------------|--------------|----------|
| API endpoint (add/change/remove) | `API_ENDPOINTS_INVENTORY.md` | [ ] Yes / [ ] No / [ ] N/A |
| Database table/column | `DATA_STORES.md` | [ ] Yes / [ ] No / [ ] N/A |
| Clients module | `CLIENTS_FEATURES_SPEC.md` | [ ] Yes / [ ] No / [ ] N/A |
| Privacy module | `PRIVACY_FEATURES_SPEC.md` | [ ] Yes / [ ] No / [ ] N/A |
| AI Studio module | `AI_STUDIO_PRD.md` | [ ] Yes / [ ] No / [ ] N/A |
| RAG module | `RAG_FEATURES_SPEC.md` | [ ] Yes / [ ] No / [ ] N/A |
| Agent orchestration | `AGENT_ORCHESTRATION_STATUS.md` | [ ] Yes / [ ] No / [ ] N/A |
| Marketing/forms | `MARKETING_BIBLE.md` | [ ] Yes / [ ] No / [ ] N/A |

**If docs NOT updated:** Return `NEEDS_FIXES: Update {doc_name}` - do NOT approve.

### 4. Git Workflow
- [ ] Code on correct feature branch (`feature/{TASK-ID}`)?
- [ ] Code committed and pushed?

### 5. VM Verification
- [ ] Code synced to VM (20.217.86.4)?
- [ ] Endpoints/features work on VM?
- [ ] Tested with curl/browser?

---

## Verdict Options

| Verdict | When to Use | Next Step |
|---------|-------------|-----------|
| **APPROVED** | All checks pass | Task complete, unblock downstream |
| **NEEDS_FIXES** | Issues found but fixable | Agent amends, Jacob re-reviews |
| **BLOCKED** | Cannot proceed, needs escalation | Escalate to CEO |

---

## TEAM_INBOX Update (MANDATORY)

> **CRITICAL:** Jacob MUST update TEAM_INBOX after EVERY review. This is NOT optional.

### Step 1: Update Task Status

In "Active Tasks FROM Joe" table:
- If APPROVED: Keep `✅ DONE` or change if needed
- If NEEDS_FIXES: Change to `⚠️ NEEDS_FIXES`
- If BLOCKED: Change to `❌ BLOCKED`

### Step 2: Add Review Message

Add row to "Messages TO Joe" table using this format:

**If APPROVED:**
```markdown
| **Jacob** | ✅ **APPROVED** | **{TASK-ID} Review ({DATE}):** {What was verified}. **Checks:** ✅ {check1}, ✅ {check2}. **VERDICT: ✅ {AGENT} APPROVED.** {Downstream task} UNBLOCKED. |
```

**If NEEDS_FIXES:**
```markdown
| **Jacob** | ⚠️ **NEEDS_FIXES** | **{TASK-ID} Review ({DATE}):** {What works}. **ISSUES:** (1) {issue1}. (2) {issue2}. **REQUIRED FIXES:** {fix list}. **VERDICT: ⏳ {AGENT} to amend.** {Downstream task} BLOCKED until fixes complete. |
```

**If BLOCKED:**
```markdown
| **Jacob** | ❌ **BLOCKED** | **{TASK-ID} Review ({DATE}):** {Reason for blocking}. **ESCALATION:** {What CEO needs to decide}. **VERDICT: ❌ BLOCKED - CEO decision required.** |
```

### Step 3: Update Downstream Tasks

If review verdict affects other tasks:
- APPROVED: Change downstream from "blocked by X" to "🟢 READY"
- NEEDS_FIXES/BLOCKED: Change downstream to "❌ BLOCKED (by {TASK-ID} fixes)"

---

## Review Output Format

```markdown
## Jacob's Skeptical Review - {TASK-ID}

**Task:** {Task description}
**Agent:** {Name}
**Date:** {YYYY-MM-DD}
**Reviewer:** Jacob (Skeptical CTO)

---

### What Works
| Check | Status | Evidence |
|-------|--------|----------|
| Code Quality | ✅/❌ | {details} |
| Tests | ✅/❌/N/A | {details} |
| VM Verified | ✅/❌ | {curl output or test} |
| Docs Updated | ✅/❌ | {which docs checked} |
| Git Branch | ✅/❌ | {branch name} |

---

### Issues Found (if any)

#### Issue 1: {Title}
**Impact:** {Why this matters}
**Fix Required:** {What agent must do}

---

### Verdict: {APPROVED / NEEDS_FIXES / BLOCKED}

**Required Fixes (if NEEDS_FIXES):**
1. {Fix 1}
2. {Fix 2}

**TEAM_INBOX Updated:** [ ] Yes (MANDATORY)

---

DONE:Jacob - {APPROVED/NEEDS_FIXES/BLOCKED}: {summary}
```

---

## Anti-Patterns (What Jacob Must NOT Do)

| Don't | Do Instead |
|-------|------------|
| **Check local files only** | **ALWAYS check VM first (SSH to 20.217.86.4)** |
| Approve without VM test | Always verify on VM |
| Approve with missing docs | Return NEEDS_FIXES |
| Skip TEAM_INBOX update | ALWAYS update TEAM_INBOX |
| Implement fixes yourself | Return to agent for fixes |
| Approve on wrong branch | Return NEEDS_FIXES |
| Batch multiple reviews | Update TEAM_INBOX after each review |
| Assume local = VM | Files can differ - VM is source of truth |

---

## Quick Reference

### SSH to VM
```bash
wsl -e bash -c "ssh -i ~/.ssh/eislaw-dev-vm.pem azureuser@20.217.86.4 'curl -s http://localhost:{PORT}/{endpoint}'"
```

### Common Ports
| Service | Port |
|---------|------|
| API | 8799 |
| Frontend | 5173 |
| Orchestrator | 8801 |
| Meilisearch | 7700 |
| Langfuse | 3001 |

---

*This template is MANDATORY for all Jacob reviews.*
*Location: `docs/JACOB_REVIEW_TEMPLATE.md`*
*See CLAUDE.md §1 for Jacob's role definition.*
