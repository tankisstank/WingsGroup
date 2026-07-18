import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import {
  assertCleanupScope,
  assertCleanupPlanRecords,
  buildCleanupPlanRecords,
  classifyCleanupState,
  cleanupChecksum,
  cleanupTransitionDecision,
  cleanCleanupTarget,
  extractCleanupTarget,
  wingsSideBestPriceCleanupBatchID,
  wingsSideBestPriceTechnicalCopy,
  type CleanupDocument,
} from '../../scripts/lib/wingsSideBestPriceCleanup'

const batchID = wingsSideBestPriceCleanupBatchID
const siteID = 3

const documentFor = (id: number): CleanupDocument => ({
  _status: 'published',
  factSummary: {
    operatorNote: wingsSideBestPriceTechnicalCopy.factSummaryOperatorNote,
    routeSummary: 'Hanoi - Hue',
  },
  id,
  servicesSummary: {
    hotelSummary: 'Boutique hotel',
    notes: [
      { id: 'keep-1', label: 'Bring walking shoes.' },
      { id: 'remove', label: wingsSideBestPriceTechnicalCopy.servicesSummaryNoteLabel },
      { id: 'keep-2', label: 'Passport required.' },
    ],
    operatorNotes: wingsSideBestPriceTechnicalCopy.servicesSummaryOperatorNotes,
  },
  site: siteID,
  slug: `tour-${id}`,
  sourceProvenance: {
    importBatchId: batchID,
    sourceHash: `hash-${id}`,
    sourceId: String(id),
  },
  tourCode: `BPT-${id}`,
  updatedAt: '2026-07-17T00:00:00.000Z',
  wrapperPage: 1000 + id,
})

const scopeDocuments = (count = 22) => Array.from({ length: count }, (_, index) => documentFor(index + 1))
const wrapperSites = (count = 22) =>
  new Map(Array.from({ length: count }, (_, index) => [String(1001 + index), siteID]))

describe('WingSide BestPrice cleanup planner', () => {
  it('removes only the exact technical row and preserves sibling IDs and order', () => {
    const cleaned = cleanCleanupTarget(extractCleanupTarget(documentFor(1)))

    expect(cleaned).toEqual({
      factSummaryOperatorNote: { present: true, value: null },
      servicesSummaryNotes: {
        present: true,
        value: [
          { id: 'keep-1', label: 'Bring walking shoes.' },
          { id: 'keep-2', label: 'Passport required.' },
        ],
      },
      servicesSummaryOperatorNotes: { present: true, value: null },
    })
  })

  it('does not remove approximate or embedded copy', () => {
    const document = documentFor(1)
    document.factSummary!.operatorNote = `${wingsSideBestPriceTechnicalCopy.factSummaryOperatorNote} Editorial context.`
    ;(document.servicesSummary!.notes as Array<Record<string, unknown>>)[1].label =
      ` ${wingsSideBestPriceTechnicalCopy.servicesSummaryNoteLabel}`

    const cleaned = cleanCleanupTarget(extractCleanupTarget(document))
    expect(cleaned.factSummaryOperatorNote.value).toContain('Editorial context')
    expect(cleaned.servicesSummaryNotes.value).toHaveLength(3)
  })

  it('binds scope to provenance and detects provenance drift', () => {
    const documents = assertCleanupScope({
      batchID,
      documents: scopeDocuments(),
      siteID,
      wrapperSiteByID: wrapperSites(),
    })
    const plan = buildCleanupPlanRecords({ batchID, documents, siteID })
    const drifted = scopeDocuments()
    drifted[0].sourceProvenance!.sourceHash = 'changed-after-plan'

    expect(plan[0].provenanceChecksum).toBe(cleanupChecksum(documents[0].sourceProvenance))
    expect(classifyCleanupState({ batchID, documents: drifted, records: plan, siteID })).toBe(
      'unknown',
    )
  })

  it.each([21, 23])('refuses a scoped count of %s', (count) => {
    expect(() =>
      assertCleanupScope({
        batchID,
        documents: scopeDocuments(count),
        siteID,
        wrapperSiteByID: wrapperSites(count),
      }),
    ).toThrow(`Expected 22 scoped TourProducts, found ${count}`)
  })

  it('refuses a wrapper belonging to another site', () => {
    const wrappers = wrapperSites()
    wrappers.set('1001', 99)
    expect(() =>
      assertCleanupScope({ batchID, documents: scopeDocuments(), siteID, wrapperSiteByID: wrappers }),
    ).toThrow('wrapperPage is missing or belongs to another site')
  })

  it('hard-requires published products and treats status drift as scope drift', () => {
    const draftDocuments = scopeDocuments()
    draftDocuments[0]._status = 'draft'
    expect(() =>
      assertCleanupScope({
        batchID,
        documents: draftDocuments,
        siteID,
        wrapperSiteByID: wrapperSites(),
      }),
    ).toThrow('must remain published')

    const documents = assertCleanupScope({
      batchID,
      documents: scopeDocuments(),
      siteID,
      wrapperSiteByID: wrapperSites(),
    })
    const plan = buildCleanupPlanRecords({ batchID, documents, siteID })
    documents[0]._status = 'draft'
    expect(classifyCleanupState({ batchID, documents, records: plan, siteID })).toBe('unknown')
  })

  it('refuses duplicate wrapper relationships', () => {
    const documents = scopeDocuments()
    documents[1].wrapperPage = documents[0].wrapperPage
    expect(() =>
      assertCleanupScope({ batchID, documents, siteID, wrapperSiteByID: wrapperSites() }),
    ).toThrow('must have distinct wrapperPages')
  })

  it('keeps future imports free of public technical copy', () => {
    const importer = readFileSync(join(process.cwd(), 'scripts', 'import-bestprice-22.ts'), 'utf8')
    expect(importer).not.toContain(wingsSideBestPriceTechnicalCopy.factSummaryOperatorNote)
    expect(importer).not.toContain(wingsSideBestPriceTechnicalCopy.servicesSummaryOperatorNotes)
    expect(importer).not.toContain(wingsSideBestPriceTechnicalCopy.servicesSummaryNoteLabel)
  })

  it('classifies mixed state instead of resuming', () => {
    const documents = assertCleanupScope({
      batchID,
      documents: scopeDocuments(),
      siteID,
      wrapperSiteByID: wrapperSites(),
    })
    const plan = buildCleanupPlanRecords({ batchID, documents, siteID })
    const mixed = scopeDocuments()
    mixed[0].factSummary!.operatorNote = plan[0].after.factSummaryOperatorNote.value
    mixed[0].servicesSummary!.operatorNotes = plan[0].after.servicesSummaryOperatorNotes.value
    mixed[0].servicesSummary!.notes = plan[0].after.servicesSummaryNotes.value

    expect(classifyCleanupState({ batchID, documents: mixed, records: plan, siteID })).toBe('mixed')
  })

  it('recognizes an entirely applied plan for idempotent resume', () => {
    const documents = assertCleanupScope({
      batchID,
      documents: scopeDocuments(),
      siteID,
      wrapperSiteByID: wrapperSites(),
    })
    const plan = buildCleanupPlanRecords({ batchID, documents, siteID })
    const after = scopeDocuments().map((document, index) => ({
      ...document,
      factSummary: {
        ...document.factSummary,
        operatorNote: plan[index].after.factSummaryOperatorNote.value,
      },
      servicesSummary: {
        ...document.servicesSummary,
        notes: plan[index].after.servicesSummaryNotes.value,
        operatorNotes: plan[index].after.servicesSummaryOperatorNotes.value,
      },
    }))

    expect(classifyCleanupState({ batchID, documents: after, records: plan, siteID })).toBe('after')
  })

  it('refuses rollback when an after-state target field drifted', () => {
    const documents = assertCleanupScope({
      batchID,
      documents: scopeDocuments(),
      siteID,
      wrapperSiteByID: wrapperSites(),
    })
    const plan = buildCleanupPlanRecords({ batchID, documents, siteID })
    const drifted = scopeDocuments().map((document, index) => ({
      ...document,
      factSummary: {
        ...document.factSummary,
        operatorNote: plan[index].after.factSummaryOperatorNote.value,
      },
      servicesSummary: {
        ...document.servicesSummary,
        notes: plan[index].after.servicesSummaryNotes.value,
        operatorNotes: plan[index].after.servicesSummaryOperatorNotes.value,
      },
    }))
    drifted[0].servicesSummary!.operatorNotes = 'A concurrent editorial change.'

    expect(classifyCleanupState({ batchID, documents: drifted, records: plan, siteID })).toBe(
      'unknown',
    )
  })

  it('refuses a plan whose rollback snapshot or cleanup target was edited', () => {
    const documents = assertCleanupScope({
      batchID,
      documents: scopeDocuments(),
      siteID,
      wrapperSiteByID: wrapperSites(),
    })
    const plan = buildCleanupPlanRecords({ batchID, documents, siteID })
    plan[0].after.servicesSummaryNotes = {
      present: true,
      value: [{ id: 'tampered', label: 'Delete legitimate copy.' }],
    }

    expect(() => assertCleanupPlanRecords(plan)).toThrow('failed integrity validation')
  })

  it('preserves missing and null notes without manufacturing an empty array', () => {
    const missing = documentFor(1)
    delete missing.servicesSummary!.notes
    const nullNotes = documentFor(2)
    nullNotes.servicesSummary!.notes = null

    expect(cleanCleanupTarget(extractCleanupTarget(missing)).servicesSummaryNotes).toEqual({
      present: false,
      value: null,
    })
    expect(cleanCleanupTarget(extractCleanupTarget(nullNotes)).servicesSummaryNotes).toEqual({
      present: true,
      value: null,
    })
  })

  it('classifies a fully unchanged 22-record plan as equivalent for apply and rollback', () => {
    const documents = scopeDocuments().map((document) => ({
      ...document,
      factSummary: { routeSummary: 'Hanoi - Hue' },
      servicesSummary: { hotelSummary: 'Boutique hotel', notes: null },
    }))
    const scoped = assertCleanupScope({
      batchID,
      documents,
      siteID,
      wrapperSiteByID: wrapperSites(),
    })
    const plan = buildCleanupPlanRecords({ batchID, documents: scoped, siteID })

    expect(plan.every(({ action }) => action === 'unchanged')).toBe(true)
    expect(classifyCleanupState({ batchID, documents: scoped, records: plan, siteID })).toBe(
      'equivalent',
    )
    expect(cleanupTransitionDecision('apply', 'equivalent')).toEqual({
      desiredState: 'after',
      resumed: true,
    })
    expect(cleanupTransitionDecision('rollback', 'equivalent')).toEqual({
      desiredState: 'before',
      resumed: true,
    })
  })
})
