#!/bin/bash
# Task Completion Validation Script
# Usage: bash tools/validate_task_completion.sh {TASK-ID}
#
# Validates that an agent has completed all mandatory checklist items
# before marking a task as DONE.
#
# Exit codes:
#   0 = All checks passed
#   1 = One or more checks failed

set -e

TASK_ID="$1"

if [ -z "$TASK_ID" ]; then
    echo "❌ ERROR: Task ID required"
    echo "Usage: bash tools/validate_task_completion.sh {TASK-ID}"
    exit 1
fi

echo "=================================================="
echo "TASK COMPLETION VALIDATION: $TASK_ID"
echo "=================================================="
echo ""

FAILURES=0

# ============================================================
# Git Checks
# ============================================================

echo "🔍 Git Branch Check..."
CURRENT_BRANCH=$(git branch --show-current)
EXPECTED_BRANCH="feature/$TASK_ID"

if [ "$CURRENT_BRANCH" != "$EXPECTED_BRANCH" ]; then
    echo "   ❌ FAIL: On branch '$CURRENT_BRANCH' (expected '$EXPECTED_BRANCH')"
    FAILURES=$((FAILURES + 1))
else
    echo "   ✅ PASS: On correct branch '$EXPECTED_BRANCH'"
fi

echo ""
echo "🔍 Git Commit Check..."
UNCOMMITTED=$(git status --porcelain)
if [ -n "$UNCOMMITTED" ]; then
    echo "   ❌ FAIL: Uncommitted changes detected:"
    git status --short
    FAILURES=$((FAILURES + 1))
else
    echo "   ✅ PASS: No uncommitted changes"
fi

echo ""
echo "🔍 Git Push Check..."
UNPUSHED=$(git log @{u}.. --oneline 2>/dev/null || echo "")
if [ -n "$UNPUSHED" ]; then
    echo "   ❌ FAIL: Unpushed commits detected:"
    git log @{u}.. --oneline
    FAILURES=$((FAILURES + 1))
else
    # Check if branch has remote tracking
    if git rev-parse --abbrev-ref --symbolic-full-name @{u} >/dev/null 2>&1; then
        echo "   ✅ PASS: All commits pushed to remote"
    else
        echo "   ❌ FAIL: Branch not pushed to remote (no upstream tracking)"
        FAILURES=$((FAILURES + 1))
    fi
fi

echo ""
echo "🔍 Untracked Files Check..."
UNTRACKED=$(git ls-files --others --exclude-standard)
if [ -n "$UNTRACKED" ]; then
    echo "   ⚠️  WARNING: Untracked files detected (should these be committed?):"
    echo "$UNTRACKED"
    # Not a hard failure - agent may have created temp files
else
    echo "   ✅ PASS: No untracked files"
fi

# ============================================================
# Documentation Checks
# ============================================================

echo ""
echo "🔍 TEAM_INBOX Completion Message Check..."
INBOX_FILE="C:/Coding Projects/EISLAW System Clean/docs/TEAM_INBOX.md"

if grep -q "$TASK_ID.*COMPLETE\|$TASK_ID.*FIXES COMPLETE\|$TASK_ID.*DONE" "$INBOX_FILE"; then
    echo "   ✅ PASS: Completion message found in TEAM_INBOX"
else
    echo "   ❌ FAIL: No completion message for $TASK_ID in TEAM_INBOX"
    echo "   Expected to see '$TASK_ID' with status COMPLETE/FIXES COMPLETE/DONE"
    FAILURES=$((FAILURES + 1))
fi

# ============================================================
# Summary
# ============================================================

echo ""
echo "=================================================="
if [ $FAILURES -eq 0 ]; then
    echo "✅ ALL CHECKS PASSED"
    echo "=================================================="
    echo ""
    echo "Task $TASK_ID is ready for Jacob review."
    exit 0
else
    echo "❌ $FAILURES CHECK(S) FAILED"
    echo "=================================================="
    echo ""
    echo "REQUIRED FIXES:"
    echo "1. Create/switch to feature branch: git checkout -b $EXPECTED_BRANCH"
    echo "2. Commit all changes: git add -A && git commit -m \"$TASK_ID: description\""
    echo "3. Push to remote: git push -u origin $EXPECTED_BRANCH"
    echo "4. Update TEAM_INBOX with completion message"
    echo ""
    echo "See CLAUDE.md §3 (Git Workflow) and §8 (Completion Checklist) for details."
    exit 1
fi
