import fs from 'node:fs/promises'
import crypto from 'node:crypto'
import os from 'node:os'
import path from 'node:path'
import { describe, expect, it, vi } from 'vitest'
import type { Payload } from 'payload'

vi.mock('payload', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>()
  return {
    ...actual,
    createLocalReq: vi.fn(async (options: any, payload: any) => ({
      context: options?.context || { disableRevalidate: true, seed: true },
      locale: options?.locale || 'vi',
      payload,
      user: options?.user || { id: 0, role: 'super-admin' },
      transactionID: undefined,
    })),
  }
})

import {
  isOldPrimaryHotline,
  isPreservedSecondaryHotline,
  normalizePhoneDigits,
  OLD_HOTLINE_PATTERN,
  transformCtaBlock,
  transformLexicalNode,
  validateAllowedDelta,
  NEW_PRIMARY_HOTLINE_DISPLAY,
  NEW_PRIMARY_HOTLINE_HREF,
} from '../../scripts/lib/wingsGoCtaHotlineRules'
import {
  planWingsGoCtaHotlineUpdates,
  applyWingsGoCtaHotlineUpdates,
  rollbackWingsGoCtaHotlineUpdates,
  validateSnapshotReport,
  isDraftDifferentFromPublished,
} from '../../scripts/updateWingsGoCtaHotline'

describe('WingsGo CTA Hotline rules and boundary safety', () => {
  it('normalizes phone numbers and identifies old primary hotline correctly', () => {
    expect(normalizePhoneDigits('0912910101')).toBe('0912910101')
    expect(normalizePhoneDigits('0912 910 101')).toBe('0912910101')
    expect(normalizePhoneDigits('+84 912 910 101')).toBe('0912910101')
    expect(normalizePhoneDigits('tel:0912910101')).toBe('0912910101')
    expect(normalizePhoneDigits('tel:+84912910101')).toBe('0912910101')

    expect(isOldPrimaryHotline('0912910101')).toBe(true)
    expect(isOldPrimaryHotline('0912 910 101')).toBe(true)
    expect(isOldPrimaryHotline('tel:0912910101')).toBe(true)
    expect(isOldPrimaryHotline('0948786775')).toBe(false)
    expect(isOldPrimaryHotline('0915250101')).toBe(false)
  })

  it('preserves secondary hotlines and custom numbers', () => {
    expect(isPreservedSecondaryHotline('0915250101')).toBe(true)
    expect(isPreservedSecondaryHotline('0915 250 101')).toBe(true)
    expect(isPreservedSecondaryHotline('tel:0915250101')).toBe(true)
    expect(isPreservedSecondaryHotline('0915260101')).toBe(true)
    expect(isPreservedSecondaryHotline('0915 260 101')).toBe(true)
    expect(isPreservedSecondaryHotline('0912910101')).toBe(false)
    expect(isPreservedSecondaryHotline('0988123456')).toBe(false)
  })

  it('enforces regex leading boundary to avoid replacing embedded numbers', () => {
    const embeddedDigits = 'Mã vận đơn: 1230912910101 hoặc tài khoản 990912910101'
    OLD_HOTLINE_PATTERN.lastIndex = 0
    expect(embeddedDigits.replace(OLD_HOTLINE_PATTERN, NEW_PRIMARY_HOTLINE_DISPLAY)).toBe(embeddedDigits)

    const doublePlus = '++84912910101'
    OLD_HOTLINE_PATTERN.lastIndex = 0
    expect(doublePlus.replace(OLD_HOTLINE_PATTERN, NEW_PRIMARY_HOTLINE_DISPLAY)).toBe(doublePlus)

    const validStandalone = 'Hotline 0912910101 hoặc tel:0912 910 101. Gọi 0912.910.101 ngay!'
    OLD_HOTLINE_PATTERN.lastIndex = 0
    expect(validStandalone.replace(OLD_HOTLINE_PATTERN, NEW_PRIMARY_HOTLINE_DISPLAY)).toBe(
      'Hotline 0948 786 775 hoặc tel:0948 786 775. Gọi 0948 786 775 ngay!',
    )
  })

  it('validates allowed delta strictly', () => {
    expect(() =>
      validateAllowedDelta([
        { field: 'text', oldValue: 'Hotline 0912910101', newValue: 'Hotline 0948 786 775' },
        { field: 'link.url', oldValue: 'tel:0912910101', newValue: 'tel:0948786775' },
      ]),
    ).not.toThrow()

    expect(() =>
      validateAllowedDelta([{ field: 'text', oldValue: 'Custom content', newValue: 'Arbitrary content' }]),
    ).toThrow(/Forbidden text delta/i)

    expect(() =>
      validateAllowedDelta([{ field: 'link.url', oldValue: 'tel:0915250101', newValue: 'tel:0948786775' }]),
    ).toThrow(/Forbidden URL delta/i)
  })

  it('transforms Lexical AST nodes and CTA blocks with full preservation', () => {
    const lexicalTree = {
      type: 'root',
      children: [
        {
          type: 'paragraph',
          children: [
            { type: 'text', text: 'Để lại thông tin hoặc liên hệ Hotline 0912910101 trong 15 phút!' },
            {
              type: 'link',
              fields: { url: 'tel:0912910101' },
              children: [{ type: 'text', text: '0912 910 101' }],
            },
          ],
        },
      ],
    }

    const { node, changed } = transformLexicalNode(lexicalTree)
    expect(changed).toBe(true)
    const updatedLex = node as any
    expect(updatedLex.children[0].children[0].text).toContain('0948 786 775')
    expect(updatedLex.children[0].children[1].fields.url).toBe(NEW_PRIMARY_HOTLINE_HREF)

    const ctaBlock = {
      blockType: 'cta',
      presentation: 'card',
      eyebrow: 'Hotline WingsGo: 0912 910 101',
      richText: { root: lexicalTree },
      links: [
        { link: { appearance: 'default', label: 'Nhận tư vấn ngay', type: 'custom', url: '/lien-he' } },
        { link: { appearance: 'outline', label: 'Gọi Hotline: 0912910101', type: 'custom', url: 'tel:0912910101' } },
        { link: { appearance: 'outline', label: 'Hotline phụ: 0915 250 101', type: 'custom', url: 'tel:0915250101' } },
      ],
      supportingQuote: 'Liên hệ 0912 910 101 để được hỗ trợ tốt nhất.',
    }

    const { updatedBlock, changed: ctaChanged } = transformCtaBlock(ctaBlock)
    expect(ctaChanged).toBe(true)
    const updatedCta = updatedBlock as any
    expect(updatedCta.eyebrow).toBe('Hotline WingsGo: 0948 786 775')
    expect(updatedCta.supportingQuote).toBe('Liên hệ 0948 786 775 để được hỗ trợ tốt nhất.')
    expect(updatedCta.links[0].link.url).toBe('/lien-he')
    expect(updatedCta.links[1].link.url).toBe('tel:0948786775')
    expect(updatedCta.links[1].link.label).toBe('Gọi Hotline: 0948 786 775')
    expect(updatedCta.links[2].link.url).toBe('tel:0915250101')

    const rerun = transformCtaBlock(updatedCta)
    expect(rerun.changed).toBe(false)
  })

  it('detects draft differences across hero, title, layout, and meta', () => {
    const published = {
      title: 'Campaign 2026',
      hero: { type: 'mediumImpact', text: 'Hero' },
      layout: [{ blockType: 'cta' }],
      meta: { title: 'Meta' },
      _status: 'published',
    }

    expect(isDraftDifferentFromPublished(published, structuredClone(published))).toBe(false)
    expect(isDraftDifferentFromPublished(published, { ...published, _status: 'draft' })).toBe(true)
    expect(isDraftDifferentFromPublished(published, { ...published, title: 'Modified' })).toBe(true)
    expect(isDraftDifferentFromPublished(published, { ...published, hero: { type: 'lowImpact' } })).toBe(true)
    expect(isDraftDifferentFromPublished(published, { ...published, layout: [] })).toBe(true)
    expect(isDraftDifferentFromPublished(published, { ...published, meta: { title: 'New Meta' } })).toBe(true)
  })
})

function createMockPayloadFixture() {
  const wingsGoSite = { id: 2, code: 'wings-go', defaultLocale: 'vi', supportedLocales: ['vi', 'en'] }
  const pageWithOldCta: {
    id: number
    site: number
    slug: string
    pathname: string
    title: string
    hero: Record<string, unknown>
    meta: Record<string, unknown>
    _status: string
    updatedAt: string
    layout: Array<Record<string, unknown>>
  } = {
    id: 101,
    site: 2,
    slug: 'campaign',
    pathname: '/campaign',
    title: 'Tour theo mùa',
    hero: { type: 'mediumImpact' },
    meta: { title: 'Tour theo mùa' },
    _status: 'published',
    updatedAt: '2026-11-01T10:00:00.000Z',
    layout: [
      {
        blockType: 'cta',
        richText: {
          root: {
            type: 'root',
            children: [{ type: 'paragraph', children: [{ type: 'text', text: 'Hotline 0912910101' }] }],
          },
        },
        links: [{ link: { label: 'Gọi Hotline: 0912910101', url: 'tel:0912910101' } }],
      },
    ],
  }

  const pageWithCorrectCta: {
    id: number
    site: number
    slug: string
    pathname: string
    title: string
    hero: Record<string, unknown>
    meta: Record<string, unknown>
    _status: string
    updatedAt: string
    layout: Array<Record<string, unknown>>
  } = {
    id: 102,
    site: 2,
    slug: 'lien-he',
    pathname: '/lien-he',
    title: 'Liên hệ',
    hero: { type: 'lowImpact' },
    meta: { title: 'Liên hệ' },
    _status: 'published',
    updatedAt: '2026-11-01T10:00:00.000Z',
    layout: [
      {
        blockType: 'cta',
        richText: {
          root: {
            type: 'root',
            children: [{ type: 'paragraph', children: [{ type: 'text', text: 'Hotline 0948 786 775' }] }],
          },
        },
        links: [{ link: { label: 'Gọi ngay: 0948 786 775', url: 'tel:0948786775' } }],
      },
    ],
  }

  const pages = [pageWithOldCta, pageWithCorrectCta]

  const find = vi.fn(async ({ collection, locale }) => {
    if (collection === 'sites') return { docs: [wingsGoSite] }
    if (collection === 'pages') {
      if (locale === 'vi') return { docs: pages }
      return { docs: [] }
    }
    return { docs: [] }
  })

  const findByID = vi.fn(async ({ collection, id }) => {
    if (collection === 'pages') {
      const page = pages.find((p) => p.id === id)
      return page ? structuredClone(page) : null
    }
    return null
  })

  const update = vi.fn(async ({ id, data }) => {
    const page = pages.find((p) => p.id === id)
    if (page) {
      Object.assign(page, data, { updatedAt: '2026-11-02T12:00:00.000Z' })
      return page
    }
    throw new Error('Not found')
  })

  const executeMock = vi.fn(async () => {})
  const db = {
    beginTransaction: vi.fn(async () => 'mock-tx-1'),
    commitTransaction: vi.fn(async () => {}),
    rollbackTransaction: vi.fn(async () => {}),
    sessions: {
      'mock-tx-1': { db: { execute: executeMock } },
    },
  }

  return {
    wingsGoSite,
    pages,
    pageWithOldCta,
    pageWithCorrectCta,
    find,
    findByID,
    update,
    executeMock,
    db,
    payload: { find, findByID, update, db } as unknown as Payload,
  }
}

describe('WingsGo CTA Hotline Payload updater lifecycle with fail-closed locking & crash recovery', () => {
  it('plans by default (dry-run) without writing to the database', async () => {
    const fixture = createMockPayloadFixture()
    const plan = await planWingsGoCtaHotlineUpdates(fixture.payload)

    expect(plan.mode).toBe('dry-run')
    expect(plan.siteCode).toBe('wings-go')
    expect(plan.summary.pagesWithChanges).toBe(1)
    expect(plan.summary.pagesNoop).toBe(1)
    expect(fixture.update).not.toHaveBeenCalled()

    const plannedPage = plan.pages.find((p) => p.pageID === 101)
    expect(plannedPage?.status).toBe('planned')
  })

  it('fails closed when postgres row locking fails or execute is missing', async () => {
    const fixture = createMockPayloadFixture()
    const plan = await planWingsGoCtaHotlineUpdates(fixture.payload)

    // Simulate database session does not support execute
    fixture.db.sessions['mock-tx-1'].db.execute = null as any

    const tmpSnapshot = path.join(os.tmpdir(), `wingsgo-cta-lockfail-${Date.now()}.json`)
    try {
      await expect(
        applyWingsGoCtaHotlineUpdates(fixture.payload, { report: plan, snapshotPath: tmpSnapshot }),
      ).rejects.toThrow(/PostgreSQL adapter required for row locking/i)
      expect(fixture.update).not.toHaveBeenCalled()
    } finally {
      await fs.rm(tmpSnapshot, { force: true })
    }
  })

  it('recomputes before/after hashes and transformation in snapshot validation and rejects tampered plan', async () => {
    const fixture = createMockPayloadFixture()
    const plan = await planWingsGoCtaHotlineUpdates(fixture.payload)

    // Tamper with afterLayout directly without updating hash
    plan.pages[0].locales['vi']!.afterLayout = [{ blockType: 'tampered' }]
    expect(() => validateSnapshotReport(plan)).toThrow(/afterLayoutHash mismatch/i)

    // Tamper with transformation output
    plan.pages[0].locales['vi']!.afterLayoutHash = 'tampered-hash'
    expect(() => validateSnapshotReport(plan)).toThrow(/afterLayoutHash mismatch/i)
  })

  it('applies updates under row lock, writes prewrite journal, and disables Next cache hooks', async () => {
    const fixture = createMockPayloadFixture()
    const plan = await planWingsGoCtaHotlineUpdates(fixture.payload)

    const tmpSnapshot = path.join(os.tmpdir(), `wingsgo-cta-snapshot-${Date.now()}.json`)
    try {
      const appliedReport = await applyWingsGoCtaHotlineUpdates(fixture.payload, {
        report: plan,
        snapshotPath: tmpSnapshot,
      })

      // Verify row lock was acquired with 5s timeout
      expect(fixture.executeMock).toHaveBeenCalledWith(expect.anything())
      expect(fixture.db.commitTransaction).toHaveBeenCalledWith('mock-tx-1')

      // Verify disableRevalidate was passed to avoid static generation store crash
      const updateCall = fixture.update.mock.calls[0][0]
      expect(updateCall.context.disableRevalidate).toBe(true)
      expect(appliedReport.summary.pagesUpdated).toBe(1)
    } finally {
      await fs.rm(tmpSnapshot, { force: true })
    }
  })

  it('preserves latest draft on apply and rollback if hero, title, layout, or meta modified', async () => {
    const fixture = createMockPayloadFixture()
    const plan = await planWingsGoCtaHotlineUpdates(fixture.payload)

    // Mock latest draft having an unreleased hero modification
    fixture.findByID.mockImplementation(async ({ collection, id, draft }) => {
      if (collection === 'pages' && id === 101) {
        if (draft) {
          return { ...fixture.pageWithOldCta, hero: { type: 'highImpact', title: 'Editor Draft' } }
        }
        return fixture.pageWithOldCta
      }
      return null
    })

    const tmpSnapshot = path.join(os.tmpdir(), `wingsgo-cta-drafthero-${Date.now()}.json`)
    try {
      await expect(
        applyWingsGoCtaHotlineUpdates(fixture.payload, { report: plan, snapshotPath: tmpSnapshot }),
      ).rejects.toThrow(/Draft safety abort.*Preserving editor work/i)
      expect(fixture.update).not.toHaveBeenCalled()
    } finally {
      await fs.rm(tmpSnapshot, { force: true })
    }
  })

  it('enables crash recovery: prewrite journal rolls back successfully even if status was planned', async () => {
    const fixture = createMockPayloadFixture()
    const plan = await planWingsGoCtaHotlineUpdates(fixture.payload)

    const tmpSnapshot = path.join(os.tmpdir(), `wingsgo-cta-crashrec-${Date.now()}.json`)
    try {
      // Simulate crash right after apply commit: database has afterLayout, but journal still has mode: 'dry-run' and status: 'planned'
      const journal = structuredClone(plan)
      await fs.writeFile(tmpSnapshot, JSON.stringify(journal, null, 2), 'utf8')

      // Manually set database to afterLayout (simulating committed state before crash)
      fixture.pageWithOldCta.layout = journal.pages[0].locales['vi']!.afterLayout

      // Targeted rollback using the prewrite journal
      const rollback = await rollbackWingsGoCtaHotlineUpdates(fixture.payload, { report: journal })
      expect(rollback.summary.pagesRolledBack).toBe(1)
      expect(fixture.update).toHaveBeenCalledTimes(1)

      const rollbackCall = fixture.update.mock.calls[0][0]
      expect(rollbackCall.data.layout[0].links[0].link.url).toBe('tel:0912910101')
    } finally {
      await fs.rm(tmpSnapshot, { force: true })
    }
  })
})
describe('Codex review regressions for recovery journals', () => {
  it('refuses a reused journal path and preserves the original bytes', async () => {
    const fixture = createMockPayloadFixture()
    const journalPath = path.join(os.tmpdir(), 'cta-journal-' + crypto.randomUUID() + '.json')
    try {
      const plan = await planWingsGoCtaHotlineUpdates(fixture.payload)
      await applyWingsGoCtaHotlineUpdates(fixture.payload, { report: plan, snapshotPath: journalPath })
      const original = await fs.readFile(journalPath, 'utf8')
      const rerun = await planWingsGoCtaHotlineUpdates(fixture.payload)
      await expect(applyWingsGoCtaHotlineUpdates(fixture.payload, {
        report: rerun, snapshotPath: journalPath,
      })).rejects.toThrow(/EEXIST/)
      expect(await fs.readFile(journalPath, 'utf8')).toBe(original)
      expect(JSON.parse(original).pages[0].status).toBe('planned')
    } finally {
      await fs.rm(journalPath, { force: true })
    }
  })

  it('never rewrites a recovery journal after commit', async () => {
    const fixture = createMockPayloadFixture()
    const journalPath = path.join(os.tmpdir(), 'cta-immutable-' + crypto.randomUUID() + '.json')
    const plan = await planWingsGoCtaHotlineUpdates(fixture.payload)
    const write = vi.spyOn(fs, 'writeFile').mockRejectedValue(new Error('disk full after commit'))
    try {
      const applied = await applyWingsGoCtaHotlineUpdates(fixture.payload, {
        report: plan, snapshotPath: journalPath,
      })
      expect(applied.summary.pagesUpdated).toBe(1)
      expect(write).not.toHaveBeenCalled()
      expect(JSON.parse(await fs.readFile(journalPath, 'utf8'))).toEqual(plan)
    } finally {
      write.mockRestore()
      await fs.rm(journalPath, { force: true })
    }
  })

  it('rolls back its transaction when lock setup fails in apply or rollback', async () => {
    for (const mode of ['apply', 'rollback']) {
      const fixture = createMockPayloadFixture()
      const journalPath = path.join(os.tmpdir(), 'cta-lock-' + crypto.randomUUID() + '.json')
      const plan = await planWingsGoCtaHotlineUpdates(fixture.payload)
      fixture.executeMock.mockRejectedValueOnce(new Error('lock timeout'))
      try {
        const operation = mode === 'apply'
          ? applyWingsGoCtaHotlineUpdates(fixture.payload, { report: plan, snapshotPath: journalPath })
          : rollbackWingsGoCtaHotlineUpdates(fixture.payload, { report: plan })
        await expect(operation).rejects.toThrow('lock timeout')
        expect(fixture.db.rollbackTransaction).toHaveBeenCalledWith('mock-tx-1')
        expect(fixture.update).not.toHaveBeenCalled()
      } finally {
        await fs.rm(journalPath, { force: true })
      }
    }
  })
})
