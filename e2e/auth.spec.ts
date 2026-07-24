import { test, expect } from '@playwright/test';
import { login } from './helpers';

test.describe('Autentifikatsiya', () => {
  test('tizimga kirmasdan /dashboard/admin → /login ga yo\'naltiradi', async ({ page }) => {
    await page.goto('/dashboard/admin');
    await expect(page).toHaveURL(/\/login/);
  });

  test('login sahifasi yuklanadi', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByPlaceholder('Loginingizni kiriting')).toBeVisible();
    await expect(page.getByPlaceholder('Parolni kiriting')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Kirish' })).toBeVisible();
  });

  test('noto\'g\'ri parol → xato xabari, sahifada qoladi', async ({ page }) => {
    await login(page, { login: 'admin', password: 'notright-xyz' });
    await expect(page.getByText(/noto.g.ri/i)).toBeVisible();
    await expect(page).toHaveURL(/\/login/);
  });

  test('to\'g\'ri login → dashboard', async ({ page }) => {
    await login(page);
    await expect(page).toHaveURL(/\/dashboard\/admin/, { timeout: 15_000 });
  });
});
