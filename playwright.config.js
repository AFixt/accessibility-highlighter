/**
 * Playwright Configuration for Accessibility Highlighter E2E Tests
 * @type {import('@playwright/test').PlaywrightTestConfig}
 */
module.exports = {
  testDir: './tests/e2e',
  timeout: 30000,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    headless: true,
  },
  projects: [
    {
      name: 'chromium',
      use: { 
        ...require('@playwright/test').devices['Desktop Chrome'],
        // Enable Chrome extension testing
        launchOptions: {
          args: [
            '--disable-extensions-except=./dist',
            '--load-extension=./dist'
          ]
        }
      },
    },
  ],
  webServer: {
    command: 'python3 -m http.server 3000 --directory tests/fixtures',
    port: 3000,
    reuseExistingServer: !process.env.CI,
  },
};