# Self-Heal Skill

**Category:** Quality Gate / Recovery
**Version:** 1.0.0
**Author:** Alex
**Created:** 2025-12-12

## Purpose

Guided self-healing and recovery system for EISLAW agent degradation. Implements CLAUDE.md §17 self-healing procedure with structured detection, diagnosis, and recovery for common failure patterns.

## What It Does

This Skill:

1. **Detects** degradation symptoms (12 common failure patterns)
2. **Diagnoses** root cause from CLAUDE.md §16 failure patterns
3. **Recovers** by reloading context, verifying persona, and applying symptom-specific fixes
4. **Logs** incident to episodic memory for future learning
5. **Prevents** recurrence with actionable recommendations

## When to Use

**Trigger self-healing ONLY on clear degradation:**

- Inability to use MCP tools properly
- Loss of autonomy (asking user to do technical tasks)
- Incorrect persona mode
- Path/workspace confusion
- Drift from CLAUDE.md rules
- Reasoning loops (analyzing without progress)
- Endless retries (same failure repeatedly)
- Acting on stale data
- Treating errors as valid data
- Scope creep (overengineering simple tasks)

**DO NOT trigger on:**
- Normal operation
- First-time errors (try alternative approach first)
- User clarification requests (acceptable)
- Planned complexity (per PRD requirements)

## Usage

### Basic Usage

```bash
# Invoke when degradation detected
/skill self-heal symptom=reasoning_loop context="Stuck analyzing 3 approaches for 5 iterations"
```

### Symptom Reference

| Symptom | Description | Example |
|---------|-------------|---------|
| `reasoning_loop` | Going in circles without progress | Analyzing same 3 approaches for 10 iterations |
| `endless_retry` | Same action failing repeatedly | Git push failed 5 times with same error |
| `stale_data` | Acting on old/cached information | Using client list from 2 days ago |
| `error_as_data` | Treating error messages as valid responses | Parsing "404 Not Found" as client data |
| `memory_hallucination` | Assuming memory contains missing info | Referencing TASK-123 details that were never read |
| `unsafe_writes` | Writing without validation | Editing file without verifying it exists |
| `scope_creep` | Heavy changes for trivial tasks | Refactoring 10 files to fix a typo |
| `tool_failure` | Inability to use MCP tools | Bash tool not responding, MCP timeout |
| `lost_autonomy` | Asking user to do technical tasks | "Please run npm install for me" |
| `wrong_persona` | Acting as wrong team member | Alex doing Maya's frontend task |
| `path_confusion` | Wrong workspace/paths | Using `/EISLAW System/` instead of `/EISLAW System Clean/` |
| `drift_from_rules` | Violating CLAUDE.md rules | Mixing planning and execution phases |

### Examples

```bash
# Reasoning loop detected
/skill self-heal symptom=reasoning_loop context="Can't decide between 3 API designs"

# Endless retry
/skill self-heal symptom=endless_retry context="Docker build failing 6 times"

# Lost autonomy
/skill self-heal symptom=lost_autonomy context="Asked user to SSH to VM"

# Path confusion
/skill self-heal symptom=path_confusion context="Trying to read from wrong project folder"
```

## How It Works

### Step 1: Detect Pattern

Identifies which of 12 failure patterns is occurring:

```
Pattern: reasoning_loop
Description: "Going in circles without progress"
Evidence: Multiple analysis iterations without decision
```

### Step 2: Reload Context

Re-reads core context files:
- `CLAUDE.md` - All rules and procedures
- `TEAM_INBOX.md` - Current task assignments
- `Testing_Episodic_Log.md` - Past failures and lessons

### Step 3: Verify Persona

Checks current persona matches task assignment:
- Default: Alex (if unclear)
- Check TEAM_INBOX for task owner
- Re-activate correct persona if wrong

### Step 4: Check Tools (if tool_failure)

Verifies MCP tools are available:
- Lists available tools in session
- Checks MCP server status
- Identifies missing/failed tools

### Step 5: Verify Workspace

Confirms correct working directory:
```bash
pwd  # Should be: C:/Coding Projects/EISLAW System Clean
```

### Step 6: Apply Symptom-Specific Fix

| Symptom | Fix Applied |
|---------|-------------|
| `reasoning_loop` | Make a decision immediately, stop analyzing |
| `endless_retry` | Change approach or escalate to user |
| `stale_data` | Re-fetch from source of truth |
| `error_as_data` | Recognize error, handle gracefully |
| `memory_hallucination` | Check file existence, don't assume |
| `unsafe_writes` | Validate target before write |
| `scope_creep` | Match effort to task size |
| `tool_failure` | Check tool list, use alternative |
| `lost_autonomy` | Execute autonomously, never delegate |
| `wrong_persona` | Re-activate correct persona |
| `path_confusion` | Use absolute paths from CLAUDE.md |
| `drift_from_rules` | Re-read relevant CLAUDE.md sections |

### Step 7: Log Incident

Appends to `docs/Testing_Episodic_Log.md`:

```markdown
## Self-Heal Incident: reasoning_loop
**Date:** 2025-12-12
**Context:** Stuck analyzing 3 API design approaches for 5 iterations
**Steps Taken:**
1. Reloaded CLAUDE.md
2. Verified Alex persona
3. Stopped analysis, chose safest option (REST endpoint per existing pattern)
4. Executed implementation
**Outcome:** SUCCESS
**Prevention:** Set max 2 iterations for design decisions; default to existing patterns
```

## Recovery Playbooks

### Reasoning Loop
1. Stop analysis phase
2. List concrete options (max 3)
3. Choose the safest option
4. Execute immediately
5. Set flag: `reasoning_loop_broken = true`

### Endless Retry
1. Count retry attempts (if > 3, STOP)
2. Analyze what's different from previous tries
3. If nothing different, change approach entirely
4. If approach exhausted, escalate to user with clear explanation

### Stale Data
1. Identify data source (file, API, memory)
2. Re-fetch from source of truth
3. Validate freshness (timestamp, version)
4. Clear any cached/remembered state
5. Proceed with fresh data

### Tool Failure
1. List available tools in current session
2. Check if tool exists in list
3. Verify MCP server status (if applicable)
4. Use alternative tool or approach
5. Log tool failure for future reference

### Lost Autonomy
1. Re-read CLAUDE.md §6 (Autonomy rules)
2. Identify what you're asking user to do
3. Determine correct tool/command to do it yourself
4. Execute autonomously
5. Never ask user for technical tasks again

### Path Confusion
1. Re-read CLAUDE.md Path Reference table
2. Use absolute paths from table
3. Verify file exists before operating
4. Update internal path map

## Output

The Skill returns:

```json
{
  "healed": true,
  "steps_taken": [
    "Reloaded CLAUDE.md",
    "Verified Alex persona (correct)",
    "Applied reasoning_loop fix: chose safest option",
    "Logged incident to episodic memory"
  ],
  "recommendations": [
    "Set max 2 iterations for design decisions",
    "Default to existing patterns when uncertain",
    "Use bounded creativity rule: implement conservatively"
  ]
}
```

## Constraints

### Max Self-Heals Per Session
- **Limit:** 1 self-heal per session
- **Cooldown:** 50 messages between self-heals
- **Reason:** Prevent self-heal loops

### Escalation Policy
If self-healing fails or issue persists:
1. **First time:** Log to episodic memory
2. **Second occurrence (different session):** Escalate to user with:
   - Symptom description
   - Recovery steps attempted
   - Why recovery failed
   - User action needed (if any)

### Silent Operation
- Self-healing is **silent** (don't announce it to user)
- Only log to episodic memory
- Continue task execution after recovery
- Exception: Escalation requires user notification

## Integration with Workflow

```
Degradation Detected
    ↓
Run self-heal Skill
    ↓
Recovery successful? → NO → Escalate to user
    ↓ YES
Log to episodic memory
    ↓
Continue task execution
    ↓
Monitor for recurrence
```

## Prevention Strategies

### After Self-Healing
1. **Update episodic log** with incident details
2. **Review recent changes** that triggered degradation
3. **Add safeguards** to prevent recurrence
4. **Document pattern** for future reference

### Proactive Measures
- **Read episodic log** before starting similar tasks
- **Follow CLAUDE.md rules** strictly
- **Use Skills** for common procedures (reduces errors)
- **Test frequently** (catch issues early)
- **Ask clarifying questions** when truly uncertain

## References

- **CLAUDE.md §16** - Failure Patterns to Avoid
- **CLAUDE.md §17** - Self-Healing Procedure
- **docs/Testing_Episodic_Log.md** - Past incidents and lessons

## Maintenance

**Owner:** Alex
**Review Frequency:** Monthly
**Update Triggers:**
- New failure patterns identified
- Recovery playbook improvements
- Team feedback on effectiveness
- Changes to CLAUDE.md rules

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2025-12-12 | Initial implementation with 12 symptoms and recovery playbooks |

## Troubleshooting

### Self-Heal Doesn't Fix Issue
1. Check symptom is correctly identified
2. Review context provided
3. Verify CLAUDE.md is up-to-date
4. Escalate to user if persistent

### Multiple Self-Heals Needed
- **RED FLAG:** System degradation is severe
- Review recent changes
- Check for infrastructure issues (MCP servers down, VM issues)
- Escalate to CEO/CTO

### Self-Heal Too Aggressive
- Adjust constraints in manifest.json
- Increase cooldown period
- Refine symptom detection criteria
