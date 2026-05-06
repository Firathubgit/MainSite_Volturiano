import { expect, test } from '@playwright/test';

test.describe('launch safety browser smoke', () => {
  test('renders builder legal pages without auth or backend secrets', async ({ page }) => {
    await page.goto('/builder/privacy');
    await expect(page.getByRole('heading', { name: /privacy policy/i })).toBeVisible();
    await expect(page.getByText(/Builder and Agent Data/i)).toBeVisible();

    await page.goto('/builder/terms');
    await expect(page.getByRole('heading', { name: /terms of service/i })).toBeVisible();
    await expect(page.getByText(/Account Data, Export, and Deletion/i)).toBeVisible();
  });

  test('renders the builder login surface and keeps terms links available', async ({ page }) => {
    await page.goto('/builder/login');
    await expect(page.getByRole('link', { name: /terms/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /privacy/i })).toBeVisible();
  });
});
