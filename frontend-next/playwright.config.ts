import { defineConfig, devices } from '@playwright/test';

const frontendPort = Number(process.env.E2E_FRONTEND_PORT || 3000);
const baseURL = process.env.E2E_BASE_URL || `http://localhost:${frontendPort}`;
const defaultWebServerCommand = process.env.E2E_WEB_SERVER_CMD || `npm run start -- --hostname localhost --port ${frontendPort}`;

export default defineConfig({
  testDir: './e2e',
  timeout: 120_000,
  expect: {
    timeout: 15_000,
  },
  fullyParallel: false,
  retries: 1,
  reporter: [
    ['list'],
    ['html', { open: 'never' }],
  ],
  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
      command: defaultWebServerCommand,
      url: baseURL,
      timeout: 180_000,
      reuseExistingServer: true,
    },
});
