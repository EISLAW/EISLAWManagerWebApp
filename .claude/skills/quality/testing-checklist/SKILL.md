# Testing Checklist

**Category:** quality
**Created:** 2025-12-12
**Author:** Alex

---

## Description

Comprehensive testing checklist to run before marking any task complete. Enforces the "Handshake Rule" - no task is done until verified working end-to-end on VM. Includes pytest, frontend build, Playwright smoke tests, and manual verification.

---

## When to Use

- Before marking a task complete
- After implementing a new feature
- After fixing a bug
- Before requesting Jacob review
- After making breaking changes
- When deploying to production

---

## Prerequisites

- Code pushed to feature branch
- GitHub Actions sync completed
- Services running on VM
- Test files exist (if applicable)

---

## Steps

### Step 1: Backend Tests (if applicable)

**Run pytest:**
```bash
cd backend
pytest tests/
```

**Check for failures:**
- All tests must pass (green)
- No skipped tests without reason
- No warnings that indicate problems

**Common test locations:**
- `backend/tests/test_api.py` - API endpoint tests
- `backend/tests/test_services.py` - Service layer tests
- `backend/tests/test_db.py` - Database tests

### Step 2: Frontend Build (always required)

**Build frontend:**
```bash
cd frontend
npm run build
```

**Check for errors:**
- Build must complete successfully
- No TypeScript errors
- No ESLint errors (unless whitelisted)
- No build warnings that indicate problems

### Step 3: Verify on VM (Handshake Rule)

**SSH to VM:**
```bash
ssh -i ~/.ssh/eislaw-dev-vm.pem azureuser@20.217.86.4
cd ~/EISLAWManagerWebApp
```

**Check services running:**
```bash
/usr/local/bin/docker-compose-v2 ps
```

**Check logs for errors:**
```bash
/usr/local/bin/docker-compose-v2 logs api --tail=100 | grep -i error
/usr/local/bin/docker-compose-v2 logs web-dev --tail=100 | grep -i error
```

**Manual verification:**
- Open http://20.217.86.4:5173 (dev) or http://20.217.86.4:8080 (prod)
- Navigate to affected pages
- Test the feature you implemented
- Click buttons, submit forms, verify behavior
- Check browser console for errors (F12)

### Step 4: Playwright Tests (if applicable)

**Run Playwright smoke tests:**
```bash
cd frontend
npx playwright test
```

**Check test results:**
- All tests pass
- No flaky tests
- Screenshots captured (if tests fail)

**Common Playwright tests:**
- `frontend/tests/smoke.spec.ts` - Basic navigation
- `frontend/tests/clients.spec.ts` - Clients module
- `frontend/tests/privacy.spec.ts` - Privacy module

### Step 5: RTL/Accessibility Check (for UI changes)

**If you modified UI components, verify:**
- Hebrew text renders correctly (RTL)
- Text alignment is proper (right-to-left)
- Touch targets are at least 48x48px
- Color contrast meets WCAG AA (use browser DevTools)
- Keyboard navigation works (Tab through form)
- Screen reader friendly (alt text, aria labels)

**Quick RTL check:**
```bash
# Open page in browser, check for:
# - Text flows right-to-left
# - Icons on correct side
# - Forms align properly
# - No overlapping text
```

### Step 6: Documentation Updated (MANDATORY)

**Check doc updates:**
- [ ] API endpoint added → `docs/API_ENDPOINTS_INVENTORY.md` updated
- [ ] Database changed → `docs/DATA_STORES.md` updated
- [ ] Module changed → `docs/*_FEATURES_SPEC.md` updated
- [ ] New doc created → `mkdocs.yml` navigation updated

**Verify mkdocs builds:**
```bash
mkdocs build
# Should complete with no errors
```

### Step 7: Git Status Clean

**Verify commits:**
```bash
git status
# Should show "working tree clean" or only intentional uncommitted files
```

**Verify branch is pushed:**
```bash
git log --oneline -3
git remote show origin
```

---

## Success Criteria

- [ ] Backend tests pass (or N/A)
- [ ] Frontend builds successfully
- [ ] Code synced to VM
- [ ] Services running on VM
- [ ] Manual verification on VM passed
- [ ] Playwright tests pass (or N/A)
- [ ] RTL/accessibility verified (for UI changes)
- [ ] Documentation updated per CLAUDE.md §8
- [ ] MkDocs builds without errors
- [ ] Git branch pushed to origin
- [ ] Ready for Jacob review

---

## Examples

### Example 1: API Endpoint Change

```bash
# 1. Run backend tests
cd backend
pytest tests/test_api.py -v

# 2. Build frontend (may use the API)
cd ../frontend
npm run build

# 3. Verify on VM
ssh -i ~/.ssh/eislaw-dev-vm.pem azureuser@20.217.86.4
cd ~/EISLAWManagerWebApp
/usr/local/bin/docker-compose-v2 logs api --tail=50
curl http://localhost:8799/api/clients?sort=name

# 4. Manual verification
# Open http://20.217.86.4:5173/clients
# Verify sorting works

# 5. Update docs
# Edit docs/API_ENDPOINTS_INVENTORY.md

# 6. Build docs
mkdocs build

# 7. Commit and push
git add docs/API_ENDPOINTS_INVENTORY.md
git commit -m "CLI-009: Update API docs"
git push origin feature/CLI-009
```

### Example 2: Frontend UI Change

```bash
# 1. Build frontend
cd frontend
npm run build

# 2. Run Playwright tests
npx playwright test tests/clients.spec.ts

# 3. Verify on VM
ssh -i ~/.ssh/eislaw-dev-vm.pem azureuser@20.217.86.4
# Open http://20.217.86.4:5173/clients
# Test new UI component
# Check RTL rendering (Hebrew text)
# Check browser console (F12)

# 4. Accessibility check
# Tab through form fields
# Check color contrast (DevTools)
# Verify touch target sizes

# 5. Update docs
# Edit docs/CLIENTS_FEATURES_SPEC.md

# 6. Verify docs build
mkdocs build

# 7. Ready for review
git push origin feature/CLI-007
```

### Example 3: Bug Fix

```bash
# 1. Run backend tests (if backend fix)
cd backend
pytest tests/test_services.py -v

# 2. Build frontend
cd ../frontend
npm run build

# 3. Verify on VM
ssh -i ~/.ssh/eislaw-dev-vm.pem azureuser@20.217.86.4
cd ~/EISLAWManagerWebApp
/usr/local/bin/docker-compose-v2 logs api --tail=100 | grep "bug_keyword"

# 4. Reproduce original bug (should be fixed)
# Test the scenario that was broken

# 5. No doc updates needed (bug fix only)

# 6. Push
git push origin feature/BUG-042
```

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| pytest fails | Fix failing tests before proceeding, never skip |
| Frontend build errors | Fix TypeScript/ESLint errors, check for missing dependencies |
| VM services not running | Run `docker-compose-v2 up -d` to start services |
| Manual verification fails | Fix the issue, don't mark task complete |
| Playwright tests timeout | Increase timeout in config, or fix flaky test |
| RTL issues | Check CSS `direction: rtl`, `text-align: right` |
| mkdocs build fails | Fix navigation errors in `mkdocs.yml`, check file paths |
| Git push rejected | Pull latest changes, resolve conflicts |

---

## Quick Reference Checklist

```markdown
## Testing Checklist (copy to task docs)

- [ ] Backend tests pass: `cd backend && pytest tests/`
- [ ] Frontend builds: `cd frontend && npm run build`
- [ ] VM sync complete: GitHub Actions green
- [ ] Services running: `docker-compose-v2 ps`
- [ ] Logs clean: `docker-compose-v2 logs api --tail=50`
- [ ] Manual test on VM: http://20.217.86.4:5173
- [ ] Playwright tests: `npx playwright test` (if applicable)
- [ ] RTL/a11y check: Hebrew renders correctly, accessible
- [ ] Docs updated: API_ENDPOINTS, DATA_STORES, feature specs
- [ ] MkDocs builds: `mkdocs build` succeeds
- [ ] Git pushed: `git push origin feature/TASK-ID`
- [ ] Ready for Jacob review
```

---

## References

- Handshake Rule: CLAUDE.md §8.2
- Testing discipline: CLAUDE.md §14
- Doc update mapping: CLAUDE.md §8
- VM details: CLAUDE.md §3
- Playwright config: `frontend/playwright.config.ts`
- RTL/a11y spec: `docs/UX_UI_Spec.md`
