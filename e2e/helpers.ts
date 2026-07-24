import { type Page } from '@playwright/test';

export const ADMIN = { login: 'admin', password: 'admin123' };

export async function login(page: Page, creds = ADMIN) {
  await page.goto('/login');
  await page.getByPlaceholder('Loginingizni kiriting').fill(creds.login);
  await page.getByPlaceholder('Parolni kiriting').fill(creds.password);
  await page.getByRole('button', { name: 'Kirish' }).click();
}
