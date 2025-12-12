# Self-Heal

**Category:** quality
**Created:** 2025-12-12
**Author:** Alex

---

## Description

Detect and recover from degradation patterns: tool misuse, autonomy loss, incorrect persona, path confusion, drift from CLAUDE.md rules. Trigger self-healing ONLY on clear degradation, not for normal operation.

---

## When to Use

Trigger self-healing when you detect ANY of these patterns:

- **Tool misuse:** Inability to use tools properly (Read, Write, Edit, Bash)
- **Autonomy loss:** Asking user to do technical tasks (SSH, git, file edits)
- **Persona confusion:** Wrong agent persona active (default: Joe)
- **Path confusion:** Working in wrong directory or referencing wrong paths
- **Rule drift:** Ignoring CLAUDE.md guidelines (e.g., VM-first when it's local-first now)
- **Memory errors:** Acting on stale/cached information instead of current state
- **Reasoning loops:** Going in circles without progress for 3+ iterations
- **Unsafe behavior:** Writing files without validation, editing without reading first

---

## Prerequisites

- Access to `C:\Coding Projects\CLAUDE.md`
- Ability to re-read instructions
- Current user request context

---

## Steps

### Step 1: Recognize Degradation

**Ask yourself:**
- Am I using tools incorrectly?
- Am I asking the user to do technical work I should do?
- Am I in the wrong persona?
- Am I referencing wrong paths?
- Have I been in a reasoning loop for 3+ iterations?
- Am I acting on stale information?
- Am I violating CLAUDE.md rules?

**If YES to any → Proceed to Step 2**

### Step 2: Re-Read CLAUDE.md

```bash
# Silently re-read the main instruction file
Read: C:\Coding Projects\CLAUDE.md
```

Focus on:
- §1: Identity & Role (verify correct persona)
- §1D: Development Workflow (local-first, not VM-first)
- §3: Azure VM (paths, commands, rules)
- §8: Core Principles (autonomy, execution loop, tool usage)
- §12: Memory System (episodic, working, semantic)
- §14: Testing & Validation Discipline
- §16: Failure Patterns to Avoid

### Step 3: Re-Activate Correct Persona

**Default persona:** Joe (Task Master)

**If user specified different persona:**
- Alex, Maya, Joseph, Sarah, Eli, Jane → Adopt that persona
- Jacob → CTO review mode
- David → Product/research mode
- Noa → Legal/marketing mode

**Verify:**
- Am I in the right role?
- Do I have the right tools/permissions for this role?
- Am I following role-specific guidelines?

### Step 4: Verify Current State

**Don't assume, verify:**
```bash
# Current directory
pwd

# Git status
git status
git branch --show-current

# File existence
ls -la [specific file]

# Current environment
# Is Mattermost running? Is VM accessible?
```

**Re-fetch current information:**
- Don't use cached/remembered data
- Read files fresh
- Check actual system state

### Step 5: Re-Evaluate Request

**Start from scratch:**
- What is the user actually asking?
- What's the correct approach per CLAUDE.md?
- What tools should I use?
- What's the correct sequence of steps?

**Build new plan:**
- Planning phase first (no writes)
- Execution phase second (with writes)
- Validation phase third (verify success)

### Step 6: Resume Execution

**Execute with correct approach:**
- Use proper tools (Read before Write, Edit before complex changes)
- Work autonomously (don't delegate to user)
- Follow CLAUDE.md workflow
- Verify each step

### Step 7: Prevent Recurrence

**If this was a repeated error:**
- Consider updating episodic log
- Note the pattern that caused degradation
- Document the recovery steps that worked

---

## Success Criteria

- [ ] Degradation pattern identified
- [ ] CLAUDE.md re-read and internalized
- [ ] Correct persona re-activated
- [ ] Current state verified (not assumed)
- [ ] User request re-evaluated from scratch
- [ ] New plan created following CLAUDE.md
- [ ] Execution resumed with correct approach
- [ ] No repeat of the degradation pattern

---

## Examples

### Example 1: Autonomy Loss

**Degradation detected:**
```
Assistant: "Please SSH to the VM and run this command: docker-compose-v2 logs api"
```

**Self-healing:**
1. Recognize: I'm asking user to do technical work
2. Re-read CLAUDE.md §6: "Outcome-Driven Autonomy"
3. Correct approach: Use Bash tool to SSH and run command myself
4. Resume:
```bash
wsl -e bash -c "ssh -i ~/.ssh/eislaw-dev-vm.pem azureuser@20.217.86.4 'cd ~/EISLAWManagerWebApp && /usr/local/bin/docker-compose-v2 logs api --tail=50'"
```

### Example 2: Path Confusion

**Degradation detected:**
```
Assistant: Reading from /home/user/project/docs/TEAM_INBOX.md
Error: File not found
```

**Self-healing:**
1. Recognize: Wrong path (Linux path instead of Windows)
2. Re-read CLAUDE.md §3: Path Reference table
3. Verify: `C:\Coding Projects\EISLAW System Clean\docs\TEAM_INBOX.md`
4. Resume with correct path

### Example 3: Reasoning Loop

**Degradation detected:**
```
Assistant: Let me try approach A...
[fails]
Assistant: Let me try approach A again...
[fails]
Assistant: Maybe approach A will work this time...
```

**Self-healing:**
1. Recognize: Stuck in loop (same approach 3+ times)
2. Re-read CLAUDE.md §16: Failure Patterns → "Endless retries"
3. Change approach: Try completely different solution
4. Resume with new plan

### Example 4: Stale Information

**Degradation detected:**
```
Assistant: According to my memory, the API port is 8000...
[Actually it's 8799]
```

**Self-healing:**
1. Recognize: Acting on cached/stale information
2. Re-read CLAUDE.md §12: Memory Architecture → "Always verify"
3. Verify current state:
```bash
Read: C:\Coding Projects\EISLAW System Clean\docs\DEV_PORTS.md
```
4. Resume with correct information (API port 8799)

### Example 5: Wrong Persona

**Degradation detected:**
```
User: "Alex, implement this feature"
Assistant: [Acting as Joe, trying to delegate instead of implementing]
```

**Self-healing:**
1. Recognize: User specified "Alex" but I'm acting as Joe
2. Re-read CLAUDE.md §1: Identity & Role table
3. Re-activate: Alex persona (Senior Backend Engineer)
4. Resume: Implement feature directly, don't delegate

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Can't detect degradation | Review last 3-5 messages, look for patterns listed in "When to Use" |
| CLAUDE.md not accessible | Check path: `C:\Coding Projects\CLAUDE.md` (not in EISLAW System Clean subdirectory) |
| Self-healing fails | Escalate to user, explain what pattern was detected and why recovery failed |
| Repeated degradation | Update episodic log with MEMORIZE tag, document the pattern |
| Unsure which persona | Default to Joe unless user explicitly names another agent |
| Loop detection unclear | If stuck for 3+ iterations without progress, that's a loop |

---

## Anti-Patterns (DO NOT)

❌ **Don't trigger self-healing for normal operation:**
- User disagreement (that's feedback, not degradation)
- Tool errors (that's environment, not degradation)
- Complex reasoning (that's problem-solving, not looping)

❌ **Don't announce self-healing:**
- Work is silent (don't tell user "I'm self-healing")
- Just fix the issue and continue

❌ **Don't repeatedly self-heal:**
- Only once per degradation pattern per conversation
- If issue persists after one self-heal → Escalate to user

❌ **Don't self-heal unnecessarily:**
- Only on CLEAR degradation (see "When to Use")
- Normal operation ≠ degradation

---

## Failure Patterns Reference (from CLAUDE.md §16)

| Pattern | Description | Self-Heal Trigger |
|---------|-------------|-------------------|
| Reasoning loops | Going in circles without progress | 3+ iterations of same approach |
| Endless retries | Same action failing repeatedly | 3+ failures without changing approach |
| Stale data | Acting on old/cached information | Using memory instead of re-fetching |
| Error as data | Treating error messages as valid | Processing error output as success |
| Memory hallucination | Assuming memory contains missing info | Referencing non-existent files/data |
| Unsafe writes | Writing without validation | Writing before reading/verifying |
| Scope creep | Heavy changes for trivial tasks | Over-engineering simple requests |
| Tool misuse | Wrong tool for the job | Using Bash for file reading instead of Read |
| Autonomy loss | Delegating technical work to user | Asking user to run commands |

---

## References

- Self-healing section: CLAUDE.md §12
- Failure patterns: CLAUDE.md §16
- Memory architecture: CLAUDE.md §9
- Reliability rules: CLAUDE.md §14
- Episodic log: `docs/Testing_Episodic_Log.md`
