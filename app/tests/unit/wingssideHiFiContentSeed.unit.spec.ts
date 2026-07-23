import { spawn } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it, vi } from 'vitest'

import {
  applyWingsSideHiFiContentSeed,
  attachResolvedPlanForm,
  buildWingsSideHiFiContentSeedDbDryRun,
  buildWingsSideHiFiContentSeedDryRun,
  buildWingsSideHiFiContentSeedOfflineDryRun,
  fetchWingsSideHiFiPagesForLocale,
  formatWingsSideHiFiSeedReport,
  listWingsSideHiFiSeedTargets,
  previewWingsSideHiFiSeedPayload,
  resolveWingsSideHiFiPlanForm,
  mergeStableArrayRowIds,
  stampStableArrayRowIds,
  withPayloadDestroy,
  WINGSSIDE_HIFI_PLAN_FORM_TITLE,
  WINGSSIDE_HIFI_SEED_LOCALES,
  type WingsSideHiFiSeedPayload,
} from '../../scripts/lib/wingssideHiFiContentSeed'

const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')

describe('WingSide hi-fi content seed (dry-run)', () => {
  it('targets the locked 8 hub routes', () => {
    const targets = listWingsSideHiFiSeedTargets()
    expect(targets).toHaveLength(8)
    expect(targets.map((t) => t.routeVariant).sort()).toEqual(
      ['about', 'contact', 'destinations', 'guide', 'home', 'packages', 'plan', 'styles'].sort(),
    )
  })

  it('covers EN/VI/IT/ES/PT seed locales', () => {
    expect(WINGSSIDE_HIFI_SEED_LOCALES).toEqual(['en', 'vi', 'it', 'es', 'pt'])
  })

  it('builds typed payload from existing copy without inventing opaque JSON', () => {
    const home = previewWingsSideHiFiSeedPayload('en', 'home')
    expect(home.enabled).toBe(true)
    expect(home.routeVariant).toBe('home')
    expect(home).toHaveProperty('home')
    expect(home).not.toHaveProperty('rawJson')

    const packages = previewWingsSideHiFiSeedPayload('vi', 'packages') as {
      packages?: { cards?: unknown[] }
    }
    expect(Array.isArray(packages.packages?.cards)).toBe(true)
    // Contract: five journey cards (pad from bindings when locale copy is short).
    expect((packages.packages?.cards || []).length).toBe(5)
  })

  it('never hardcodes a numeric plan form ID in pure offline payload', () => {
    const plan = previewWingsSideHiFiSeedPayload('en', 'plan') as {
      plan?: { form?: unknown }
    }
    expect(plan.plan?.form).toBeNull()
    // Guardrail: no accidental environment ID (e.g. local SQLite form 20).
    expect(JSON.stringify(plan)).not.toMatch(/"form"\s*:\s*20\b/)
  })

  it('offline pure mode reports without Payload; plan form stays unresolved', async () => {
    const report = await buildWingsSideHiFiContentSeedDryRun({
      locale: 'en',
      mode: 'offline',
      pages: [
        { id: 1, pathname: '/', slug: 'home' },
        { id: 2, pathname: '/packages', slug: 'packages' },
        { id: 3, pathname: '/plan-your-trip', slug: 'plan-your-trip' },
        { id: 4, pathname: '/destinations', slug: 'destinations' },
        { id: 5, pathname: '/styles', slug: 'styles' },
        { id: 6, pathname: '/travel-guide', slug: 'travel-guide' },
        { id: 7, pathname: '/about-us', slug: 'about-us' },
        { id: 8, pathname: '/contact-us', slug: 'contact-us' },
      ],
    })

    expect(report.dryRun).toBe(true)
    expect(report.mode).toBe('offline')
    expect(report.summary.totalTargets).toBe(8)

    const packages = report.pages.find((p) => p.routeVariant === 'packages')
    expect(packages).toBeTruthy()
    expect(packages!.status).toBe('would_create_fields')
    // Five cards — no packages_card_count gap.
    expect(packages!.validationIssues.some((msg) => msg.includes('packages_card_count'))).toBe(
      false,
    )

    const plan = report.pages.find((p) => p.routeVariant === 'plan')
    expect(plan).toBeTruthy()
    expect(plan!.hasContractGap).toBe(true)
    expect(
      plan!.validationIssues.some((msg) => msg.includes('plan-form') || msg.includes('form')),
    ).toBe(true)

    const text = formatWingsSideHiFiSeedReport(report)
    expect(text).toContain('DRY RUN')
    expect(text).toContain('Mode: offline')
    expect(text).toMatch(/title\+site|site-code/i)
  })

  it('counts missing pages and contract gaps independently (all-locale offline, no CMS pages)', () => {
    const report = buildWingsSideHiFiContentSeedOfflineDryRun({ locale: 'all' })
    expect(report.mode).toBe('offline')
    expect(report.summary.totalTargets).toBe(40)
    expect(report.summary.missingPages).toBe(40)
    expect(report.pages.every((p) => p.missingPage && p.status === 'missing_page')).toBe(true)
    expect(report.summary.validationGaps).toBeGreaterThan(0)
    expect(report.summary.validationGaps).toBe(report.pages.filter((p) => p.hasContractGap).length)

    // Packages: five cards — no card-count gap; plan form remains an offline gap.
    const packages = report.pages.filter((p) => p.routeVariant === 'packages')
    expect(packages).toHaveLength(5)
    for (const row of packages) {
      expect(row.missingPage).toBe(true)
      expect(row.validationIssues.some((msg) => msg.includes('packages_card_count'))).toBe(false)
    }
    const plans = report.pages.filter((p) => p.routeVariant === 'plan')
    for (const row of plans) {
      expect(row.hasContractGap).toBe(true)
    }
  })

  it('fetches and compares each requested locale independently in db mode', async () => {
    const localeCalls: string[] = []
    const payload: WingsSideHiFiSeedPayload = {
      destroy: vi.fn(async () => undefined),
      find: vi.fn(async (args) => {
        if (args.collection === 'sites') {
          return { docs: [{ id: 9, code: 'wing-side' }] }
        }
        if (args.collection === 'forms') {
          // Deterministic title+site match; ID is environment-local (not 20 on purpose).
          return {
            docs: [{ id: 777, title: WINGSSIDE_HIFI_PLAN_FORM_TITLE, site: 9 }],
          }
        }
        localeCalls.push(String(args.locale))
        if (args.locale === 'vi') {
          return {
            docs: [
              { id: 20, pathname: '/packages', slug: 'packages', wingsSideHiFi: { enabled: true } },
            ],
          }
        }
        return { docs: [] }
      }),
    }

    const report = await buildWingsSideHiFiContentSeedDbDryRun({
      locale: 'all',
      payload,
    })

    expect(report.mode).toBe('db')
    expect(report.localesFetched).toEqual(['en', 'vi', 'it', 'es', 'pt'])
    expect(localeCalls).toEqual(['en', 'vi', 'it', 'es', 'pt'])

    const enPackages = report.pages.find((p) => p.locale === 'en' && p.routeVariant === 'packages')
    const viPackages = report.pages.find((p) => p.locale === 'vi' && p.routeVariant === 'packages')
    expect(enPackages?.missingPage).toBe(true)
    expect(enPackages?.status).toBe('missing_page')
    expect(enPackages?.validationIssues.some((m) => /No pages document/i.test(m))).toBe(true)
    expect(viPackages?.pageId).toBe(20)
    expect(viPackages?.missingPage).toBe(false)

    // Plan desired payload must use resolved env ID 777 — not a hardcoded constant.
    const planChange = report.pages
      .find((p) => p.locale === 'en' && p.routeVariant === 'plan')
      ?.changes.find((c) => c.field === 'wingsSideHiFi.plan')
    const planTo = planChange?.to as { form?: unknown } | undefined
    expect(planTo?.form).toBe(777)
  })

  it('fetchWingsSideHiFiPagesForLocale passes the requested locale to Payload.find', async () => {
    const find = vi.fn(async (args: { collection: string; locale?: string }) => {
      if (args.collection === 'sites') return { docs: [{ id: 1 }] }
      expect(args.locale).toBe('it')
      return { docs: [{ id: 3, pathname: '/', slug: 'home' }] }
    })
    const docs = await fetchWingsSideHiFiPagesForLocale({
      locale: 'it',
      payload: { find },
    })
    expect(docs).toHaveLength(1)
    expect(find).toHaveBeenCalledTimes(2)
  })

  it('withPayloadDestroy always calls destroy after success', async () => {
    const destroy = vi.fn(async () => undefined)
    const value = await withPayloadDestroy(
      { destroy, find: async () => ({ docs: [] }) },
      async () => 42,
    )
    expect(value).toBe(42)
    expect(destroy).toHaveBeenCalledTimes(1)
  })

  it('withPayloadDestroy always calls destroy after error', async () => {
    const destroy = vi.fn(async () => undefined)
    await expect(
      withPayloadDestroy({ destroy, find: async () => ({ docs: [] }) }, async () => {
        throw new Error('boom')
      }),
    ).rejects.toThrow('boom')
    expect(destroy).toHaveBeenCalledTimes(1)
  })

  it('db mode without payload throws rather than hanging', async () => {
    await expect(
      buildWingsSideHiFiContentSeedDryRun({ mode: 'db', payload: null }),
    ).rejects.toThrow(/requires payload/i)
  })
})

describe('WingSide hi-fi plan form ID portability', () => {
  const siteId = 3

  const mockPayload = (
    forms: Array<{ id: number | string; title: string; site: number | string }>,
  ) => {
    const find = vi.fn(async (args: { collection: string; where?: unknown }) => {
      if (args.collection === 'sites') {
        return { docs: [{ id: siteId, code: 'wing-side' }] }
      }
      if (args.collection === 'forms') {
        const where = args.where as {
          and?: Array<Record<string, { equals?: unknown }>>
          title?: { equals?: string }
        }
        let filtered = forms
        if (where?.and) {
          for (const clause of where.and) {
            if (clause.title?.equals != null) {
              filtered = filtered.filter((f) => f.title === clause.title.equals)
            }
            if (clause.site?.equals != null) {
              filtered = filtered.filter((f) => f.site === clause.site.equals)
            }
          }
        } else if (where?.title?.equals != null) {
          filtered = filtered.filter((f) => f.title === where.title!.equals)
        }
        return { docs: filtered }
      }
      return { docs: [] }
    })
    return { find } satisfies WingsSideHiFiSeedPayload
  }

  it('resolves form by stable title + site ownership (portable across env IDs)', async () => {
    // Staging-like ID (not local SQLite 20).
    const staging = await resolveWingsSideHiFiPlanForm({
      payload: mockPayload([{ id: 901, title: WINGSSIDE_HIFI_PLAN_FORM_TITLE, site: siteId }]),
    })
    expect(staging.ok).toBe(true)
    if (staging.ok) {
      expect(staging.formId).toBe(901)
      expect(staging.title).toBe(WINGSSIDE_HIFI_PLAN_FORM_TITLE)
      expect(staging.siteId).toBe(siteId)
    }

    // Production-like different ID for the same title/site contract.
    const production = await resolveWingsSideHiFiPlanForm({
      payload: mockPayload([{ id: 4402, title: WINGSSIDE_HIFI_PLAN_FORM_TITLE, site: siteId }]),
    })
    expect(production.ok).toBe(true)
    if (production.ok) {
      expect(production.formId).toBe(4402)
    }

    // Attach preserves the resolved ID without hardcoding.
    const desired = attachResolvedPlanForm(
      { enabled: true, routeVariant: 'plan', plan: { stepsTitle: 'Plan' } },
      production.ok ? production.formId : null,
    )
    expect((desired.plan as { form?: unknown }).form).toBe(4402)
  })

  it('fails closed when form is missing', async () => {
    const result = await resolveWingsSideHiFiPlanForm({
      payload: mockPayload([]),
    })
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.reason).toBe('missing')
      expect(result.formId).toBeNull()
      expect(result.detail).toMatch(/No form titled/i)
    }
  })

  it('fails closed when form title exists but is not owned by the site', async () => {
    const result = await resolveWingsSideHiFiPlanForm({
      payload: mockPayload([{ id: 55, title: WINGSSIDE_HIFI_PLAN_FORM_TITLE, site: 99 }]),
    })
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.reason).toBe('unowned')
      expect(result.candidates).toHaveLength(1)
      expect(result.candidates[0]?.id).toBe(55)
    }
  })

  it('fails closed when multiple owned forms share the title (ambiguous)', async () => {
    const result = await resolveWingsSideHiFiPlanForm({
      payload: mockPayload([
        { id: 11, title: WINGSSIDE_HIFI_PLAN_FORM_TITLE, site: siteId },
        { id: 12, title: WINGSSIDE_HIFI_PLAN_FORM_TITLE, site: siteId },
      ]),
    })
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.reason).toBe('ambiguous')
      expect(result.candidates).toHaveLength(2)
    }
  })

  it('db dry-run surfaces plan_form_* validation gap when resolution fails', async () => {
    const payload: WingsSideHiFiSeedPayload = {
      find: vi.fn(async (args) => {
        if (args.collection === 'sites') return { docs: [{ id: siteId, code: 'wing-side' }] }
        if (args.collection === 'forms') return { docs: [] }
        return {
          docs: [
            {
              id: 283,
              pathname: '/plan-your-trip',
              slug: 'plan-your-trip',
              wingsSideHiFi: { enabled: false },
            },
          ],
        }
      }),
    }

    const report = await buildWingsSideHiFiContentSeedDbDryRun({
      locale: 'en',
      payload,
    })
    const plan = report.pages.find((p) => p.routeVariant === 'plan')
    expect(plan?.hasContractGap).toBe(true)
    expect(plan?.validationIssues.some((m) => m.startsWith('plan_form_missing:'))).toBe(true)
  })

  it('apply refuses to persist null plan form when resolution fails', async () => {
    const update = vi.fn(async () => ({}))
    const payload: WingsSideHiFiSeedPayload = {
      find: vi.fn(async (args) => {
        if (args.collection === 'sites') return { docs: [{ id: siteId, code: 'wing-side' }] }
        if (args.collection === 'forms') return { docs: [] }
        return {
          docs: [
            {
              id: 283,
              pathname: '/plan-your-trip',
              slug: 'plan-your-trip',
              wingsSideHiFi: { enabled: false },
            },
          ],
        }
      }),
      update,
    }

    const report = await applyWingsSideHiFiContentSeed({
      locale: 'en',
      payload,
      req: { user: { id: 1 } },
      siteCode: 'wing-side',
    })

    const plan = report.pages.find((p) => p.routeVariant === 'plan')
    expect(plan?.validationIssues.some((m) => m.includes('apply_blocked'))).toBe(true)
    // No page update for the unresolved plan form path.
    const updateCalls = update.mock.calls as unknown as Array<Array<{ id?: unknown }>>
    const planUpdates = updateCalls.filter((call) => call[0]?.id === 283)
    expect(planUpdates).toHaveLength(0)
  })

  it('stamps stable array row IDs portably (same shape across locales)', () => {
    const stamped = stampStableArrayRowIds(
      {
        routeVariant: 'home',
        home: {
          pillars: [
            { label: 'A', title: 'One', body: 'x' },
            { label: 'B', title: 'Two', body: 'y' },
          ],
        },
      },
      'home',
    ) as {
      home: { pillars: Array<{ id: string; title: string }> }
    }

    expect(stamped.home.pillars[0]?.id).toBe('ws-hifi-home.home.pillars-1')
    expect(stamped.home.pillars[1]?.id).toBe('ws-hifi-home.home.pillars-2')
  })

  it('mergeStableArrayRowIds prefers existing CMS ids for idempotent re-apply', () => {
    const desired = {
      home: {
        pillars: [
          { label: 'A', title: 'One', body: 'x' },
          { label: 'B', title: 'Two', body: 'y' },
        ],
      },
    }
    const current = {
      home: {
        pillars: [
          { id: 'cms-pillar-1', label: 'A', title: 'One', body: 'x' },
          { id: 'cms-pillar-2', label: 'B', title: 'Two', body: 'y' },
        ],
      },
    }
    const merged = mergeStableArrayRowIds(desired, current, 'home') as {
      home: { pillars: Array<{ id: string }> }
    }
    expect(merged.home.pillars[0]?.id).toBe('cms-pillar-1')
    expect(merged.home.pillars[1]?.id).toBe('cms-pillar-2')
  })
})

describe('WingSide hi-fi content seed CLI lifecycle', () => {
  it('offline CLI child exits within bound (no open-handle hang after report)', async () => {
    const childTimeoutMs = 45_000
    const started = Date.now()
    const result = await new Promise<{
      code: number | null
      signal: NodeJS.Signals | null
      stdout: string
      stderr: string
      timedOut: boolean
    }>((resolve) => {
      const child = spawn(
        'pnpm',
        ['exec', 'tsx', 'scripts/seed-wingsside-hifi-content.ts', '--offline', '--locale=en'],
        {
          cwd: appRoot,
          env: { ...process.env, FORCE_COLOR: '0' },
          shell: process.platform === 'win32',
          stdio: ['ignore', 'pipe', 'pipe'],
        },
      )
      let stdout = ''
      let stderr = ''
      let settled = false
      const timer = setTimeout(() => {
        if (settled) return
        settled = true
        child.kill('SIGKILL')
        resolve({ code: null, signal: 'SIGKILL', stdout, stderr, timedOut: true })
      }, childTimeoutMs)

      child.stdout.on('data', (chunk) => {
        stdout += String(chunk)
      })
      child.stderr.on('data', (chunk) => {
        stderr += String(chunk)
      })
      child.on('error', (error) => {
        if (settled) return
        settled = true
        clearTimeout(timer)
        resolve({
          code: 1,
          signal: null,
          stdout,
          stderr: `${stderr}\n${error.message}`,
          timedOut: false,
        })
      })
      child.on('close', (code, signal) => {
        if (settled) return
        settled = true
        clearTimeout(timer)
        resolve({ code, signal, stdout, stderr, timedOut: false })
      })
    })

    const elapsedMs = Date.now() - started
    expect(result.timedOut, `CLI hung after ${elapsedMs}ms; stderr=${result.stderr}`).toBe(false)
    expect(elapsedMs).toBeLessThan(childTimeoutMs)
    expect(result.code).toBe(0)
    expect(result.stdout).toMatch(/DRY RUN/i)
    expect(result.stdout).toMatch(/Mode: offline/)
  }, 60_000)
})
