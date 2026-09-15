const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './qc',
  outputDir: 'qc-output/test-results',
  timeout: 60000,
  expect: { timeout: 10000 },
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list'], ['html', { outputFolder: 'qc-output/playwright-report', open: 'never' }]],
  use: {
    baseURL: 'http://127.0.0.1:4173',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure'
  },
  projects: [
    {
      name: 'android-chromium',
      use: { ...devices['Pixel 5'], browserName: 'chromium' }
    },
    {
      name: 'iphone-webkit',
      use: { ...devices['iPhone 13'], browserName: 'webkit' }
    }
  ],
  webServer: {
    command: 'python3 -m http.server 4173 --bind 127.0.0.1',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 30000
  }
});
