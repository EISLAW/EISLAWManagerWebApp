# EISLAW Regression Test Suite

Automated Playwright tests for core functionality regression testing.

## Test Coverage

| File | Module | Test Count |
|------|--------|------------|
| clients.spec.ts | Clients | 6 |
| tasks.spec.ts | Tasks | 5 |
| privacy.spec.ts | Privacy | 4 |
| ai-studio.spec.ts | AI Studio | 5 |
| settings.spec.ts | Settings | 4 |
| **Total** | | **24** |

## Quick Start

### Prerequisites

```bash
# Install Playwright (if not already installed)
npm install -D @playwright/test
npx playwright install chromium
```

### Run All Regression Tests

```bash
# From project root
npx playwright test --config=tests/regression/playwright.regression.config.ts
```

### Run Specific Test File

```bash
npx playwright test tests/regression/clients.spec.ts --config=tests/regression/playwright.regression.config.ts
```

### Run with UI Mode

```bash
npx playwright test --config=tests/regression/playwright.regression.config.ts --ui
```

### Generate HTML Report

```bash
npx playwright test --config=tests/regression/playwright.regression.config.ts --reporter=html

# Open report
npx playwright show-report playwright-report/regression
```

## Configuration

### Target URL

Tests run against the Azure VM by default: `http://20.217.86.4:5173`

To test locally:

```bash
TEST_URL=http://localhost:5173 npx playwright test --config=tests/regression/playwright.regression.config.ts
```

### Test Projects

- **Desktop**: 1920x1080 Chrome
- **Mobile**: 375x667 iPhone 13

Run only mobile tests:

```bash
npx playwright test --config=tests/regression/playwright.regression.config.ts --project=Mobile
```

## Test Details

### Clients Tests (6)
1. Client list loads with title
2. Search input filters clients
3. Client detail opens when clicking row
4. Client detail shows all 6 tabs
5. Archive client button exists
6. Client detail tabs switch correctly

### Tasks Tests (5)
1. Task section loads on client page
2. Create new task
3. Mark task as done
4. Delete task
5. Task persists after page reload

### Privacy Tests (4)
1. Privacy page loads
2. Client list visible on privacy page
3. Privacy score display works
4. Buttons meet 44px minimum touch target

### AI Studio Tests (5)
1. AI Studio page loads with correct title
2. Chat input is visible
3. Provider selector works
4. Agent Mode toggle is visible
5. Mobile layout works at 375px

### Settings Tests (4)
1. Settings page loads
2. Settings cards are visible
3. Settings text is in Hebrew
4. Navigation to sub-pages works

## Troubleshooting

### Tests fail to connect

Verify the Azure VM is accessible:

```bash
curl http://20.217.86.4:5173
```

### Timeout errors

Increase timeout in config:

```typescript
timeout: 60_000, // 60 seconds
```

### Screenshots on failure

Screenshots are saved to `playwright-report/regression/` when tests fail.

## Adding New Tests

1. Create a new `.spec.ts` file in `tests/regression/`
2. Follow the existing pattern:

```typescript
import { test, expect } from '@playwright/test';

test.describe('Module Name Regression', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/#/route');
    await page.waitForLoadState('networkidle');
  });

  test('descriptive test name', async ({ page }) => {
    // Test implementation
  });
});
```

3. Update this README with new test counts

## Maintenance

- Run regression tests after every deployment
- Update tests when UI changes
- Keep test count at 20+ for adequate coverage
