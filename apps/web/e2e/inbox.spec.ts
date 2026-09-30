import { test, expect } from '@playwright/test';

test.describe('Proposal Inbox', () => {
  test('should render inbox and allow accepting/rejecting proposals', async ({ page }) => {
    // Navigate directly to the inbox of a mocked project
    await page.goto('/projects/proj_123/inbox');

    // Check Inbox header
    await expect(page.locator('text=Proposal Inbox')).toBeVisible();
    await expect(page.locator('text=proj_123')).toBeVisible();

    // Verify proposals render
    await expect(page.locator('text=Use Playwright for all E2E testing.')).toBeVisible();
    await expect(page.locator('text=Always wrap async calls in try/catch.')).toBeVisible();

    // The second proposal is a conflict
    await expect(page.locator('text=Conflict Detected')).toBeVisible();
    await expect(page.locator('text=Existing Memory')).toBeVisible();

    // Verify interaction (Reject first proposal)
    const rejectButtons = page.locator('button', { hasText: 'Reject' });
    const countBefore = await rejectButtons.count();
    expect(countBefore).toBe(2);

    await rejectButtons.first().click();

    // Check count decreased
    const countAfter = await rejectButtons.count();
    expect(countAfter).toBe(1);

    // Verify interaction (Approve the conflict proposal)
    const approveSupersedeButton = page.locator('button', { hasText: 'Approve & Supersede' });
    await expect(approveSupersedeButton).toBeVisible();
    await approveSupersedeButton.click();

    // Now Inbox should be empty
    await expect(page.locator('text=Inbox is zero! All caught up.')).toBeVisible();
  });
});
