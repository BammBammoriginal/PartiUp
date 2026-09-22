const { defineConfig, devices } = require('@playwright/test');
const path = require('path');

const qaRunId = `${process.pid}-${Date.now()}`;
const qaDbPath = path.join(__dirname, 'data', `qa-bottomupparti-${qaRunId}.db`);
const authFile = path.join(__dirname, 'tests', '.auth', 'user.json');
// One shared desktop viewport prevents authentication setup and the suites from
// silently drifting apart. At smaller desktop heights the identity control is
// intentionally outside the visible navigation area.
const desktopViewport = { width: 1440, height: 1000 };

module.exports = defineConfig({
  testDir: './tests',
  globalSetup: require.resolve('./tests/global-setup.js'),
  timeout: 8_000,
  expect: { timeout: 3_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list'], ['html', { outputFolder: 'playwright-report', open: 'never' }]],
  use: {
    baseURL: 'http://127.0.0.1:3100',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    reducedMotion: 'reduce'
  },
  webServer: {
    command: 'node server/server.js',
    url: 'http://127.0.0.1:3100/api/health',
    reuseExistingServer: false,
    timeout: 20_000,
    env: {
      ...process.env,
      PORT: '3100',
      BIND_HOST: '127.0.0.1',
      NODE_ENV: 'test',
      BUP_DB_PATH: qaDbPath
    }
  },
  projects: [
    {
      name: 'setup',
      testMatch: /.*auth\.setup\.js/,
      use: {
        ...devices['Desktop Chrome'],
        viewport: desktopViewport
      }
    },
    {
      name: 'desktop',
      testDir: './tests/e2e',
      testIgnore: /gold\./,
      dependencies: ['setup'],
      use: {
        ...devices['Desktop Chrome'],
        viewport: desktopViewport,
        storageState: authFile
      }
    },
    {
      name: 'mobile',
      testDir: './tests/e2e',
      testIgnore: /gold\./,
      dependencies: ['setup'],
      use: {
        ...devices['Pixel 7'],
        viewport: { width: 412, height: 915 },
        storageState: authFile
      }
    },
    {
      name: 'gold-desktop',
      testDir: './tests/e2e',
      testMatch: /gold\.desktop\.spec\.js/,
      dependencies: ['setup'],
      use: {
        ...devices['Desktop Chrome'],
        viewport: desktopViewport,
        storageState: authFile
      }
    },
    {
      name: 'gold-mobile',
      testDir: './tests/e2e',
      testMatch: /gold\.mobile\.spec\.js/,
      dependencies: ['setup'],
      use: {
        ...devices['Pixel 7'],
        viewport: { width: 412, height: 915 },
        storageState: authFile
      }
    }
  ]
});
