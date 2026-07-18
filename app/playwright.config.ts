import { defineConfig, devices } from '@playwright/test'

/**
 * Read environment variables from file.
 * https://github.com/motdotla/dotenv
 */
import 'dotenv/config'

const e2eBaseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3100'
const e2ePort = new URL(e2eBaseURL).port || '3100'
const reuseExistingServer = process.env.PLAYWRIGHT_REUSE_EXISTING_SERVER === 'true'
const disableWebServer = process.env.PLAYWRIGHT_DISABLE_WEB_SERVER === 'true'
const productionLikeHosts = [
  'wingsgroup.vn',
  'www.wingsgroup.vn',
  'wingsgo.vn',
  'www.wingsgo.vn',
  'wingsplus.vn',
  'www.wingsplus.vn',
  'wingscare.wingsgroup.vn',
  'wingspass.wingsgroup.vn',
  'wingsside.vn',
  'www.wingsside.vn',
]
const hostResolverRules = productionLikeHosts
  .map((host) => `MAP ${host} 127.0.0.1`)
  .join(',')

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  testDir: './tests/e2e',
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Database-backed fixtures mutate shared rows and must remain serial. */
  workers: 1,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: [['line'], ['html', { open: 'never' }]],
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    baseURL: e2eBaseURL,

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        channel: 'chromium',
        launchOptions: {
          args: [
            `--host-resolver-rules=${hostResolverRules}`,
          ],
        },
      },
    },
  ],
  webServer: disableWebServer
    ? undefined
    : {
        command: `cross-env PAYLOAD_DB_PUSH=false pnpm exec next dev --hostname 127.0.0.1 --port ${e2ePort}`,
        reuseExistingServer,
        timeout: 120 * 1000,
        url: e2eBaseURL,
      },
})
