import { test, expect } from '@playwright/test';

test.describe('Navigation and Authentication', () => {
  test('should navigate from login to projects and memory explorer', async ({ page }) => {
    // 1. Visit Login
    await page.goto('/login');
    await expect(page.locator('text=Login to Continuum')).toBeVisible();

    // Fill in mock credentials and click submit
    await page.fill('input[type="email"]', 'admin@continuum.local');
    await page.fill('input[type="password"]', 'password');
    // We don't have actual auth logic yet, so we'll just manually navigate to simulate login success
    await page.goto('/projects');

    // 2. Check Projects Page
    await expect(page.locator('text=Projects')).toBeVisible();
    await expect(page.locator('text=Core Agent Engine')).toBeVisible();

    // Click on the project to go to memory explorer
    await page.click('text=Core Agent Engine');

    // 3. Check Memory Explorer
    await expect(page).toHaveURL(/\/projects\/proj_123\/memory/);
    await expect(page.locator('text=Memory Explorer')).toBeVisible();
    await expect(page.locator('text=Project: proj_123')).toBeVisible();
    
    // Verify memory list rendered
    await expect(page.locator('text=Use Drizzle ORM')).toBeVisible();
  });
});
