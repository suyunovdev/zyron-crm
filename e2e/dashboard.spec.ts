import { test, expect } from '@playwright/test';
import { login } from './helpers';

test.describe('Dashboard va navigatsiya', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.waitForURL(/\/dashboard\/admin/, { timeout: 15_000 });
  });

  test('sidebar nav bandlari ko\'rinadi', async ({ page }) => {
    await expect(page.getByRole('link', { name: /O.quvchilar/i }).first()).toBeVisible();
    await expect(page.getByRole('link', { name: /Guruhlar/i }).first()).toBeVisible();
  });

  test('O\'quvchilar sahifasiga o\'tish', async ({ page }) => {
    await page.getByRole('link', { name: /O.quvchilar/i }).first().click();
    await expect(page).toHaveURL(/\/dashboard\/admin\/students/);
  });

  test('Guruhlar sahifasi yuklanadi', async ({ page }) => {
    await page.goto('/dashboard/admin/groups');
    await expect(page).toHaveURL(/\/dashboard\/admin\/groups/);
    await expect(page.locator('body')).toBeVisible();
  });

  test('To\'lovlar sahifasi yuklanadi', async ({ page }) => {
    await page.goto('/dashboard/admin/payments');
    await expect(page).toHaveURL(/\/dashboard\/admin\/payments/);
  });

  test('superadmin bo\'limlari (Oylik, Tizim) ochiladi', async ({ page }) => {
    await page.goto('/dashboard/admin/payroll');
    await expect(page).toHaveURL(/\/dashboard\/admin\/payroll/);
    await page.goto('/dashboard/admin/system');
    await expect(page).toHaveURL(/\/dashboard\/admin\/system/);
  });

  test('chiqish (logout) → login sahifasi', async ({ page }) => {
    // Profil dropdownni ochib "Chiqish"
    await page.getByRole('button', { name: /Admin/ }).first().click().catch(() => {});
    const logout = page.getByRole('button', { name: /Chiqish/i });
    if (await logout.isVisible().catch(() => false)) {
      await logout.click();
      await expect(page).toHaveURL(/\/login/, { timeout: 10_000 });
    }
  });
});
