import { defineConfig, devices } from '@playwright/test';
const isolated = process.env.E2E_ISOLATED === 'true';
export default defineConfig({
  testDir: './test/features',
  fullyParallel: false,
  workers: 1,
  timeout: 45000,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL:
      process.env.E2E_BASE_URL || (isolated ? 'http://127.0.0.1:5175' : 'http://localhost:5173'),
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    launchOptions: process.env.PLAYWRIGHT_CHANNEL
      ? { channel: process.env.PLAYWRIGHT_CHANNEL }
      : {},
  },
  projects: [
    {
      name: 'desktop',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 1000 } },
    },
    {
      name: 'mobile',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 390, height: 844 },
        isMobile: true,
        hasTouch: true,
      },
    },
  ],
  webServer: isolated
    ? [
        {
          command:
            'dotnet run --project ../backend/test/AutoCareManager.BrowserHost -c Release --no-launch-profile --no-restore',
          url: 'http://127.0.0.1:5081/health/live',
          reuseExistingServer: false,
          timeout: 120000,
        },
        {
          command: 'node node_modules/vite/bin/vite.js --host 127.0.0.1 --port 5175',
          url: 'http://127.0.0.1:5175',
          env: {
            API_PROXY_TARGET: 'http://127.0.0.1:5081',
            COVERAGE: process.env.COVERAGE || 'false',
          },
          reuseExistingServer: false,
          timeout: 120000,
        },
      ]
    : undefined,
});
