import { defineConfig, devices } from '@playwright/test';

// Шесть ширин: телефон, планшет и обе стороны границы lg (991/992),
// где Offcanvas превращается в sidebar.
export const WIDTHS = [320, 375, 768, 991, 992, 1440];
const BROWSERS = {
  chromium: devices['Desktop Chrome'],
  firefox: devices['Desktop Firefox'],
  webkit: devices['Desktop Safari'],
};

const matrix = Object.entries(BROWSERS).flatMap(([browser, device]) =>
  WIDTHS.map((width) => ({
    name: `${browser}-${width}`,
    testMatch: /matrix\.spec\.js/,
    use: { ...device, viewport: { width, height: 800 } },
  })),
);

// Сценарии контекста: по каждому браузеру на телефоне и на десктопе.
const context = Object.entries(BROWSERS).flatMap(([browser, device]) =>
  [375, 1280].map((width) => ({
    name: `context-${browser}-${width}`,
    testMatch: /context\.spec\.js/,
    use: { ...device, viewport: { width, height: 800 } },
  })),
);

export default defineConfig({
  testDir: 'tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: process.env.CI
    ? [['list'], ['github'], ['json', { outputFile: 'test-results/results.json' }], ['html', { open: 'never' }]]
    : [['list'], ['json', { outputFile: 'test-results/results.json' }]],
  use: {
    baseURL: 'http://127.0.0.1:4173',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'node tests/serve.js',
    url: 'http://127.0.0.1:4173/',
    reuseExistingServer: !process.env.CI,
  },
  projects: [...matrix, ...context],
});
