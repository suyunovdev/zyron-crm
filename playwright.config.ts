import { defineConfig, devices } from '@playwright/test';

/**
 * E2E testlar (Playwright) — haqiqiy brauzerda user oqimlari.
 * Lokalda ishlab turgan dev serverni qayta ishlatadi; bo'lmasa o'zi ishga tushiradi.
 * Ishga tushirish:  npm run test:e2e
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [['list']],
  timeout: 30_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    // Foydalanuvchilar O'zbekiston vaqtida
    timezoneId: 'Asia/Tashkent',
    locale: 'uz-UZ',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: {
    command: process.env.CI ? 'npm run start' : 'npm run dev',
    url: 'http://localhost:3000/login',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
