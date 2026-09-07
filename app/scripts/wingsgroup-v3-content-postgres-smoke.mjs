#!/usr/bin/env node

/* Process-isolated disposable PostgreSQL proof for governed WingsGroup media. */
import { createHash } from 'node:crypto'
import { spawn, spawnSync } from 'node:child_process'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

const container = `wings-content-smoke-${Date.now()}`
const tempRoot = await mkdtemp(path.join(os.tmpdir(), 'wp-rel-27-media-'))
const runToken = path.basename(tempRoot)
const operationID = 'op-20260824-wingsgroup-v3-media-smoke'
const fixtureStems = [
  'wingsgroup-hero-discovery-guide',
  'wingsgroup-hero-private-consultation',
  'wingsgroup-hero-airport-welcome',
  'wingsgroup-hero-partner-meeting',
  'wingsgroup-ecosystem-hero',
  'wingsgroup-vietnam-discovery',
  'wingsgroup-airport-service',
  'wingsgroup-corporate-partnership',
  'wingsgroup-travel-support',
  'wingsgroup-journey-consultation',
  'wingsgroup-archive-01',
  'wingsgroup-archive-02',
  'wingsgroup-proof-archive-01',
]
const mediaDirectory = path.resolve(import.meta.dirname, '../public/media')
const manifestPath = path.join(tempRoot, 'manifest.json')
const statePath = path.join(tempRoot, 'phase-state.json')
const legacySeedPath = path.join(tempRoot, 'seed-legacy-content.mjs')

const sh = (command, args, options = {}) => {
  const result = spawnSync(command, args, { encoding: 'utf8', ...options })
  return { status: result.status ?? -1, stdout: result.stdout || '', stderr: result.stderr || '' }
}

const run = (command, args, environment = process.env) =>
  new Promise((resolve) => {
    const child = spawn(command, args, { env: environment, stdio: ['ignore', 'pipe', 'pipe'] })
    let stdout = ''
    let stderr = ''
    child.stdout.on('data', (chunk) => {
      stdout += chunk
      process.stdout.write(chunk)
    })
    child.stderr.on('data', (chunk) => {
      stderr += chunk
      process.stderr.write(chunk)
    })
    child.on('close', (code) => resolve({ code: code ?? -1, stderr, stdout }))
  })

const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex')
const waitForPostgres = async () => {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    const result = sh('docker', [
      'exec',
      container,
      'pg_isready',
      '-U',
      'smoke',
      '-d',
      'wings_content_smoke',
    ])
    if (result.status === 0 && /accepting connections/.test(result.stdout)) return
    await new Promise((resolve) => setTimeout(resolve, 1000))
  }
  throw new Error('Disposable PostgreSQL did not become ready after 60 health checks.')
}

const teardown = async () => {
  try {
    const state = JSON.parse(await readFile(statePath, 'utf8'))
    await Promise.all((state.generatedMedia || []).map((filename) => rm(filename, { force: true })))
  } catch {
    // Continue cleanup if a phase failed before writing state.
  }
  await rm(tempRoot, { force: true, recursive: true })
  sh('docker', ['rm', '-f', container])
}

const writeFixture = async () => {
  const manifest = {
    licenseScope: 'Local integration fixture only.',
    media: [],
    publicationState: 'approved-for-production',
    rights: {
      evidence: 'Local integration fixture.',
      restriction: 'Local only.',
      state: 'approved',
    },
    siteCode: 'wings-group',
    sourcePackage: {
      archiveSha256: 'e'.repeat(64),
      attachmentId: `wp-rel-24-fixture-${runToken}`,
      assetsDirectory: tempRoot,
      manifest: 'local-fixture',
    },
    version: 1,
  }
  const { default: sharp } = await import('sharp')
  for (let index = 0; index < fixtureStems.length; index += 1) {
    const file = `${fixtureStems[index]}-${runToken}.png`
    const bytes = await sharp({
      create: {
        background: { b: 203, g: 91, r: 17 + index * 13 },
        channels: 3,
        height: 1024,
        width: 1536,
      },
    })
      .png()
      .toBuffer()
    await writeFile(path.join(tempRoot, file), bytes)
    manifest.media.push({
      actualDimensions: '1536x1024',
      alt: { en: `English fixture alt ${index}`, vi: `Mô tả fixture tiếng Việt ${index}` },
      dimensions: '1536x1024',
      file,
      focal: { x: 50, y: 50 },
      role: `fixture-${index}`,
      sha256: sha256(bytes),
      usageScope: 'editorial-service',
    })
  }
  await writeFile(manifestPath, `${JSON.stringify(manifest)}\n`)
}

const writeLegacySeedScript = async () => {
  await writeFile(
    legacySeedPath,
    `
import { readFile, writeFile } from 'node:fs/promises'
import { createLocalReq, getPayload } from ${JSON.stringify(path.resolve(import.meta.dirname, '../node_modules/payload/dist/index.js'))}
import config from ${JSON.stringify(path.resolve(import.meta.dirname, '../src/payload.config.ts'))}
import * as content from ${JSON.stringify(path.resolve(import.meta.dirname, './import-wingsgroup-v3-content.ts'))}
import * as planHelpers from ${JSON.stringify(path.resolve(import.meta.dirname, './lib/wingsGroupV3MediaPlan.ts'))}

const manifest = planHelpers.parseWingsGroupV3MediaManifest(JSON.parse(await readFile(process.env.WP_REL_27_MANIFEST, 'utf8')))
const mediaPlan = await planHelpers.buildWingsGroupV3MediaPlan({ assetsDirectory: process.env.WP_REL_27_ROOT, manifest })
const payload = await getPayload({ config })
const req = await createLocalReq({ context: { disableRevalidate: true, wingsGroupV3ProductionContent: true }, user: { id: 0, role: 'super-admin' } }, payload)
const contract = content.buildWingsGroupV3ContentContract()
const siteResult = await payload.find({ collection: 'sites', depth: 0, limit: 2, overrideAccess: true, pagination: false, req, where: { code: { equals: 'wings-group' } } })
const site = siteResult.docs[0]
const siteID = site.id
const inventory = await content.readWingsGroupV3ContentInventory({
  manifest,
  mediaDirectory: process.env.WP_REL_27_MEDIA_DIRECTORY,
  mediaPlan,
  payload,
  publicOrigin: 'https://wingsgroup.test',
  req,
  siteID,
})
const visit = (value, fn) => {
  if (Array.isArray(value)) return value.map((item) => visit(item, fn))
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, visit(item, fn)]))
  return fn(value)
}
const appendText = (value, jargon) => {
  let appended = false
  return visit(value, (item) => {
    if (!appended && typeof item === 'string') {
      appended = true
      return item + ' ' + jargon
    }
    return item
  })
}
const addFixtureMediaAliases = () => {
  const names = new Set()
  visit(contract, (item) => {
    if (typeof item === 'string' && item.endsWith('.png')) names.add(item)
    return item
  })
  for (const name of names) {
    const stem = name.slice(0, -'.png'.length)
    const planned = mediaPlan.records.find((record) => record.sourceFile.startsWith(stem + '-'))
    if (planned) inventory.mediaIDs.set(name, inventory.mediaIDs.get(planned.sourceFile))
  }
}
addFixtureMediaAliases()
let form = inventory.form
if (!form) {
  form = await payload.create({ collection: 'forms', context: { disableRevalidate: true, wingsGroupV3ProductionContent: true }, data: { ...contract.form, site: siteID }, overrideAccess: true, req })
}
const formID = form.id
const resolvedContract = content.resolveWingsGroupV3ContentContract({ contract, formID, mediaIDs: inventory.mediaIDs })
const patterns = ['legacy', 'root site', 'child sites', 'multisite', 'site con']
let legacyMatches = 0
let layoutLegacyMatches = 0
for (let routeIndex = 0; routeIndex < resolvedContract.pages.length; routeIndex += 1) {
  const route = resolvedContract.pages[routeIndex]
  for (const [localeIndex, locale] of ['vi', 'en'].entries()) {
    const source = route.locales[locale]
    const hero = { ...source.hero, richText: appendText(source.hero.richText, patterns[(routeIndex * 2 + localeIndex) % patterns.length]) }
    const hasLegacyMetaJargon = routeIndex < 8 && !(routeIndex === 0 && locale === 'en')
    const layoutHasLegacyJargon = routeIndex < 5 && locale === 'vi'
    const layout = layoutHasLegacyJargon ? appendText(source.layout, 'site con') : source.layout
    const legacyMetaDescription = ((source.meta && source.meta.description) || source.description || source.title) + ' ' + patterns[(routeIndex + 1) % patterns.length]
    const meta = routeIndex > 0
      ? {
          ...(source.meta || {}),
          breadcrumbLabel: 'Previous breadcrumb label',
          description: hasLegacyMetaJargon ? legacyMetaDescription : 'Previous metadata description',
          image: inventory.mediaIDs.values().next().value,
          title: 'Previous metadata title',
        }
      : hasLegacyMetaJargon
        ? { ...(source.meta || {}), description: legacyMetaDescription }
        : source.meta
    const legacyGovernance = route.governance.policy
      ? { ...route.governance, policy: { ...route.governance.policy, approvalState: 'pending', validationMarker: null } }
      : route.governance
    const data = {
      _status: 'draft',
      hero,
      layout,
      meta,
      pathname: route.path,
      site: siteID,
      slug: route.path === '/' ? 'home' : route.path.slice(1),
      title: source.title,
      wingsGroupRoute: legacyGovernance,
    }
    const existing = inventory.pages.vi.get(route.path) || inventory.pages.en.get(route.path)
    if (locale === 'vi' && !existing) {
      const created = await payload.create({ collection: 'pages', context: { disableRevalidate: true, wingsGroupV3ProductionContent: true }, data, locale, overrideAccess: true, req: { ...req, locale, payloadDataLoader: undefined } })
      inventory.pages.vi.set(route.path, created)
    } else {
      const id = existing?.id || inventory.pages.vi.get(route.path)?.id
      await payload.update({ collection: 'pages', context: { disableRevalidate: true, wingsGroupV3ProductionContent: true }, data, id, locale, overrideAccess: true, req: { ...req, locale, payloadDataLoader: undefined } })
      inventory.pages[locale].set(route.path, { ...data, id })
    }
    legacyMatches += 1 + (hasLegacyMetaJargon ? 1 : 0)
    if (layoutHasLegacyJargon) layoutLegacyMatches += 1
  }
}
const state = JSON.parse(await readFile(process.env.WP_REL_27_STATE, 'utf8'))
state.legacySeed = { layoutLegacyMatches, legacyMatches, localeRecords: resolvedContract.pages.length * 2, routeCount: resolvedContract.pages.length, formID }
await writeFile(process.env.WP_REL_27_STATE, JSON.stringify(state) + '\\n')
process.exit(0)
`,
  )
}

try {
  if (sh('docker', ['version', '--format', '{{.Server.Version}}']).status !== 0)
    throw new Error('Docker is unavailable.')
  const started = sh('docker', [
    'run',
    '-d',
    '--name',
    container,
    '-e',
    'POSTGRES_USER=smoke',
    '-e',
    'POSTGRES_PASSWORD=smoke',
    '-e',
    'POSTGRES_DB=wings_content_smoke',
    '-p',
    '127.0.0.1::5432',
    '--tmpfs',
    '/var/lib/postgresql/data:rw,size=512m',
    'postgres:16-alpine',
  ])
  if (started.status !== 0) throw new Error(started.stderr.trim() || 'Could not start PostgreSQL.')
  await waitForPostgres()
  const port = sh('docker', ['port', container, '5432/tcp'])
    .stdout.trim()
    .match(/:(\d+)$/)?.[1]
  if (!port) throw new Error('Could not resolve disposable PostgreSQL port.')
  const databaseURL = `postgresql://smoke:smoke@127.0.0.1:${port}/wings_content_smoke`
  const environment = {
    ...process.env,
    DATABASE_URL: databaseURL,
    NODE_ENV: 'test',
    PAYLOAD_DB_PUSH: 'false',
    PAYLOAD_SECRET: 'wp-rel-27-local-only',
    NODE_OPTIONS: '--no-deprecation',
    WP_REL_27_MANIFEST: manifestPath,
    WP_REL_27_MEDIA_DIRECTORY: mediaDirectory,
    WP_REL_27_OPERATION_ID: operationID,
    WP_REL_27_ROOT: tempRoot,
    WP_REL_27_STATE: statePath,
  }
  await writeFixture()
  await writeLegacySeedScript()
  const migrated = await run('pnpm', ['exec', 'payload', 'migrate'], environment)
  if (migrated.code !== 0) throw new Error('Payload migration failed on disposable PostgreSQL.')
  const phaseResults = []
  for (const phase of [
    'bootstrap',
    'apply',
    'publish',
    'verify',
    'content-rollback',
    'legacy-content',
    'content',
  ]) {
    const result =
      phase === 'legacy-content'
        ? await run('pnpm', ['exec', 'tsx', legacySeedPath], environment)
        : await run(
            'pnpm',
            ['exec', 'tsx', 'scripts/wingsgroup-v3-media-process-phase.mjs', phase],
            environment,
          )
    phaseResults.push({ phase, exitCode: result.code })
    if (result.code !== 0) throw new Error(`Process-isolated media phase failed: ${phase}`)
    if (phase === 'legacy-content') {
      const legacyHeroLinkSeed = sh('docker', [
        'exec',
        container,
        'psql',
        '-U',
        'smoke',
        '-d',
        'wings_content_smoke',
        '-Atc',
        "insert into pages_hero_links (\"_order\", \"_parent_id\", \"_locale\", id, link_type, link_url, link_label, link_appearance) select 0, p.id, 'en', 'wp-rel-43-legacy-' || replace(trim(both '/' from p.pathname), '/', '-'), 'custom', 'https://wingsgo.vn', 'Legacy ecosystem route', 'default' from pages p where p.pathname in ('/he-sinh-thai', '/lien-he') and not exists (select 1 from pages_hero_links existing where existing.\"_parent_id\" = p.id and existing.\"_locale\" = 'en' and existing.link_url = 'https://wingsgo.vn');",
      ])
      if (legacyHeroLinkSeed.status !== 0)
        throw new Error(`Legacy hero link PostgreSQL seed failed: ${legacyHeroLinkSeed.stderr}`)
      const legacyHeroLinkPreconditionInventory = sh('docker', [
        'exec',
        container,
        'psql',
        '-U',
        'smoke',
        '-d',
        'wings_content_smoke',
        '-Atc',
        "select count(*) from pages_hero_links hl join pages p on p.id = hl.\"_parent_id\" where p.pathname in ('/he-sinh-thai', '/lien-he') and hl.\"_locale\" = 'en' and hl.link_url = 'https://wingsgo.vn';",
      ])
      const legacyHeroLinksSeeded = Number(legacyHeroLinkPreconditionInventory.stdout.trim())
      if (legacyHeroLinkPreconditionInventory.status !== 0 || legacyHeroLinksSeeded !== 2)
        throw new Error(
          `Legacy hero link precondition did not match: ${legacyHeroLinkPreconditionInventory.stderr || legacyHeroLinksSeeded}`,
        )
      const legacyPreconditionInventory = sh('docker', [
        'exec',
        container,
        'psql',
        '-U',
        'smoke',
        '-d',
        'wings_content_smoke',
        '-Atc',
        "select count(*) filter (where hero_rich_text::text ~* '(root site|child sites?|legacy|multisite|site con)'), count(*) filter (where meta_description::text ~* '(root site|child sites?|legacy|multisite|site con)'), count(*) filter (where hero_rich_text::text ~* '(root site|child sites?|legacy|multisite|site con)') + count(*) filter (where meta_description::text ~* '(root site|child sites?|legacy|multisite|site con)') from pages_locales;",
      ])
      if (legacyPreconditionInventory.status !== 0)
        throw new Error(
          `Legacy precondition PostgreSQL query failed: ${legacyPreconditionInventory.stderr}`,
        )
      const [heroMatches, metaDescriptionMatches, totalMatches] = legacyPreconditionInventory.stdout
        .trim()
        .split('|')
        .map(Number)
      const legacyPrecondition = { heroMatches, metaDescriptionMatches, totalMatches }
      if (heroMatches !== 20 || metaDescriptionMatches !== 15 || totalMatches !== 35)
        throw new Error(
          `Legacy precondition counts did not match: ${JSON.stringify(legacyPrecondition)}`,
        )
      const state = JSON.parse(await readFile(statePath, 'utf8'))
      state.legacyHeroLinks = {
        locale: 'en',
        routes: ['/he-sinh-thai', '/lien-he'],
        seeded: legacyHeroLinksSeeded,
        url: 'https://wingsgo.vn',
      }
      state.legacyPrecondition = legacyPrecondition
      await writeFile(statePath, JSON.stringify(state) + '\n')
    }
  }
  const jargonInventory = sh('docker', [
    'exec',
    container,
    'psql',
    '-U',
    'smoke',
    '-d',
    'wings_content_smoke',
    '-Atc',
    "select count(*) from pages_locales where hero_rich_text::text ~* '(root site|child sites?|legacy|multisite|site con)' or meta_description::text ~* '(root site|child sites?|legacy|multisite|site con)';",
  ])
  const metaGroupInventory = sh('docker', [
    'exec',
    container,
    'psql',
    '-U',
    'smoke',
    '-d',
    'wings_content_smoke',
    '-Atc',
    "select count(*) filter (where pl.meta_title is not null), count(*) filter (where pl.meta_description is not null), count(*) filter (where pl.meta_image_id is not null), count(*) filter (where pl.meta_breadcrumb_label is not null) from pages_locales pl join pages p on p.id = pl._parent_id where p.pathname <> '/';",
  ])
  const heroLinkInventory = sh('docker', [
    'exec',
    container,
    'psql',
    '-U',
    'smoke',
    '-d',
    'wings_content_smoke',
    '-Atc',
    "select count(*) from pages_hero_links hl join pages p on p.id = hl.\"_parent_id\" where p.pathname in ('/he-sinh-thai', '/lien-he') and hl.\"_locale\" = 'en' and hl.link_url = 'https://wingsgo.vn';",
  ])
  const proof = JSON.parse(await readFile(statePath, 'utf8'))
  proof.content.publicJargonCount = Number(jargonInventory.stdout.trim())
  proof.content.legacyHeroLinksRemaining = Number(heroLinkInventory.stdout.trim())
  const [
    metaTitleRemaining,
    metaDescriptionRemaining,
    metaImageRemaining,
    metaBreadcrumbRemaining,
  ] = metaGroupInventory.stdout.trim().split('|').map(Number)
  proof.content.metaGroupClear = {
    metaBreadcrumbRemaining,
    metaDescriptionRemaining,
    metaImageRemaining,
    metaTitleRemaining,
  }
  if (
    proof.apply?.created !== 13 ||
    proof.publish?.localizedAltVerified !== 26 ||
    proof.publish?.responsiveDerivatives?.persisted !== 78 ||
    proof.publish?.publication !== 'published' ||
    proof.verify?.verified !== 13 ||
    proof.legacySeed?.legacyMatches !== 35 ||
    proof.legacySeed?.layoutLegacyMatches !== 5 ||
    proof.legacyHeroLinks?.seeded !== 2 ||
    proof.legacyPrecondition?.heroMatches !== 20 ||
    proof.legacyPrecondition?.metaDescriptionMatches !== 15 ||
    proof.legacyPrecondition?.totalMatches !== 35 ||
    proof.content?.routeCount !== 10 ||
    proof.content?.publishedLocales !== 16 ||
    proof.content?.firstWrites !== 20 ||
    proof.content?.secondWrites !== 20 ||
    proof.content?.formPresent !== true ||
    proof.content?.publicJargonCount !== 0 ||
    proof.content?.legacyHeroLinksRemaining !== 0 ||
    Object.values(proof.content?.metaGroupClear || {}).some((count) => count !== 0) ||
    proof.contentRollback?.error !== 'WP-REL-35 induced mid-content-write failure.' ||
    proof.contentRollback?.pageWrites !== 1 ||
    proof.contentRollback?.formCount !== 0 ||
    proof.contentRollback?.pageCount !== 0 ||
    proof.contentRollback?.settingsUnchanged !== true
  )
    throw new Error(`Process-isolated media proof counts did not match: ${JSON.stringify(proof)}`)
  console.log(JSON.stringify({ phaseResults, proof, status: 'pass' }, null, 2))
} finally {
  await teardown()
}
