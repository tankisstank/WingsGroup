import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'

import {
  appendJSONLine,
  buildExplicitRouteInventory,
  buildSitemapProbePaths,
  classifyExpectedConsoleError,
  checkpointScope,
  checkpointVersion,
  deriveSiteDecision,
  extractAdvertisedSitemapURLs,
  extractAdvertisedURLs,
  hasDirectContactMethod,
  hostnameBelongsToSite,
  hasStrongCTA,
  identityFingerprint,
  isProtectedInventoryError,
  normalizeHostname,
  parseCheckpoint,
  parseRequestedPaths,
  positiveInteger,
  reviewContent,
  reviewSiteProbe,
  runPool,
  withTimeout,
} from './go-live-review.mjs'

const site = {
  key: 'wingsgroup',
  label: 'WingsGroup',
  publicHosts: ['wingsgroup.vn'],
  themeKey: 'wings-group',
}

const identity = {
  bodyTheme: 'wings-group',
  brandText: ['WingsGroup'],
  canonical: 'https://wingsgroup.vn/',
  contentHash: 'baseline-content',
  h1: ['WingsGroup'],
  headers: {
    'content-security-policy': "default-src 'self'; frame-ancestors 'self'",
    'cross-origin-opener-policy': 'same-origin',
    'cross-origin-resource-policy': 'same-site',
    'permissions-policy': 'camera=()',
    'referrer-policy': 'strict-origin-when-cross-origin',
    'x-content-type-options': 'nosniff',
  },
  ok: true,
  status: 200,
  htmlLang: 'vi',
  title: 'WingsGroup | Travel ecosystem',
}

const siteProbe = () => ({
  baseline: structuredClone(identity),
  internalHeaderInjection: structuredClone(identity),
  siteAliasQueryInjection: structuredClone(identity),
  siteHeaderInjection: structuredClone(identity),
  siteQueryInjection: structuredClone(identity),
  seoEndpoints: ['/robots.txt', '/sitemap.xml', '/pages-sitemap.xml'].map((pathname) => ({
    absoluteURLs: [`https://wingsgroup.vn${pathname}`],
    containsForbiddenHost: false,
    finalURL: `http://localhost:3000${pathname}`,
    pathname,
    status: 200,
  })),
})

test('positiveInteger rejects values that could silently disable the worker pool', () => {
  assert.equal(positiveInteger('4', 1, 'concurrency'), 4)
  assert.throws(() => positiveInteger('NaN', 4, 'concurrency'), /concurrency must be an integer/)
  assert.throws(() => positiveInteger('0', 4, 'concurrency'), /concurrency must be an integer/)
})

test('explicit route inventory deduplicates requested paths for protected page APIs', () => {
  assert.deepEqual(parseRequestedPaths('/, /lien-he,/lien-he, /chinh-sach-bao-mat'), [
    '/',
    '/lien-he',
    '/chinh-sach-bao-mat',
  ])
  assert.equal(isProtectedInventoryError(new Error('403 Forbidden: /api/pages')), true)
  assert.equal(isProtectedInventoryError(new Error('500 Internal Server Error')), false)

  const routes = buildExplicitRouteInventory({ key: 'wingsgroup', pathPrefix: '' }, [
    '/',
    '/lien-he',
    '/chinh-sach-bao-mat',
  ])
  assert.deepEqual(
    routes.map(({ pathname, purpose, routePath, source }) => ({
      pathname,
      purpose,
      routePath,
      source,
    })),
    [
      { pathname: '/', purpose: 'homepage', routePath: '/', source: 'explicit-route' },
      {
        pathname: '/lien-he',
        purpose: 'lead-contact',
        routePath: '/lien-he',
        source: 'explicit-route',
      },
      {
        pathname: '/chinh-sach-bao-mat',
        purpose: 'trust',
        routePath: '/chinh-sach-bao-mat',
        source: 'explicit-route',
      },
    ],
  )
})

test('console review preserves genuine errors while classifying known local gate noise', () => {
  assert.equal(
    classifyExpectedConsoleError(
      "WebSocket connection to 'ws://127.0.0.1:4489/_next/webpack-hmr?id=abc' failed",
      'webpack-internal://next-dev/web-socket.js',
    ),
    'next-dev-hmr',
  )
  assert.equal(
    classifyExpectedConsoleError(
      'Failed to load resource: the server responded with a status of 403 (Forbidden)',
      'http://127.0.0.1:4489/api/media/file/pending.jpg',
    ),
    'protected-api-denial',
  )
  assert.equal(
    classifyExpectedConsoleError(
      'Failed to load resource: the server responded with a status of 500 (Internal Server Error)',
      'http://127.0.0.1:4489/api/media/file/pending.jpg',
    ),
    null,
  )
})

test('runPool enforces its concurrency bound and visits every task once', async () => {
  let active = 0
  let maximumActive = 0
  const visited = []
  await runPool(
    [1, 2, 3, 4, 5],
    async (task) => {
      active += 1
      maximumActive = Math.max(maximumActive, active)
      await new Promise((resolve) => setTimeout(resolve, 5))
      visited.push(task)
      active -= 1
    },
    2,
  )
  assert.equal(maximumActive, 2)
  assert.deepEqual([...visited].sort(), [1, 2, 3, 4, 5])
})

test('withTimeout rejects a stalled operation with actionable context', async () => {
  await assert.rejects(
    withTimeout(new Promise(() => {}), 10, 'wingsgo mobile /campaign'),
    /wingsgo mobile \/campaign exceeded 10ms/,
  )
})

test('checkpoint parser resumes valid records and tolerates a torn final JSONL write', () => {
  const valid = {
    checkpointKey: 'wingsgroup|/|desktop',
    checkpointScope,
    checkpointVersion,
    title: 'complete record',
  }
  const parsed = parseCheckpoint(`${JSON.stringify(valid)}\n{"checkpointKey":"torn"`)
  assert.equal(parsed.records.get(valid.checkpointKey).title, 'complete record')
  assert.match(parsed.warnings.join(' '), /malformed checkpoint line 2/)
})

test('SEO extraction ignores XML namespace declarations and reads only advertised locations', () => {
  const xml =
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>https://wingsgroup.vn/vi?a=1&amp;b=2</loc></url></urlset>'
  assert.deepEqual(extractAdvertisedURLs(xml, '/pages-sitemap.xml'), [
    'https://wingsgroup.vn/vi?a=1&b=2',
  ])
  assert.deepEqual(
    extractAdvertisedURLs(
      'User-agent: *\nHost: https://wingsgroup.vn\nSitemap: https://wingsgroup.vn/sitemap.xml\n',
      '/robots.txt',
    ),
    ['https://wingsgroup.vn', 'https://wingsgroup.vn/sitemap.xml'],
  )
})

test('sitemap child probes are derived from sitemap index entries only', () => {
  const sitemapIndex = `
    <sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
      <sitemap><loc>https://wingsgroup.vn/pages-sitemap.xml</loc></sitemap>
    </sitemapindex>
  `
  assert.deepEqual(extractAdvertisedSitemapURLs(sitemapIndex), [
    'https://wingsgroup.vn/pages-sitemap.xml',
  ])
  assert.deepEqual(buildSitemapProbePaths(sitemapIndex), ['/pages-sitemap.xml'])
  assert.deepEqual(
    buildSitemapProbePaths('<urlset><url><loc>https://wingsgroup.vn/</loc></url></urlset>'),
    [],
  )
})

test('public hostname comparison normalizes URL, www, case, and trailing dot variants', () => {
  assert.equal(normalizeHostname('HTTPS://WWW.WingSide.VN./en'), 'wingside.vn')
  assert.equal(hostnameBelongsToSite('www.wingside.vn.', ['wingside.vn']), true)
  assert.equal(hostnameBelongsToSite('wingsside.vn', ['wingside.vn']), false)
})

test('CTA review recognizes the real WingsSide conversion vocabulary', () => {
  for (const label of ['Plan trip', 'Consult', 'Share your brief', 'Write a message']) {
    assert.equal(hasStrongCTA(label), true, label)
  }
  assert.equal(hasStrongCTA('Explore our story'), false)
})

test('streaming JSONL appends remain parseable under concurrent completion', async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'go-live-jsonl-'))
  const filePath = path.join(directory, 'checkpoint.jsonl')
  try {
    await Promise.all(
      Array.from({ length: 40 }, (_, index) =>
        appendJSONLine(filePath, { index, value: `record-${index}` }),
      ),
    )
    const lines = (await fs.readFile(filePath, 'utf8')).trim().split(/\r?\n/)
    assert.equal(lines.length, 40)
    assert.deepEqual(
      lines.map((line) => JSON.parse(line).index).sort((left, right) => left - right),
      Array.from({ length: 40 }, (_, index) => index),
    )
  } finally {
    await fs.rm(directory, { force: true, recursive: true })
  }
})

test('site probe detects tenant content changes when title and theme remain correct', () => {
  const probe = siteProbe()
  probe.siteQueryInjection.contentHash = 'cross-tenant-content'
  const review = reviewSiteProbe(probe, site)
  assert.equal(review.status, 'blocked')
  assert.ok(
    review.blockers.some((finding) => finding.includes('site query-string tenant-injection')),
  )
  assert.notEqual(
    identityFingerprint(probe.baseline),
    identityFingerprint(probe.siteQueryInjection),
  )
})

test('site probe evaluates siteAlias and internal headers independently', () => {
  const probe = siteProbe()
  probe.siteAliasQueryInjection.title = 'WingsCare | Travel care'
  probe.siteHeaderInjection.bodyTheme = 'wings-care'
  probe.internalHeaderInjection.htmlLang = 'en'
  const review = reviewSiteProbe(probe, site)
  assert.equal(review.status, 'blocked')
  assert.ok(
    review.blockers.some((finding) => finding.includes('siteAlias query-string tenant-injection')),
  )
  assert.ok(
    review.blockers.some((finding) => finding.includes('x-site-code header tenant-injection')),
  )
  assert.ok(
    review.blockers.some((finding) => finding.includes('internal-header bundle tenant-injection')),
  )
})

test('site probe accepts matching identity, scoped SEO URLs, and baseline headers', () => {
  const review = reviewSiteProbe(siteProbe(), site)
  assert.equal(review.status, 'pass')
  assert.deepEqual(review.blockers, [])
})

test('site probe preserves a genuine advertised sitemap-child failure', () => {
  const probe = siteProbe()
  probe.seoEndpoints.push({
    absoluteURLs: ['https://wingsgroup.vn/posts-sitemap.xml'],
    advertised: true,
    containsForbiddenHost: false,
    finalURL: 'http://localhost:3000/posts-sitemap.xml',
    pathname: '/posts-sitemap.xml',
    status: 404,
  })
  const review = reviewSiteProbe(probe, site)
  assert.ok(
    review.blockers.some((finding) => finding.includes('/posts-sitemap.xml returned HTTP 404')),
  )
})

test('site probe does not fail for an unadvertised posts sitemap', () => {
  const review = reviewSiteProbe(siteProbe(), site)
  assert.equal(
    review.blockers.some((finding) => finding.includes('posts-sitemap')),
    false,
  )
})

test('site probe reports repeated identity timeout as environment-inconclusive without false negatives', () => {
  const probe = siteProbe()
  probe.baseline = {
    ...structuredClone(identity),
    attempts: 2,
    error: 'page.goto: Timeout 45000ms exceeded.',
    errorKind: 'timeout',
    inconclusive: true,
    ok: false,
    status: null,
  }
  const review = reviewSiteProbe(probe, site)
  assert.equal(review.status, 'blocked')
  assert.ok(review.blockers.some((finding) => finding.includes('Environment-inconclusive')))
  assert.equal(
    review.blockers.some((finding) => /missing|does not identify|tenant-injection/i.test(finding)),
    false,
  )
})

test('site probe reports tenant identity timeout without a false HTTP or identity finding', () => {
  const probe = siteProbe()
  probe.siteQueryInjection = {
    ...structuredClone(identity),
    attempts: 2,
    error: 'page.goto: Timeout 45000ms exceeded.',
    errorKind: 'timeout',
    inconclusive: true,
    ok: false,
    status: null,
  }
  const review = reviewSiteProbe(probe, site)
  assert.ok(review.blockers.some((finding) => finding.includes('Environment-inconclusive')))
  assert.equal(
    review.blockers.some((finding) =>
      /failed with HTTP unknown|changed the rendered site identity/i.test(finding),
    ),
    false,
  )
})

test('contact review accepts visible email and phone without changing form authorization evidence', () => {
  assert.equal(hasDirectContactMethod('info@doicanhviet.com · 0975513886'), true)
  const review = reviewContent({
    bodyText: 'Reach us at info@doicanhviet.com or 0975513886.',
    bodyTextLength: 55,
    firstViewportCTA: ['Contact'],
    forms: 0,
    purpose: 'lead-contact',
  })
  assert.deepEqual(review.blockers, [])
  assert.equal(
    review.warnings.some((finding) => finding.includes('contact method')),
    false,
  )
})

test('site probe accepts either the WingSide brand or its public domain identity', () => {
  const wingSideSite = {
    key: 'wingsside',
    identityTokens: ['WingSide', 'wingside.vn'],
    label: 'WingSide',
    publicHosts: ['wingside.vn'],
    themeKey: 'wings-side',
  }
  const probe = siteProbe()
  probe.baseline.bodyTheme = 'wings-side'
  probe.baseline.brandText = ['WingSide']
  probe.baseline.canonical = 'https://wingside.vn/'
  probe.baseline.title = 'WingSide | Tailor-made Vietnam journeys'
  for (const key of [
    'internalHeaderInjection',
    'siteAliasQueryInjection',
    'siteHeaderInjection',
    'siteQueryInjection',
  ]) {
    probe[key] = structuredClone(probe.baseline)
  }
  probe.seoEndpoints = probe.seoEndpoints.map((endpoint) => ({
    ...endpoint,
    absoluteURLs: endpoint.absoluteURLs.map((url) =>
      url.replaceAll('wingsgroup.vn', 'wingside.vn'),
    ),
  }))

  const review = reviewSiteProbe(probe, wingSideSite)
  assert.deepEqual(review.blockers, [])
  assert.equal(review.status, 'pass')
})

test('site probe blocks forbidden and cross-site URLs advertised by SEO endpoints', () => {
  const probe = siteProbe()
  probe.seoEndpoints[0].absoluteURLs = ['http://localhost:3000/sitemap.xml']
  probe.seoEndpoints[1].absoluteURLs = ['https://wingscare.wingsgroup.vn/pages-sitemap.xml']
  const review = reviewSiteProbe(probe, site)
  assert.equal(review.status, 'blocked')
  assert.ok(review.blockers.some((finding) => finding.includes('forbidden hosts')))
  assert.ok(review.blockers.some((finding) => finding.includes('cross-site entries')))
})

test('a complete domain run cannot pass its site decision when homepage evidence is missing', () => {
  const decision = deriveSiteDecision({
    complete: true,
    focused: false,
    homepageSmokeStatus: 'blocked',
    pageStatus: 'pass',
    probeReview: { blockers: [], status: 'pass', warnings: [] },
    routing: 'domain',
    site,
  })
  assert.equal(decision.eligibleForGoLiveDecision, true)
  assert.equal(decision.siteAssessmentStatus, 'blocked')
  assert.equal(decision.siteDecisionStatus, 'blocked')
})

test('a partial site assessment is blocked and cannot become a go-live decision', () => {
  const decision = deriveSiteDecision({
    complete: false,
    focused: false,
    homepageSmokeStatus: 'pass',
    pageStatus: 'pass',
    probeReview: { blockers: [], status: 'pass', warnings: [] },
    routing: 'domain',
    site,
  })
  assert.equal(decision.eligibleForGoLiveDecision, false)
  assert.equal(decision.siteAssessmentStatus, 'blocked')
  assert.equal(decision.siteDecisionStatus, 'not_evaluated')
})
