# Joe's Lightweight Orchestration System

> **Core Principle:** Joe (CTO) is a ROUTER, not a WORKER. Minimize Joe's token usage by delegating ALL actual work to CLI agents.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         CEO (User)                               │
│                    Gives high-level request                      │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    JOE (Lightweight Orchestrator)                │
│                                                                  │
│   Token Budget: MINIMAL                                          │
│                                                                  │
│   Joe DOES:                                                      │
│   ✅ Parse CEO request into task list                           │
│   ✅ Determine task dependencies                                 │
│   ✅ Spawn CLI agents with full prompts                         │
│   ✅ Wait for results                                            │
│   ✅ Route outputs to next agent                                 │
│   ✅ Report final status to CEO                                  │
│                                                                  │
│   Joe does NOT:                                                  │
│   ❌ Read files (tell agents to read)                           │
│   ❌ Analyze code (Jacob does this)                             │
│   ❌ Write code (Alex/Maya do this)                             │
│   ❌ Review PRDs (Jacob does this)                              │
│   ❌ Run tests (Eli does this)                                  │
│   ❌ Document outcomes (Jacob does this → TEAM_INBOX)           │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Agent Roster

| Agent | Role | Spawned For |
|-------|------|-------------|
| **David** | Product Manager | PRDs, feature specs, user stories |
| **Alex** | Senior Backend | API endpoints, Python, backend logic |
| **Maya** | Senior Frontend | React, TypeScript, UI components |
| **Joseph** | Database Dev | SQLite schema, migrations, queries |
| **Sarah** | UX/UI Designer | Accessibility, RTL, visual QA |
| **Eli** | QA Engineer | Playwright tests, regression |
| **Jane** | DevOps | Docker, CI/CD, deployments |
| **Noa** | Legal/Copy | Privacy forms, legal text, UX copy |
| **Jacob** | Skeptical CTO | Code review, architecture review, approval gate, **documents to TEAM_INBOX** |

## Execution Patterns

> **DEFAULT: PARALLEL.** Joe spawns agents in parallel unless there's a blocking dependency.

### Pattern 1: Parallel (DEFAULT - Independent Tasks)

```bash
# Joe spawns ALL independent agents at once (with chat integration):
claude -p "You are David. Check TEAM_INBOX for task CLI-P02.
BEFORE starting: python tools/agent_chat.py David CLI-P02 'Starting PRD' agent-tasks
AFTER completion: python tools/agent_chat.py David CLI-P02 'Complete' completions
Then update TEAM_INBOX." --tools default --dangerously-skip-permissions &

claude -p "You are Alex. Check TEAM_INBOX for task AIS-003.
BEFORE starting: python tools/agent_chat.py Alex AIS-003 'Starting implementation' agent-tasks
AFTER completion: python tools/agent_chat.py Alex AIS-003 'Complete' completions
Then update TEAM_INBOX." --tools default --dangerously-skip-permissions &

claude -p "You are Maya. Check TEAM_INBOX for task PRI-007.
BEFORE starting: python tools/agent_chat.py Maya PRI-007 'Starting UI work' agent-tasks
AFTER completion: python tools/agent_chat.py Maya PRI-007 'Complete' completions
Then update TEAM_INBOX." --tools default --dangerously-skip-permissions &

wait  # Joe waits for all to complete
# CEO sees all 3 agents start in #agent-tasks, then completions in #completions
# Joe routes results to Jacob for review
```

**Use parallel when:**
- Tasks are independent (no shared dependencies)
- Different modules (Clients + Privacy + AI Studio)
- PRD writing + unrelated bug fixes
- Multiple reviews needed

**Chat visibility:** CEO sees 3 start messages appear nearly simultaneously in #agent-tasks, then 3 completions as they finish

### Pattern 2: Sequential (Blocking Dependency)

```bash
# Only when task B depends on task A output (with chat):
claude -p "You are Joseph. Check TEAM_INBOX for task CLI-005.
BEFORE starting: python tools/agent_chat.py Joseph CLI-005 'Starting DB migration' agent-tasks
AFTER completion: python tools/agent_chat.py Joseph CLI-005 'Complete' completions
Then update TEAM_INBOX." --tools default --dangerously-skip-permissions
# Wait for Joseph (DB migration) to complete...
# CEO sees: "Joseph starting CLI-005" → "Joseph completed CLI-005"

claude -p "You are Alex. Check TEAM_INBOX for task CLI-006.
BEFORE starting: python tools/agent_chat.py Alex CLI-006 'Starting API (depends on CLI-005)' agent-tasks
AFTER completion: python tools/agent_chat.py Alex CLI-006 'Complete' completions
Then update TEAM_INBOX." --tools default --dangerously-skip-permissions
# Wait for Alex (API) to complete...
# CEO sees: "Alex starting CLI-006" → "Alex completed CLI-006"

claude -p "You are Maya. Check TEAM_INBOX for task CLI-007.
BEFORE starting: python tools/agent_chat.py Maya CLI-007 'Starting frontend (depends on CLI-006)' agent-tasks
AFTER completion: python tools/agent_chat.py Maya CLI-007 'Complete' completions
Then update TEAM_INBOX." --tools default --dangerously-skip-permissions
# CEO sees: "Maya starting CLI-007" → "Maya completed CLI-007"
```

**Use sequential ONLY when:**
- Database schema must exist before API code
- API must exist before frontend integration
- One task's output is another task's input

**Chat visibility:** CEO sees dependency chain execute in order (Joseph → Alex → Maya), knows exactly where pipeline is at any moment

### Pattern 3: Review Loop (Jacob Gate)

```bash
# After ANY work completes, spawn Jacob (with chat):
claude -p "You are Jacob. Check TEAM_INBOX for task CLI-006 review.

AFTER completing review:
from tools.agent_chat import post_review
post_review('Jacob', 'CLI-006', 'APPROVED', 'All checks passed')

Then update TEAM_INBOX Messages TO Joe section." \
--tools default --dangerously-skip-permissions

# If Jacob says "APPROVED" → Done, move to next
# CEO sees: "✅ APPROVED: CLI-006" in #reviews channel

# If Jacob says "NEEDS FIXES" → Spawn fix agent → Jacob reviews again
# CEO sees: "⚠️ NEEDS_FIXES: CLI-006" in #reviews channel
```

**Chat visibility:** CEO sees review verdicts in #reviews channel immediately, knows which tasks passed/failed gate

### Dependency Rules

| Dependency Type | Example | Execution |
|-----------------|---------|-----------|
| None | PRD + Bug fix + Docs update | **PARALLEL** |
| Data | DB → API → Frontend | Sequential |
| Review | Any work → Jacob | Sequential (per task) |
| Mixed | PRD (David) + Bug (Alex) + Jacob reviews both | Parallel work, sequential reviews |

## Chat Integration (Real-Time Visibility)

> **NEW (2025-12-10):** Agents now post real-time updates to Mattermost alongside TEAM_INBOX structured records.

### Hybrid Workflow Principle

| Channel | Purpose | When to Use |
|---------|---------|-------------|
| **Chat (Mattermost)** | Real-time visibility for CEO | Task start, progress updates (optional), completions, reviews |
| **TEAM_INBOX** | Canonical source of truth | Task assignments, final completion records, archive |

**Tools Available:**
- `tools/agent_chat.py` - Python helper (post_start, post_completion, post_review, post_message)
- `tools/agent_chat.sh` - Bash helper (equivalent functions)

**Channels:**
- `#agent-tasks` - Task start + progress updates
- `#completions` - Completion announcements
- `#reviews` - Jacob's review verdicts
- `#ceo-updates` - High-priority alerts (pipeline blockers)

### When Agents MUST Post to Chat

| Event | Channel | Required? | Function |
|-------|---------|-----------|----------|
| **Task start** | #agent-tasks | ✅ REQUIRED | `post_start()` |
| **Progress update** | #agent-tasks | ⚠️ OPTIONAL (agent discretion) | `post_message()` |
| **Completion** | #completions | ✅ REQUIRED | `post_completion()` |
| **Review verdict** | #reviews | ✅ REQUIRED (Jacob only) | `post_review()` |
| **Pipeline blocker** | #ceo-updates | ✅ REQUIRED (Joe only) | `post_ceo_alert()` |

**Error Handling:** If chat is down, agents gracefully fall back to TEAM_INBOX only. 5-second webhook timeout prevents blocking.

---

## Standard Agent Prompts

### Minimal Spawn Command with Chat (PREFERRED)

> **RULE:** Joe writes task to TEAM_INBOX first, then spawns agent with task ID + chat posting instructions.

```bash
# Format (with chat integration):
claude -p "You are {NAME}. Check TEAM_INBOX for task {TASK-ID}.

BEFORE starting work, post to chat:
python tools/agent_chat.py {NAME} {TASK-ID} 'Starting implementation' agent-tasks

AFTER completing work:
1. Post to chat: python tools/agent_chat.py {NAME} {TASK-ID} 'Complete' completions
2. Update TEAM_INBOX Messages TO Joe section

BEFORE marking done, run: bash tools/validate_task_completion.sh {TASK-ID}" \
--tools default --dangerously-skip-permissions

# Examples:
claude -p "You are Alex. Check TEAM_INBOX for task CLI-009.

BEFORE starting work, post to chat:
python tools/agent_chat.py Alex CLI-009 'Starting implementation' agent-tasks

AFTER completing work:
1. Post to chat: python tools/agent_chat.py Alex CLI-009 'Complete' completions
2. Update TEAM_INBOX Messages TO Joe section

BEFORE marking done, run: bash tools/validate_task_completion.sh CLI-009" \
--tools default --dangerously-skip-permissions

# Python-heavy agents can use import instead:
claude -p "You are Maya. Check TEAM_INBOX for task PRI-007.

BEFORE starting work:
from tools.agent_chat import post_start
post_start('Maya', 'PRI-007', 'WordPress Privacy Page', 'feature/PRI-007')

AFTER completing work:
from tools.agent_chat import post_completion
post_completion('Maya', 'PRI-007', '2 hours', 'abc1234', 'Jacob review')

Then update TEAM_INBOX Messages TO Joe section." \
--tools default --dangerously-skip-permissions
```

**Why minimal prompts:**
- Joe saves tokens by NOT repeating task details
- Task ID disambiguates when multiple agents run in parallel
- Agent reads full context from TEAM_INBOX (single source of truth)
- Chat posting adds real-time visibility without changing workflow

### Agent Behavior (What Agents Do Autonomously)

When an agent is spawned with `Check TEAM_INBOX for task {ID}`:

1. **Read** `docs/TEAM_INBOX.md`
2. **Find** task in "Messages FROM Joe" table by ID
3. **Post to chat** (#agent-tasks) - Task start notification ✅ REQUIRED
4. **Read** linked task doc or PRD (if specified)
5. **Execute** work according to task description
6. **(Optional)** Post progress updates to chat (#agent-tasks) during work
7. **Save** deliverables to specified output path
8. **Post to chat** (#completions) - Completion announcement ✅ REQUIRED
9. **Write** completion message to "Messages TO Joe" section in TEAM_INBOX
10. **Exit** - agent instance closes

**Chat Posting Guidelines:**
- Always use try/except or error handling around chat posts (never let chat failure block execution)
- Progress updates are optional - agent decides when useful (e.g., "Tests passing on VM", "Encountered error, debugging...")
- CEO sees real-time updates in Mattermost UI without refreshing TEAM_INBOX

### Legacy Template (Only If Agent Can't Find TEAM_INBOX)

For edge cases where TEAM_INBOX lookup fails, agents understand this format:

```
You are {NAME} ({ROLE}) from the EISLAW development team.

CONTEXT:
{Minimal context Joe provides}

YOUR TASK:
{Specific task description}

IMPORTANT RULES:
1. You have access to the codebase at: ~/EISLAWManagerWebApp (via SSH to 20.217.86.4)
2. Read CLAUDE.md for project rules
3. Work autonomously - do not ask questions
4. Report back in this format:

   STATUS: [COMPLETE|BLOCKED|NEEDS_REVIEW]
   SUMMARY: [2-3 sentences]
   FILES_CHANGED: [list]
   NEXT_STEP: [recommendation]
```

### Jacob (Skeptical Reviewer + Documenter)

Jacob's role is special - he reviews work AND writes the audit trail AND posts to chat.

**When spawned:**
```bash
claude -p "You are Jacob. Check TEAM_INBOX for task {TASK-ID}.

AFTER completing review:
1. Post to chat: from tools.agent_chat import post_review; post_review('Jacob', '{TASK-ID}', 'APPROVED', 'All checks passed')
2. Update TEAM_INBOX Messages TO Joe section

Use 'APPROVED' or 'NEEDS_FIXES' or 'BLOCKED' as verdict." \
--tools default --dangerously-skip-permissions
```

**Jacob's output to TEAM_INBOX:**

If NEEDS_WORK:
```markdown
| **Jacob** | ⚠️ **NEEDS_WORK** | **{TASK-ID} Review ({DATE}):** {Issues found}. **REQUIRED FIXES:** (1) {fix1}, (2) {fix2}. **VERDICT: ⏳ {AGENT} to amend.** |
```

If APPROVED:
```markdown
| **Jacob** | ✅ **APPROVED** | **{TASK-ID} Review ({DATE}):** {What was verified}. **VERDICT: ✅ {AGENT} APPROVED.** {Downstream task} **UNBLOCKED**. |
```

**Jacob's output to chat (#reviews):**
- Uses `post_review("Jacob", "TASK-ID", "APPROVED", "Details...")` function
- Automatically posts to #reviews channel with formatted verdict
- CEO sees review status immediately in Mattermost UI

## Joe's Orchestration Script (Mental Model)

```python
def orchestrate(ceo_request):
    # STEP 1: Minimal parsing (Joe's only real work)
    tasks = parse_request(ceo_request)  # Light work

    # STEP 2: PRD Phase
    david_result = spawn_agent("David", prd_prompt(ceo_request))

    # STEP 3: Implementation Phase (parallel when possible)
    if tasks.needs_db:
        joseph_result = spawn_agent("Joseph", db_prompt(...))
        wait(joseph_result)  # DB is blocking

    # Parallel implementation
    alex_task = spawn_agent_async("Alex", api_prompt(...))
    maya_task = spawn_agent_async("Maya", ui_prompt(...))
    wait_all([alex_task, maya_task])

    # STEP 4: Review Loop
    while True:
        jacob_result = spawn_agent("Jacob", review_prompt(...))

        if jacob_result.verdict == "APPROVED":
            break

        # Spawn fix agents based on Jacob's feedback
        fix_agents = determine_fixers(jacob_result.issues)
        for agent, issue in fix_agents:
            spawn_agent(agent, fix_prompt(issue))

    # STEP 5: QA Phase
    eli_result = spawn_agent("Eli", test_prompt(...))
    sarah_result = spawn_agent("Sarah", ux_prompt(...))

    # STEP 6: Report to CEO
    return compile_report(all_results)
```

## Token Optimization Rules

1. **Joe never reads files** - Agents read files and report summaries
2. **Joe never writes code** - Agents write code
3. **Joe never reviews code** - Jacob reviews code
4. **Joe only sees summaries** - Agents compress their work into short reports
5. **Each CLI instance is disposable** - Task done = instance closed
6. **Context stays in CLI** - Don't bring full context back to Joe

## Example Execution

### CEO Request: "Add user activity dashboard"

**Joe's Work (minimal):**
```
1. Parse: "activity dashboard" → needs PRD, DB, API, UI
2. Spawn David → wait → get PRD summary
3. Spawn Joseph → wait → get DB summary
4. Spawn Alex + Maya (parallel) → wait → get summaries
5. Spawn Jacob → review
6. If issues: spawn fixers → Jacob again
7. Spawn Eli + Sarah (parallel) → QA
8. Report to CEO: "Done. Dashboard at /dashboard"
```

**Joe's token usage:** ~500 tokens (just routing)
**Agents' token usage:** ~10,000 tokens each (actual work)
**Total: Joe stays light, agents do heavy lifting**

---

## Troubleshooting Chat Integration

### Issue: Chat posts failing

**Symptoms:** Agents complete work but no messages appear in Mattermost

**Causes & Solutions:**

| Cause | Solution |
|-------|----------|
| Mattermost not running | Start containers: `cd "C:\Coding Projects\mattermost-chat" && docker compose up -d` |
| Webhook URLs not configured | Check `secrets.local.json` has `mattermost.webhooks.*` entries |
| Network timeout | Normal - agents continue working. Check Mattermost logs if persistent: `docker compose logs mattermost` |
| Wrong webhook URL format | Must be `http://localhost:8065/hooks/xxx...` - verify in Mattermost UI |

**Verification:**
```bash
# Test webhook manually:
python tools/agent_chat.py TestAgent TEST-001 "Test message" agent-tasks

# Expected: Message appears in #agent-tasks channel
# If fails: Check secrets.local.json and Mattermost container status
```

### Issue: Agents hanging on chat post

**Symptoms:** Agent execution stops after chat posting attempt

**Cause:** Webhook timeout not implemented correctly

**Solution:**
- All chat posts have 5-second timeout (built into `agent_chat.py`)
- If agent hangs, it's NOT due to chat (check for other blocking operations)
- Verify: `grep "timeout=5" tools/agent_chat.py` should show timeout configured

### Issue: Chat messages posted but TEAM_INBOX not updated

**Symptoms:** CEO sees completions in chat, but TEAM_INBOX "Messages TO Joe" empty

**Cause:** Agent forgot to update TEAM_INBOX (chat is NOT a replacement for TEAM_INBOX)

**Solution:**
- Re-spawn agent with explicit reminder: "Update TEAM_INBOX Messages TO Joe section"
- Chat is for real-time visibility, TEAM_INBOX is source of truth
- Both are required (not either/or)

### Issue: jq not found (Bash helper)

**Symptoms:** Bash agents can't parse secrets.json to get webhook URLs

**Solution:**
```bash
# Install jq for JSON parsing:
# Windows (via chocolatey): choco install jq
# WSL: sudo apt-get install jq

# Verify: jq --version
```

**Workaround:** Use Python helper instead of Bash helper

### Issue: Mattermost channels don't exist

**Symptoms:** Webhook returns 404 error

**Solution:**
1. Open http://localhost:8065
2. Verify 4 channels exist: #agent-tasks, #completions, #reviews, #ceo-updates
3. If missing: Create channels in Mattermost UI
4. Regenerate webhooks for new channels
5. Update `secrets.local.json` with new webhook URLs

---

## File Locations

| File | Purpose |
|------|---------|
| `docs/ORCHESTRATION_SYSTEM.md` | This document (orchestration patterns) |
| `docs/TEAM_INBOX.md` | Active task assignments (source of truth) |
| `docs/PRD_CHAT_INTEGRATION.md` | Chat system architecture |
| `tools/agent_chat.py` | Python chat helper |
| `tools/agent_chat.sh` | Bash chat helper |
| `tools/README_CHAT.md` | Chat integration usage guide |
| `secrets.local.json` | Webhook URLs (git-ignored) |

## Commands Reference

```bash
# Spawn agent and wait
claude -p "You are Alex..." > /tmp/alex_result.txt

# Spawn agent in background
claude -p "You are Maya..." > /tmp/maya_result.txt &

# Wait for all background jobs
wait

# Spawn with timeout (5 min)
timeout 300 claude -p "You are Jacob..." > /tmp/jacob_result.txt
```
