# Testing Checklist Skill

**Category:** Quality Gate
**Version:** 1.0.0
**Author:** Alex
**Created:** 2025-12-12

## Purpose

Comprehensive pre-completion testing checklist that ensures no task is marked complete without proper validation. Enforces EISLAW's testing discipline from CLAUDE.md §14.

## What It Does

This Skill runs a complete validation suite before marking any task complete:

1. **Git Status Check** - Verifies correct branch, clean working tree
2. **Backend Tests** - Runs pytest suite for backend/fullstack tasks
3. **Frontend Lint** - Runs ESLint for frontend/fullstack tasks (optional)
4. **Frontend Build** - Verifies Vite build succeeds for frontend/fullstack tasks
5. **Playwright Smoke** - Runs @smoke tagged tests for UI changes (optional)
6. **Docs Check** - Verifies documentation updates per CLAUDE.md §8 mapping
7. **MkDocs Build** - Ensures MkDocs builds successfully for new docs

## When to Use

**MANDATORY before marking any task complete.** Use after:
- Implementing a feature
- Fixing a bug
- Making any code change
- Creating new documentation

**DO NOT mark work complete without running this Skill.**

## Usage

### Basic Usage

```bash
# Invoke via Claude Skills
/skill testing-checklist task_id=CLI-009 task_type=backend branch=feature/CLI-009
```

### Task Type Selection

| Task Type | When to Use | Checks Run |
|-----------|-------------|------------|
| `backend` | API, database, Python only | Git, pytest, docs |
| `frontend` | React, UI, TypeScript only | Git, lint, build, Playwright, docs |
| `fullstack` | Both backend + frontend | All checks |
| `docs` | Documentation only | Git, MkDocs build |
| `infrastructure` | Docker, CI/CD, VM setup | Git, docs |

### Examples

```bash
# Backend API task
/skill testing-checklist task_id=CLI-009 task_type=backend branch=feature/CLI-009

# Frontend UI task
/skill testing-checklist task_id=CLI-007 task_type=frontend branch=feature/CLI-007

# Full-stack feature
/skill testing-checklist task_id=STORAGE-005 task_type=fullstack branch=feature/STORAGE-005

# Documentation task
/skill testing-checklist task_id=DOC-002 task_type=docs branch=main
```

## What Gets Checked

### Git Status
- Current branch matches expected branch
- No uncommitted changes (or all changes committed)
- Branch exists and is up-to-date

### Backend Tests (backend/fullstack only)
```bash
cd backend && python -m pytest tests/ -v --tb=short
```
- All pytest tests must pass
- No failures, no errors
- Coverage thresholds met (if configured)

### Frontend Lint (frontend/fullstack, optional)
```bash
cd frontend && npm run lint
```
- ESLint passes
- No errors (warnings acceptable)

### Frontend Build (frontend/fullstack)
```bash
cd frontend && npm run build
```
- Vite build succeeds
- No TypeScript errors
- No build failures
- Assets generated successfully

### Playwright Smoke (frontend/fullstack, optional)
```bash
cd frontend && npx playwright test --grep @smoke
```
- Smoke tests pass for affected routes
- No UI regressions
- Screenshots/videos captured for review

### Docs Check
Verifies documentation updated per CLAUDE.md §8 mapping:

| If you changed... | Must update... |
|-------------------|----------------|
| API endpoint | `docs/API_ENDPOINTS_INVENTORY.md` |
| Database schema | `docs/DATA_STORES.md` |
| Clients module | `docs/CLIENTS_FEATURES_SPEC.md` |
| New doc created | `mkdocs.yml` navigation |

### MkDocs Build (docs tasks only)
```bash
mkdocs build --strict
```
- Build succeeds with no errors
- All navigation links valid
- All referenced files exist

## Output

The Skill returns:

```json
{
  "checklist_passed": true/false,
  "failed_checks": ["backend_tests", "docs_check"],
  "summary": "Testing Checklist for CLI-009:\n- Git: PASS\n- Backend Tests: FAIL (3 failures)\n- Docs Updated: FAIL (API_ENDPOINTS_INVENTORY.md not updated)\n\nResult: FAIL"
}
```

## Failure Handling

If any check fails:
1. **DO NOT mark task complete**
2. Fix the failing checks
3. Re-run the Skill
4. Only mark complete when `checklist_passed: true`

## Integration with Workflow

This Skill is part of the completion workflow:

```
Code Implementation
    ↓
Run testing-checklist Skill
    ↓
All checks pass? → NO → Fix issues → Retry
    ↓ YES
Update TEAM_INBOX
    ↓
Post completion message
    ↓
Trigger Jacob review
```

## References

- **CLAUDE.md §8** - Docs Update Rule
- **CLAUDE.md §14** - Testing & Validation Discipline
- **docs/Testing_Episodic_Log.md** - Past test failures and lessons
- **docs/TASK_TEMPLATE.md** - Task completion checklist

## Maintenance

**Owner:** Alex
**Review Frequency:** Monthly
**Update Triggers:**
- New test types added to project
- New documentation requirements
- Changes to build process
- Team feedback on missing checks

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2025-12-12 | Initial implementation with 7 check types |
