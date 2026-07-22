import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    // Test uchun dummy env (auth.ts import paytida JWT_SECRET talab qiladi)
    env: {
      JWT_SECRET: 'test-secret-for-vitest',
    },
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
});
