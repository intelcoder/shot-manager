import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 60000,
  use: {
    trace: 'on-first-retry',
  },
  // No browser projects needed — Electron tests use electron.launch() directly
});
