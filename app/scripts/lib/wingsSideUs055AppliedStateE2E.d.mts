import type { ChildProcess } from 'node:child_process'

export type Us055AppliedStateE2EOutcome = {
  baseURLBinding: 'ephemeral-loopback'
  expectedHomeMatrixCaseCount: 40
  expectedHomeRoleCount: 4
  expectedLocaleCount: 5
  expectedTourCount: 22
  expectedURLCount: 110
  expectedViewportCount: 2
  hostHeader: 'wingside.vn'
  nextBundler: 'webpack'
  playwright: {
    expected: 2
    skipped: 0
    unexpected: 0
  }
  reportSha256: string
  serverReadinessAttempts: number
  specs: Array<{
    path:
      | 'tests/e2e/wingsside-tour-locale-matrix.e2e.spec.ts'
      | 'tests/e2e/wingsside-why-travel-real-tour-matrix.e2e.spec.ts'
    sha256: string
    testTitle: string
  }>
}

export function assertUs055AppliedStateE2EReport(input: {
  report: Record<string, unknown>
  specSha256ByPath: Record<string, string>
}): Omit<
  Us055AppliedStateE2EOutcome,
  | 'baseURLBinding'
  | 'hostHeader'
  | 'nextBundler'
  | 'reportSha256'
  | 'serverReadinessAttempts'
>

export function runUs055AppliedStateE2EGate(input: {
  appRoot: string
  databaseURL: string
  environment: NodeJS.ProcessEnv
  outputDirectory: string
  payloadSecret: string
  serverStartupTimeoutMilliseconds?: number
  testTimeoutMilliseconds?: number
}): Promise<Us055AppliedStateE2EOutcome>

export function terminateUs055E2EProcessTree(
  child: ChildProcess,
  options?: {
    spawnSyncImplementation?: typeof import('node:child_process').spawnSync
  },
): Promise<void>

export function us055ReadinessRequestOptions(baseURL: string): {
  headers: { Host: 'wingside.vn' }
  hostname: '127.0.0.1'
  method: 'GET'
  path: '/pages-sitemap.xml'
  port: number
}
