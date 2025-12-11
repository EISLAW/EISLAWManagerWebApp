# Agent Chat Integration - Usage Guide

## Overview

The agent chat integration allows spawned CLI agents to post real-time updates to Mattermost channels for CEO visibility, while maintaining TEAM_INBOX as the canonical source of truth.

**Consolidated Channel (CHAT-FIXES):**
- `#agent-tasks` - **PRIMARY CHANNEL** - All agent messages go here
- `#ceo-updates` - High-priority alerts only (pipeline blockers)

**Deprecated Channels (still work but use agent-tasks instead):**
- `#completions` - Now redirected to #agent-tasks
- `#reviews` - Now redirected to #agent-tasks

**Emoji Conventions:**
| Emoji | Message Type | Example |
|-------|-------------|---------|
| 🚀 | Start/Spawn | Agent starting work |
| ✅ | Completion | Task complete |
| 📋 | Review | Review verdict |
| 🟢 | Unblock | Tasks now unblocked |
| 🚨 | Alert | CEO attention needed |

**Principle:** Chat is for real-time visibility. TEAM_INBOX is for structured records.

---

## Python Helper (`tools/agent_chat.py`)

### Installation

No installation needed - `requests` library is already in project requirements.

### Usage

#### Import in Python Scripts

```python
from tools.agent_chat import post_message, post_start, post_completion, post_review
```

#### Task Start

```python
post_start(
    agent_name="Alex",
    task_id="CLI-009",
    task_description="API Clients List Ordering",
    branch="feature/CLI-009",
    estimated_hours="1-2 hours",
    depends_on="CLI-008 (Joseph)"  # Optional: show dependencies
)
```

**Posts to:** `#agent-tasks`

**Example output (with dependency):**
```
🚀 **CLI-009:** **Alex**: Starting work - API Clients List Ordering
**Estimated:** 1-2 hours
**Branch:** `feature/CLI-009`
**Depends on:** CLI-008 (Joseph)
```

**Example output (no dependency):**
```
🚀 **CLI-009:** **Alex**: Starting work - API Clients List Ordering
**Estimated:** 1-2 hours
**Branch:** `feature/CLI-009`
```

#### Progress Update (Optional)

```python
post_message(
    agent_name="Alex",
    task_id="CLI-009",
    message="Running tests on VM...",
    channel="agent-tasks"
)
```

**Posts to:** `#agent-tasks`

#### Completion

```python
post_completion(
    agent_name="Alex",
    task_id="CLI-009",
    duration="1.5 hours",
    commit_hash="a3b2c1d",
    ready_for="Jacob review"
)
```

**Posts to:** `#agent-tasks` (consolidated channel)

**Example output:**
```
✅ **CLI-009:** **Alex**: Task complete
**Duration:** 1.5 hours
**Commit:** `a3b2c1d`
**Ready for:** Jacob review
**Details:** See TEAM_INBOX.md Messages TO Joe
```

#### Review Verdict

```python
post_review(
    agent_name="Jacob",
    task_id="CLI-009",
    verdict="APPROVED",  # or "NEEDS_FIXES" or "BLOCKED"
    details="All checks passed",
    unblocks="CLI-010 (Maya), CLI-011 (Alex)"  # Optional: show what can proceed
)
```

**Posts to:** `#agent-tasks` (consolidated channel)

**Example output (with unblocks):**
```
📋 **CLI-009:** **Jacob**: Review ✅ APPROVED
**Details:** All checks passed
🟢 **Unblocks:** CLI-010 (Maya), CLI-011 (Alex)
```

**Example output (without unblocks):**
```
📋 **CLI-009:** **Jacob**: Review ✅ APPROVED
**Details:** All checks passed
```

**Note:** The `unblocks` field only shows for `APPROVED` verdicts (not NEEDS_FIXES/BLOCKED).

#### Unblock Notification

```python
from tools.agent_chat import post_unblock

post_unblock(
    orchestrator="Joe",
    task_ids="CLI-010 (Maya), CLI-011 (Alex)",
    reason="CLI-009 approved by Jacob"
)
```

**Posts to:** `#agent-tasks`

**Example output:**
```
🟢 **UNBLOCKED:** CLI-010 (Maya), CLI-011 (Alex)
**Reason:** CLI-009 approved by Jacob
```

#### CEO Alert

```python
from tools.agent_chat import post_ceo_alert

post_ceo_alert(
    orchestrator="Joe",
    task_id="AOS-029",
    issue="Choose rebase vs manual merge",
    impact="3 downstream tasks blocked",
    action_required="CEO to provide guidance in TEAM_INBOX",
    mention_channel=True  # Sends @channel mention
)
```

**Posts to:** `#ceo-updates`

#### CLI Usage

```bash
# Basic message
python tools/agent_chat.py Alex CLI-009 "Starting implementation"

# Specify channel
python tools/agent_chat.py Alex CLI-009 "Tests passing" completions
```

**Channels:** `agent-tasks` (default), `completions`, `reviews`, `ceo-updates`

---

## Bash Helper (`tools/agent_chat.sh`)

### Prerequisites

**Required:** `jq` (JSON parser)

Install jq:
```bash
# Windows (via Chocolatey)
choco install jq

# WSL/Linux
sudo apt install jq

# macOS
brew install jq
```

### Usage

#### Source the Script

```bash
source tools/agent_chat.sh
```

#### Task Start

```bash
agent_chat_start "Alex" "CLI-009" "API ordering" "feature/CLI-009" "1-2 hours"
```

#### Progress Update

```bash
agent_chat_message "Alex" "CLI-009" "Running tests..." "agent-tasks"
```

#### Completion

```bash
agent_chat_complete "Alex" "CLI-009" "1.5 hours" "a3b2c1d" "Jacob review"
```

#### Review Verdict

```bash
agent_chat_review "Jacob" "CLI-009" "APPROVED" "All checks passed"
```

#### CEO Alert

```bash
agent_chat_ceo_alert "Joe" "AOS-029" "Decision needed" "3 tasks blocked" "See TEAM_INBOX"
```

---

## Error Handling

**Key Principle:** Chat downtime MUST NOT break agent execution.

### How It Works

- All webhook POST requests have 5-second timeout
- Failed requests return `False` (Python) or `1` (Bash)
- Agents log warning but continue execution
- TEAM_INBOX updates always happen (chat is additive)

### Example Flow

```python
# Agent code
post_start("Alex", "CLI-009", "API ordering", "feature/CLI-009")
# Chat is down → returns False → warning logged → agent continues

# ... implementation work happens ...

# Chat comes back up
post_completion("Alex", "CLI-009", "1.5 hours", "a3b2c1d")
# Chat is up → returns True → completion message posted
```

---

## Configuration

Webhook URLs are stored in `secrets.local.json`:

```json
{
  "mattermost": {
    "base_url": "http://localhost:8065",
    "webhooks": {
      "agent_tasks": "http://localhost:8065/hooks/xxx-agent-tasks",
      "completions": "http://localhost:8065/hooks/xxx-completions",
      "reviews": "http://localhost:8065/hooks/xxx-reviews",
      "ceo_updates": "http://localhost:8065/hooks/xxx-ceo-updates"
    }
  }
}
```

**Security:** `secrets.local.json` is git-ignored. Webhook URLs are write-only (cannot read channels).

---

## Spawn Command Integration

### Joe's Orchestration Pattern (3-Step Flow)

```python
# Joe spawns agent (Step 1 - Joe posts spawn notification)
from tools.agent_chat import post_spawn
post_spawn("Joe", "Jacob", "CLI-009", "Review Alex's API changes")

# Spawn CLI agent (Step 2 - Agent posts start confirmation)
claude -p "You are Jacob. Find task CLI-009 in TEAM_INBOX.

BEFORE starting work:
from tools.agent_chat import post_start
post_start('Jacob', 'CLI-009', 'Review Alex API changes', 'feature/CLI-009')

AFTER completing work:
from tools.agent_chat import post_review
post_review('Jacob', 'CLI-009', 'APPROVED', 'All checks passed', unblocks='CLI-010 (Maya)')

Then update TEAM_INBOX Messages TO Joe section." \
--tools default --dangerously-skip-permissions &
```

**CEO visibility:**
1. Sees Joe spawn attempt immediately
2. Sees Jacob confirm he started (spawn succeeded)
3. Sees Jacob completion with operational status (unblocks Maya)

### Claude CLI Agents (General Pattern)

```bash
# Before starting work, post to chat:
claude -p "You are Alex. Find task CLI-009 in TEAM_INBOX.
Before starting, run: python tools/agent_chat.py Alex CLI-009 'Starting work' agent-tasks
During work, post progress updates as needed.
After completion, run: python tools/agent_chat.py Alex CLI-009 'Complete' completions
Then update TEAM_INBOX Messages TO Joe section." \
--tools default --dangerously-skip-permissions
```

### Codex CLI Agents

```bash
codex exec --full-auto "You are Alex. Task CLI-009. Post to chat via bash:
source tools/agent_chat.sh && agent_chat_start 'Alex' 'CLI-009' 'API work' 'feature/CLI-009'"
```

---

## Testing

### Test All Channels

```bash
# Agent tasks
python tools/agent_chat.py Alex TEST-001 "Test agent-tasks" agent-tasks

# Completions
python tools/agent_chat.py Alex TEST-001 "Test completions" completions

# Reviews
python tools/agent_chat.py Jacob TEST-001 "Test reviews" reviews

# CEO updates
python tools/agent_chat.py Joe TEST-001 "Test ceo-updates" ceo-updates
```

### Test Functions

```bash
# Task start
python -c "from tools.agent_chat import post_start; post_start('Alex', 'TEST-001', 'Test task', 'feature/TEST-001')"

# Completion
python -c "from tools.agent_chat import post_completion; post_completion('Alex', 'TEST-001', '1 hour', 'abc123', 'Testing')"

# Review
python -c "from tools.agent_chat import post_review; post_review('Jacob', 'TEST-001', 'APPROVED', 'Looks good')"
```

---

## Troubleshooting

### Messages Not Appearing

1. **Check Mattermost is running:**
   ```bash
   curl http://localhost:8065
   ```

2. **Verify webhook URLs:**
   - Open `secrets.local.json`
   - Ensure webhook URLs are valid
   - Test webhook with curl:
   ```bash
   curl -X POST http://localhost:8065/hooks/xxx \
     -H 'Content-Type: application/json' \
     -d '{"text":"Test","username":"Test"}'
   ```

3. **Check Python can access secrets:**
   ```python
   from tools.agent_chat import WEBHOOKS
   print(WEBHOOKS)
   ```

### Unicode Errors on Windows

If you see `UnicodeEncodeError`, this is Windows console encoding issue. The script **still works** - messages are posted to Mattermost successfully. The error only affects console output.

**Workaround:** Ignore the error or redirect stderr:
```bash
python tools/agent_chat.py Alex TEST "Test" 2>nul
```

### Bash Script Not Working

**Likely cause:** `jq` not installed.

**Solution:**
```bash
# Check jq
jq --version

# Install if missing (Windows)
choco install jq
```

---

## Message Flow (Orchestration Visibility)

**CRITICAL:** CEO needs to verify agents ACTUALLY started (not just that Joe attempted to spawn them).

### Expected 3-Step Flow

```python
# Step 1: Joe spawns agent
from tools.agent_chat import post_spawn
post_spawn("Joe", "Jacob", "CLI-009", "Review Alex's API changes")
# CEO sees: "**Joe** is spawning **Jacob** for CLI-009 - Review Alex's API changes"

# Step 2: Agent confirms it started (CRITICAL for verification)
# Jacob's code runs:
from tools.agent_chat import post_start
post_start("Jacob", "CLI-009", "Review Alex's API changes", "feature/CLI-009")
# CEO sees: "**Jacob** is starting work - Review Alex's API changes"

# Step 3: Agent completes with operational status
post_review("Jacob", "CLI-009", "APPROVED", "All checks passed", unblocks="CLI-010 (Maya)")
# CEO sees: "Reviewed by **Jacob**: ✅ **APPROVED** - Unblocks: CLI-010 (Maya)"
```

**Why 3 steps matter:**
- **Step 1 (Joe):** CEO knows Joe ATTEMPTED to spawn
- **Step 2 (Agent):** CEO knows agent ACTUALLY STARTED (spawn succeeded)
- **Step 3 (Agent):** CEO knows work COMPLETED with operational status

**Gap detection:** If you see Step 1 but not Step 2 → agent failed to spawn (investigate)

---

## Operational Status (Dependencies & Workflow)

The chat integration supports **operational status information** to help CEO understand task dependencies and workflow progression:

### Dependencies (`depends_on`)

Use when starting a task that depends on another task:

```python
# Maya can't start until Alex finishes
post_start(
    agent_name="Maya",
    task_id="CLI-010",
    task_description="Frontend UI for clients ordering",
    branch="feature/CLI-010",
    depends_on="CLI-009 (Alex)"
)
```

**Benefits:**
- CEO sees bottlenecks at a glance
- Clear visibility into what's blocked
- Helps with pipeline planning

### Completion Status (`ready_for`)

Already built into `post_completion()` - shows what happens next:

```python
# Default: ready for Jacob review
post_completion("Alex", "CLI-009", "1.5h", "a3b2c1d")

# Custom: ready for specific action
post_completion("Alex", "CLI-009", "1.5h", "a3b2c1d", ready_for="CEO testing on VM")
```

### Unblocked Tasks (`unblocks`)

Use when approving a task that unblocks others:

```python
# Jacob approves → Maya and Alex can proceed
post_review(
    agent_name="Jacob",
    task_id="CLI-009",
    verdict="APPROVED",
    details="All checks passed",
    unblocks="CLI-010 (Maya), CLI-011 (Alex)"
)
```

**Benefits:**
- CEO knows which agents can start working
- Clear signal for pipeline progression
- Reduces "what's next?" questions

### Example Full Workflow

```python
# 1. Joseph starts DB work (no dependencies)
post_start("Joseph", "CLI-008", "Add order column", "feature/CLI-008")

# 2. Alex starts API work (depends on Joseph)
post_start("Alex", "CLI-009", "API ordering endpoint", "feature/CLI-009",
          depends_on="CLI-008 (Joseph)")

# 3. Joseph completes
post_completion("Joseph", "CLI-008", "45m", "abc123", ready_for="Alex to use")

# 4. Alex completes
post_completion("Alex", "CLI-009", "1.5h", "def456", ready_for="Jacob review")

# 5. Jacob reviews and approves (unblocks Maya)
post_review("Jacob", "CLI-009", "APPROVED", "All good",
           unblocks="CLI-010 (Maya)")

# 6. Maya can now start
post_start("Maya", "CLI-010", "Frontend ordering UI", "feature/CLI-010")
```

---

## Best Practices

### When to Post

| Event | Post to Chat? | Update TEAM_INBOX? | Emoji |
|-------|--------------|-------------------|-------|
| **Task assigned** | ❌ No | ✅ Yes (Joe writes task) | - |
| **Agent spawned** | ✅ Yes (#agent-tasks) | ❌ No (not needed) | 🚀 |
| **Task started** | ✅ Yes (#agent-tasks) | ❌ No (not needed) | 🚀 |
| **Progress update** | ⚠️ Optional (#agent-tasks) | ❌ No (clutters TEAM_INBOX) | - |
| **Completed** | ✅ Yes (#agent-tasks) | ✅ Yes (Messages TO Joe) | ✅ |
| **Review verdict** | ✅ Yes (#agent-tasks) | ✅ Yes (Messages TO Joe) | 📋 |
| **Tasks unblocked** | ✅ Yes (#agent-tasks) | ❌ No (not needed) | 🟢 |

### Message Formatting

- Keep messages concise (1-3 lines max)
- Use markdown for emphasis: `**bold**`, `` `code` ``
- Include task ID in every message
- Use appropriate emojis for visual scanning

### Performance

- Webhook calls are async (non-blocking)
- 5-second timeout ensures no hanging
- Failed posts don't break agent execution
- Typical latency: <100ms

---

## See Also

- **PRD:** `docs/PRD_CHAT_INTEGRATION.md` - Full architecture & design
- **CLAUDE.md §1a:** Agent orchestration & spawn commands
- **TEAM_INBOX:** Canonical task tracking
- **DEV_PORTS:** Mattermost port configuration (8065)

---

**Last Updated:** 2025-12-10 (CHAT-FIXES - Channel consolidation + emoji conventions)
