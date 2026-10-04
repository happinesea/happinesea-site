import { defineConfig, devices } from '@playwright/test';

const remoteBaseUrl = process.env.E2E_BASE_URL;
const localBaseUrl = 'http://127.0.0.1:4327/happinesea-site/';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  reporter: 'list',
  use: {
    baseURL: remoteBaseUrl ?? localBaseUrl,
    trace: 'retain-on-failure',
  },
  webServer: remoteBaseUrl
    ? undefined
    : {
        command: 'npm run build && npm run preview -- --host 127.0.0.1 --port 4327',
        url: localBaseUrl,
        reuseExistingServer: false,
        timeout: 120_000,
      },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
  ],
});
