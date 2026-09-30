import { test, expect } from '@playwright/test';

test.describe('Health Dashboard', () => {
  test('should render memory metrics and eval harness snapshot', async ({ page }) => {
    // Navigate directly to the health dashboard of a mocked project
    await page.goto('/projects/proj_123/health');

    // Check Dashboard header
    await expect(page.locator('text=Health Dashboard')).toBeVisible();
    await expect(page.locator('text=proj_123')).toBeVisible();

    // Verify metrics cards render
    await expect(page.locator('text=Total Memories')).toBeVisible();
    await expect(page.locator('text=1452')).toBeVisible();

    await expect(page.locator('text=Stale Memories')).toBeVisible();
    await expect(page.getByText('45', { exact: true })).toBeVisible();

    await expect(page.locator('text=Pending Inbox')).toBeVisible();
    await expect(page.getByText('2', { exact: true })).toBeVisible();

    await expect(page.locator('text=Active Conflicts')).toBeVisible();
    await expect(page.getByText('1', { exact: true })).toBeVisible();

    // Verify Eval Harness Snapshot renders
    await expect(page.locator('text=Eval Harness Snapshot')).toBeVisible();
    await expect(page.locator('text=Extraction Precision')).toBeVisible();
    await expect(page.locator('text=87.4%')).toBeVisible();
    await expect(page.locator('text=Retrieval NDCG@10')).toBeVisible();
  });
});
