import { defineConfig } from '@playwright/test';
import base from './playwright.config';

// The frontend and backend are sibling repositories in this workspace.
export default defineConfig({
  ...base,
  testMatch: ['**/telemetry.spec.ts', '**/geolocation.spec.ts'],
  timeout: 90000,
  use: { ...base.use, baseURL: 'http://127.0.0.1:5175' },
  webServer: [
    {
      command:
        'dotnet run --project ../BackEnd/backend/test/AutoCareManager.BrowserHost --no-launch-profile --no-restore',
      url: 'http://127.0.0.1:5081/health/live',
      reuseExistingServer: false,
      timeout: 180000,
    },
    {
      command: 'node node_modules/vite/bin/vite.js --host 127.0.0.1 --port 5175',
      url: 'http://127.0.0.1:5175',
      env: { API_PROXY_TARGET: 'http://127.0.0.1:5081', COVERAGE: 'false' },
      reuseExistingServer: false,
      timeout: 120000,
    },
  ],
});
