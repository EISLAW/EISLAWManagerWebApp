#!/bin/bash
#
# Agent Chat Integration - Bash Helper
#
# Posts messages to Mattermost via incoming webhooks.
# Gracefully handles chat service downtime (no-op if webhook fails).
#
# Usage:
#   source tools/agent_chat.sh
#
#   agent_chat_start "Alex" "CLI-009" "API ordering" "feature/CLI-009"
#   agent_chat_message "Alex" "CLI-009" "Running tests..."
#   agent_chat_complete "Alex" "CLI-009" "1.5 hours" "a3b2c1d"
#   agent_chat_review "Jacob" "CLI-009" "APPROVED" "All checks passed"

# Load webhook URLs from secrets.json
# Handle both Windows and WSL paths
if [[ "$OSTYPE" == "msys" || "$OSTYPE" == "win32" ]]; then
    # Windows CMD or Git Bash
    SECRETS_FILE="C:/Coding Projects/EISLAW System Clean/secrets.local.json"
elif [[ -d "/mnt/c/Coding Projects/EISLAW System Clean" ]]; then
    # WSL environment
    SECRETS_FILE="/mnt/c/Coding Projects/EISLAW System Clean/secrets.local.json"
else
    # Fallback - relative path from script location
    SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
    SECRETS_FILE="${SCRIPT_DIR}/secrets.local.json"
fi

# Extract webhook URLs (requires jq)
if command -v jq &> /dev/null; then
    WEBHOOK_AGENT_TASKS=$(jq -r '.mattermost.webhooks.agent_tasks // empty' "$SECRETS_FILE" 2>/dev/null)
    WEBHOOK_COMPLETIONS=$(jq -r '.mattermost.webhooks.completions // empty' "$SECRETS_FILE" 2>/dev/null)
    WEBHOOK_REVIEWS=$(jq -r '.mattermost.webhooks.reviews // empty' "$SECRETS_FILE" 2>/dev/null)
    WEBHOOK_CEO_UPDATES=$(jq -r '.mattermost.webhooks.ceo_updates // empty' "$SECRETS_FILE" 2>/dev/null)
else
    echo "[CHAT] Warning: jq not installed, chat integration disabled" >&2
fi

# Internal helper to POST to webhook
_post_webhook() {
    local webhook_url="$1"
    local payload="$2"

    if [[ -z "$webhook_url" ]]; then
        # Chat not configured - graceful degradation
        return 1
    fi

    curl -s -X POST \
        -H 'Content-Type: application/json' \
        -d "$payload" \
        "$webhook_url" \
        --max-time 5 \
        > /dev/null 2>&1

    return $?
}

# Post generic message
agent_chat_message() {
    local agent_name="$1"
    local task_id="$2"
    local message="$3"
    local channel="${4:-agent-tasks}"  # Default to agent-tasks
    local emoji="${5:-:wrench:}"

    local webhook_url
    case "$channel" in
        "agent-tasks") webhook_url="$WEBHOOK_AGENT_TASKS" ;;
        "completions") webhook_url="$WEBHOOK_COMPLETIONS" ;;
        "reviews") webhook_url="$WEBHOOK_REVIEWS" ;;
        "ceo-updates") webhook_url="$WEBHOOK_CEO_UPDATES" ;;
        *) webhook_url="$WEBHOOK_AGENT_TASKS" ;;
    esac

    local payload=$(cat <<EOF
{
  "username": "$agent_name",
  "icon_emoji": "$emoji",
  "text": "**$task_id:** $message"
}
EOF
)

    _post_webhook "$webhook_url" "$payload"
}

# Post task start
agent_chat_start() {
    local agent_name="$1"
    local task_id="$2"
    local task_desc="$3"
    local branch="$4"
    local estimated="${5:-1-2 hours}"

    local message="🔄 **Starting:** $task_id - $task_desc\n**Estimated:** $estimated\n**Branch:** \`$branch\`"

    agent_chat_message "$agent_name" "$task_id" "$message" "agent-tasks" ":arrows_counterclockwise:"
}

# Post completion
agent_chat_complete() {
    local agent_name="$1"
    local task_id="$2"
    local duration="$3"
    local commit_hash="$4"
    local ready_for="${5:-Jacob review}"

    local message="✅ **Completed:** $task_id\n**Duration:** $duration\n**Commit:** \`$commit_hash\`\n**Ready for:** $ready_for\n**Details:** See TEAM_INBOX.md Messages TO Joe"

    # Changed from "completions" to "agent-tasks" per CHAT-FIXES consolidation
    agent_chat_message "$agent_name" "$task_id" "$message" "agent-tasks" ":white_check_mark:"
}

# Post review verdict
agent_chat_review() {
    local agent_name="$1"  # Usually "Jacob"
    local task_id="$2"
    local verdict="$3"  # APPROVED / NEEDS_FIXES / BLOCKED
    local details="$4"

    local emoji icon
    case "$verdict" in
        "APPROVED")
            emoji="✅"
            icon=":white_check_mark:"
            ;;
        "NEEDS_FIXES")
            emoji="⚠️"
            icon=":warning:"
            ;;
        "BLOCKED")
            emoji="❌"
            icon=":x:"
            ;;
        *)
            emoji="🔍"
            icon=":mag:"
            ;;
    esac

    local message="$emoji **$verdict:** $task_id\n**Details:** $details"

    # Changed from "reviews" to "agent-tasks" per CHAT-FIXES consolidation
    agent_chat_message "$agent_name" "$task_id" "$message" "agent-tasks" "$icon"
}

# Post CEO alert
agent_chat_ceo_alert() {
    local orchestrator="$1"  # Usually "Joe"
    local task_id="$2"
    local issue="$3"
    local impact="$4"
    local action_required="$5"

    local payload=$(cat <<EOF
{
  "username": "$orchestrator",
  "icon_emoji": ":rotating_light:",
  "text": "@channel 🚨 **PIPELINE BLOCKED:** $task_id\n**Issue:** $issue\n**Impact:** $impact\n**Action Required:** $action_required"
}
EOF
)

    _post_webhook "$WEBHOOK_CEO_UPDATES" "$payload"
}
