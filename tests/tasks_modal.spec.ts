import { test, expect } from '@playwright/test';

const CLIENT_NAME = 'Yael Shamir';
const encodedName = encodeURIComponent(CLIENT_NAME);

test.describe('Client task modal flows', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      try {
        localStorage.removeItem('eislaw.tasks.v1');
        localStorage.removeItem('eislaw.taskArchive.v1');
      } catch {}
    });
    await page.goto(`/#/clients/${encodedName}?tab=overview`);
    await page.waitForLoadState('networkidle');
  });

  test('adding tasks/subtasks via modal reflects immediately', async ({ page }) => {
    const rootTitle = 'בדיקת משימה ראשית';
    const newTaskInput = page.getByLabel('New task');
    await newTaskInput.fill(rootTitle);
    await page.getByRole('button', { name: /^Add$/ }).click();
    await expect(page.locator('div').filter({ hasText: rootTitle }).first()).toBeVisible();

    await page.getByRole('button', { name: 'Open' }).first().click();
    const modal = page.getByTestId('task-modal');
    await expect(modal).toBeVisible();

    const taskRows = modal.locator('[data-testid="tm.task.item"]');
    const initialCount = await taskRows.count();

    await modal.getByTestId('tm.task.add_root').click();
    await expect(taskRows).toHaveCount(initialCount + 1);

    const subtaskName = 'בדיקת תת-משימה';
    const firstComposer = modal.locator('input[placeholder="הוסף תת-משימה"]').first();
    await firstComposer.fill(subtaskName);
    await modal.locator('[data-testid="tm.subtask.add"]').first().click();
    await expect(modal.locator('[data-testid="tm.task.item"]').filter({ hasText: subtaskName })).toBeVisible();

    await modal.getByTestId('tm.modal.close').click();
    await expect(modal).toBeHidden();
  });
});
