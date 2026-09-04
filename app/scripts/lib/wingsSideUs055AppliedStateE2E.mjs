import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { request } from 'node:http'
import { createServer } from 'node:net'
import path from 'node:path'
import { spawn, spawnSync } from 'node:child_process'

const routeTestTitle =
  'serves the exact 110 URL sitemap matrix with reciprocal locale metadata'
const homeTestTitle =
  'connects all four Why Travel roles to eligible real tours across five locales and two widths'
const expectedSpecs = [
  {
    path: 'tests/e2e/wingsside-why-travel-real-tour-matrix.e2e.spec.ts',
    title: homeTestTitle,
  },
  {
    path: 'tests/e2e/wingsside-tour-locale-matrix.e2e.spec.ts',
    title: routeTestTitle,
  },
]
const sha256Pattern = /^[a-f0-9]{64}$/u
const expectedSpecPathByReporterPath = new Map(
  expectedSpecs.flatMap(({ path: specPath }) => [
    [specPath, specPath],
    [path.posix.basename(specPath), specPath],
  ]),
)

const sha256 = (value) => createHash('sha256').update(value).digest('hex')

const listenOnEphemeralPort = () =>
  new Promise((resolve, reject) => {
    const server = createServer()
    server.once('error', reject)
    server.listen(0, '127.0.0.1', () => {
      const address = server.address()
      if (!address || typeof address === 'string') {
        server.close()
        reject(new Error('US-055 E2E gate could not allocate a loopback port'))
        return
      }
      server.close((error) => {
        if (error) reject(error)
        else resolve(address.port)
      })
    })
  })

const boundedLog = (chunks, secretValues) =>
  Buffer.concat(chunks)
    .toString('utf8')
    .slice(-8_000)
    .replaceAll(
      new RegExp(
        secretValues
          .filter(Boolean)
          .map((value) => String(value).replace(/[.*+?^${}()|[\]\\]/gu, '\\$&'))
          .join('|') || '(?!)',
        'gu',
      ),
      '[REDACTED]',
    )

const waitForExit = (child, timeoutMilliseconds) =>
  new Promise((resolve) => {
    if (child.exitCode !== null || child.signalCode !== null) {
      resolve(true)
      return
    }
    const timer = setTimeout(() => {
      child.off('exit', onExit)
      resolve(false)
    }, timeoutMilliseconds)
    const onExit = () => {
      clearTimeout(timer)
      resolve(true)
    }
    child.once('exit', onExit)
  })

export const terminateUs055E2EProcessTree = async (
  child,
  { spawnSyncImplementation = spawnSync } = {},
) => {
  if (!child?.pid || child.exitCode !== null || child.signalCode !== null) return
  if (process.platform === 'win32') {
    spawnSyncImplementation(
      'taskkill',
      ['/pid', String(child.pid), '/t', '/f'],
      {
        encoding: 'utf8',
        stdio: 'pipe',
        timeout: 15_000,
        windowsHide: true,
      },
    )
  } else {
    try {
      process.kill(-child.pid, 'SIGTERM')
    } catch {
      child.kill('SIGTERM')
    }
  }
  if (!(await waitForExit(child, 5_000))) child.kill('SIGKILL')
  if (!(await waitForExit(child, 5_000))) {
    throw new Error(`US-055 E2E process tree ${child.pid} did not terminate`)
  }
}

const runBoundedChild = async ({
  args,
  command,
  cwd,
  env,
  timeoutMilliseconds,
}) => {
  const stdout = []
  const stderr = []
  const child = spawn(command, args, {
    cwd,
    detached: process.platform !== 'win32',
    env,
    shell: process.platform === 'win32',
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
  })
  child.stdout?.on('data', (chunk) => stdout.push(Buffer.from(chunk)))
  child.stderr?.on('data', (chunk) => stderr.push(Buffer.from(chunk)))
  let timer
  const result = await Promise.race([
    new Promise((resolve) => {
      child.once('error', (error) => resolve({ error, status: null }))
      child.once('exit', (status, signal) => resolve({ signal, status }))
    }),
    new Promise((resolve) => {
      timer = setTimeout(
        () => resolve({ error: new Error('bounded process timeout'), status: null }),
        timeoutMilliseconds,
      )
    }),
  ])
  if (timer) clearTimeout(timer)
  if (child.exitCode === null && child.signalCode === null) {
    await terminateUs055E2EProcessTree(child)
  }
  return {
    ...result,
    stderr: Buffer.concat(stderr).toString('utf8'),
    stdout: Buffer.concat(stdout).toString('utf8'),
  }
}

export const us055ReadinessRequestOptions = (baseURL) => {
  const target = new URL(baseURL)
  if (target.protocol !== 'http:' || target.hostname !== '127.0.0.1' || !target.port) {
    throw new Error('US-055 E2E readiness requires an explicit IPv4 loopback HTTP origin')
  }
  return {
    headers: { Host: 'wingside.vn' },
    hostname: '127.0.0.1',
    method: 'GET',
    path: '/pages-sitemap.xml',
    port: Number(target.port),
  }
}

const readinessStatus = (baseURL) =>
  new Promise((resolve, reject) => {
    const probe = request(us055ReadinessRequestOptions(baseURL), (response) => {
      response.resume()
      response.once('end', () => resolve(response.statusCode || 0))
    })
    probe.setTimeout(5_000, () => probe.destroy(new Error('readiness timeout')))
    probe.once('error', reject)
    probe.end()
  })

const waitForNext = async ({ baseURL, child, timeoutMilliseconds }) => {
  const deadline = Date.now() + timeoutMilliseconds
  let attempts = 0
  while (Date.now() < deadline) {
    attempts += 1
    if (child.exitCode !== null || child.signalCode !== null) {
      throw new Error('US-055 E2E Next server exited before readiness')
    }
    try {
      if ((await readinessStatus(baseURL)) === 200) return attempts
    } catch {
      // Bounded readiness polling is expected while Next compiles.
    }
    await new Promise((resolve) => setTimeout(resolve, 500))
  }
  throw new Error(
    `US-055 E2E Next server did not become ready within ${timeoutMilliseconds}ms`,
  )
}

const testResults = (suite) => [
  ...(suite.specs || []).flatMap((spec) =>
    (spec.tests || []).map((test) => ({
      file: spec.file,
      ok: spec.ok,
      results: test.results || [],
      status: test.status,
      title: spec.title,
    })),
  ),
  ...(suite.suites || []).flatMap(testResults),
]

const normalizeExpectedReporterSpecPath = (value) => {
  const normalized = String(value || '').replaceAll('\\', '/')
  return expectedSpecPathByReporterPath.get(normalized) || normalized
}

export const assertUs055AppliedStateE2EReport = ({
  report,
  specSha256ByPath,
}) => {
  const tests = (report.suites || []).flatMap(testResults)
  const actualTests = new Map(
    tests.map((result) => [
      `${normalizeExpectedReporterSpecPath(result.file)}:${result.title}`,
      result,
    ]),
  )
  if (
    tests.length !== expectedSpecs.length ||
    actualTests.size !== expectedSpecs.length ||
    expectedSpecs.some(
      ({ path: specPath }) => !sha256Pattern.test(specSha256ByPath[specPath] || ''),
    ) ||
    expectedSpecs.some(({ path: specPath, title }) => {
      const result = actualTests.get(`${specPath}:${title}`)
      return (
        !result ||
        !result.ok ||
        result.status !== 'expected' ||
        result.results.length !== 1 ||
        result.results[0].status !== 'passed'
      )
    }) ||
    report.stats?.expected !== expectedSpecs.length ||
    report.stats?.unexpected !== 0 ||
    report.stats?.skipped !== 0 ||
    report.errors?.length
  ) {
    throw new Error('US-055 applied-state Playwright JSON report is not two exact passes')
  }
  return {
    expectedHomeMatrixCaseCount: 40,
    expectedHomeRoleCount: 4,
    expectedLocaleCount: 5,
    expectedTourCount: 22,
    expectedURLCount: 110,
    expectedViewportCount: 2,
    playwright: {
      expected: report.stats.expected,
      skipped: report.stats.skipped,
      unexpected: report.stats.unexpected,
    },
    specs: expectedSpecs.map(({ path: specPath, title }) => ({
      path: specPath,
      sha256: specSha256ByPath[specPath],
      testTitle: title,
    })),
  }
}

const assertRouteSpecContract = (source) => {
  for (const contract of [
    "const locales = ['en', 'vi', 'it', 'es', 'pt'] as const",
    'expect(tourURLs).toHaveLength(110)',
    'expect(matrix.size).toBe(22)',
    "headers: { host: 'wingside.vn' }",
  ]) {
    if (!source.includes(contract)) {
      throw new Error(`US-055 E2E committed spec contract drifted: ${contract}`)
    }
  }
}

export const assertUs055HomeSpecContract = (source) => {
  for (const contract of [
    "const locales = ['en', 'vi', 'it', 'es', 'pt'] as const",
    "const localAliasPrefix = '/wing-side'",
    'const viewportWidths = [390, 1440] as const',
    "marker: 'why-featured'",
    "role: 'local-design'",
    "slug: 'best-of-northern-vietnam-hanoi-ninh-binh-sapa-halong-6-days'",
    "marker: 'why-flexible'",
    "role: 'flexible-planning'",
    "slug: 'northern-vietnam-highlights-for-family-6-days'",
    "marker: 'why-style'",
    "role: 'style-matching'",
    "slug: 'vietnam-luxury-wellness-retreat-escape-8-days'",
    "marker: 'why-care'",
    "role: 'collaborative-care'",
    "slug: 'highlights-of-vietnam-from-north-to-south-12-days'",
    'expectedRolePublicPath(locale, slug)',
    '.toBe(`${localAliasPrefix}${expectedRolePublicPath(locale, slug)}`)',
    'expect(eligibleTourPaths.size).toBe(110)',
    'expect(new Set(rolePaths.values()).size).toBe(4)',
    'baseURL: e2eBaseURL',
    'publicPathFromLocalAlias(localURL.pathname)',
    "headers: { host: 'wingside.vn' }",
  ]) {
    if (!source.includes(contract)) {
      throw new Error(`US-055 Why Travel E2E committed spec contract drifted: ${contract}`)
    }
  }
}

export const runUs055AppliedStateE2EGate = async ({
  appRoot,
  databaseURL,
  environment,
  outputDirectory,
  payloadSecret,
  serverStartupTimeoutMilliseconds = 180_000,
  testTimeoutMilliseconds = 960_000,
}) => {
  if (
    environment.DATABASE_URL !== databaseURL ||
    environment.PAYLOAD_SECRET !== payloadSecret ||
    environment.PAYLOAD_DB_PUSH !== 'false'
  ) {
    throw new Error('US-055 E2E gate environment does not match the lifecycle target')
  }
  const specEntries = await Promise.all(
    expectedSpecs.map(async ({ path: specPath, title }) => {
      const specBytes = await readFile(path.join(appRoot, specPath))
      if (specPath.includes('why-travel')) {
        assertUs055HomeSpecContract(specBytes.toString('utf8'))
      } else {
        assertRouteSpecContract(specBytes.toString('utf8'))
      }
      return { path: specPath, sha256: sha256(specBytes), title }
    }),
  )
  const specSha256ByPath = Object.fromEntries(
    specEntries.map(({ path: specPath, sha256: specSha }) => [specPath, specSha]),
  )
  const port = await listenOnEphemeralPort()
  const baseURL = `http://127.0.0.1:${port}`
  const reportPath = path.join(outputDirectory, 'applied-state-e2e-report.json')
  const childEnvironment = {
    ...environment,
    DATABASE_URL: databaseURL,
    NEXT_PUBLIC_SERVER_URL: baseURL,
    NODE_ENV: 'development',
    PAYLOAD_DB_PUSH: 'false',
    PAYLOAD_SECRET: payloadSecret,
    PLAYWRIGHT_BASE_URL: baseURL,
    PLAYWRIGHT_DISABLE_WEB_SERVER: 'true',
    PLAYWRIGHT_JSON_OUTPUT_FILE: reportPath,
    PLAYWRIGHT_REUSE_EXISTING_SERVER: 'false',
    PLAYWRIGHT_SKIP_PHASE1_SEED: 'true',
    WINGSSIDE_FULL_TOUR_LOCALE_GATE: 'true',
  }
  const serverOutput = []
  const server = spawn(
    'pnpm',
    [
      'exec',
      'next',
      'dev',
      '--webpack',
      '--hostname',
      '127.0.0.1',
      '--port',
      String(port),
    ],
    {
      cwd: appRoot,
      detached: process.platform !== 'win32',
      env: childEnvironment,
      shell: process.platform === 'win32',
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
    },
  )
  server.stdout?.on('data', (chunk) => serverOutput.push(Buffer.from(chunk)))
  server.stderr?.on('data', (chunk) => serverOutput.push(Buffer.from(chunk)))

  try {
    const readinessAttempts = await waitForNext({
      baseURL,
      child: server,
      timeoutMilliseconds: serverStartupTimeoutMilliseconds,
    })
    const result = await runBoundedChild({
      args: [
        'exec',
        'playwright',
        'test',
        ...expectedSpecs.map(({ path: specPath }) => specPath),
        '--config=playwright.config.ts',
        '--reporter=json',
      ],
      command: 'pnpm',
      cwd: appRoot,
      env: childEnvironment,
      timeoutMilliseconds: testTimeoutMilliseconds,
    })
    if (result.error || result.status !== 0) {
      const detail = boundedLog(
        [
          Buffer.from(String(result.stderr || '')),
          Buffer.from(String(result.stdout || '')),
        ],
        [databaseURL, payloadSecret],
      )
      throw new Error(
        `US-055 applied-state Playwright failed with exit code ${
          result.status ?? 'unknown'
        }: ${detail}`,
      )
    }
    const reportBytes = await readFile(reportPath)
    const outcome = assertUs055AppliedStateE2EReport({
      report: JSON.parse(reportBytes.toString('utf8')),
      specSha256ByPath,
    })
    return {
      ...outcome,
      baseURLBinding: 'ephemeral-loopback',
      hostHeader: 'wingside.vn',
      nextBundler: 'webpack',
      reportSha256: sha256(reportBytes),
      serverReadinessAttempts: readinessAttempts,
    }
  } catch (error) {
    const serverDetail = boundedLog(serverOutput, [databaseURL, payloadSecret])
    const message = String(error instanceof Error ? error.message : error)
    throw new Error(
      serverDetail
        ? `${message}; bounded Next output: ${serverDetail}`
        : message,
    )
  } finally {
    await terminateUs055E2EProcessTree(server)
  }
}
