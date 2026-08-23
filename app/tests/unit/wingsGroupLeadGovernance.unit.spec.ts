import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it, vi } from 'vitest'

import { wingsGroupLeadGovernanceField } from '@/lead-capture/governanceFields'
import {
  runWingsGroupLeadRetentionBatch,
  WINGSGROUP_RETENTION_BATCH_LIMIT,
} from '@/lead-capture/retention'

describe('WingsGroup lead governance fields', () => {
  it('keeps optional governance metadata private and immutable outside trusted server writes', () => {
    expect(wingsGroupLeadGovernanceField).toMatchObject({
      admin: { readOnly: true },
      name: 'wingsGroupLead',
      type: 'group',
    })
    const access = (
      'access' in wingsGroupLeadGovernanceField ? wingsGroupLeadGovernanceField.access : {}
    ) as {
      read: (args: unknown) => boolean
      update: (args: unknown) => boolean
    }
    expect(access.read({ req: {} })).toBe(false)
    expect(access.read({ req: { user: { id: 1 } } })).toBe(true)
    expect(access.update({ req: { user: { id: 1 } } })).toBe(false)

    const fields =
      'fields' in wingsGroupLeadGovernanceField ? wingsGroupLeadGovernanceField.fields : []
    const retention = fields.find((field) => 'name' in field && field.name === 'retentionUntil')
    expect(retention).toMatchObject({ index: true, type: 'date' })
    const preferredChannel = fields.find(
      (field) => 'name' in field && field.name === 'preferredChannel',
    )
    expect(preferredChannel).toMatchObject({
      options: ['zalo', 'whatsapp', 'messenger', 'callback'],
      type: 'select',
    })
  })
})

describe('WingsGroup lead retention', () => {
  it('is disabled by default without touching data', async () => {
    const payload = { delete: vi.fn(), find: vi.fn() }

    await expect(runWingsGroupLeadRetentionBatch({ enabled: false, payload })).resolves.toEqual({
      deleted: 0,
      enabled: false,
      failed: 0,
      hasMore: false,
    })
    expect(payload.find).not.toHaveBeenCalled()
    expect(payload.delete).not.toHaveBeenCalled()
  })

  it('deletes only an expired WingsGroup record and is idempotent on the next batch', async () => {
    const records = [
      { id: 1, kind: 'expired-wingsgroup' },
      { id: 2, kind: 'newer-wingsgroup' },
      { id: 3, kind: 'expired-other-tenant' },
    ]
    const find = vi.fn(async ({ collection }: { collection: string }) => {
      if (collection === 'sites') return { docs: [{ id: 9 }] }
      return { docs: records.filter(({ kind }) => kind === 'expired-wingsgroup') }
    })
    const remove = vi.fn(async ({ id }: { id: number }) => {
      const index = records.findIndex((record) => record.id === id)
      if (index >= 0) records.splice(index, 1)
    })
    const payload = { delete: remove, find }

    await expect(
      runWingsGroupLeadRetentionBatch({
        enabled: true,
        now: new Date('2026-08-14T00:00:00.000Z'),
        payload,
      }),
    ).resolves.toEqual({ deleted: 1, enabled: true, failed: 0, hasMore: false })
    await expect(
      runWingsGroupLeadRetentionBatch({
        enabled: true,
        now: new Date('2026-08-14T00:00:00.000Z'),
        payload,
      }),
    ).resolves.toEqual({ deleted: 0, enabled: true, failed: 0, hasMore: false })

    expect(records).toEqual([
      { id: 2, kind: 'newer-wingsgroup' },
      { id: 3, kind: 'expired-other-tenant' },
    ])
    expect(remove).toHaveBeenCalledTimes(1)
    expect(find).toHaveBeenCalledWith(
      expect.objectContaining({
        collection: 'form-submissions',
        limit: WINGSGROUP_RETENTION_BATCH_LIMIT,
        where: {
          and: [
            { site: { equals: 9 } },
            {
              'wingsGroupLead.consentVersion': { equals: 'wingsgroup-contact-v1' },
            },
            {
              'wingsGroupLead.retentionUntil': {
                less_than_equal: '2026-08-14T00:00:00.000Z',
              },
            },
          ],
        },
      }),
    )
  })
})

describe('WingsGroup lead governance migration', () => {
  it('is additive/idempotent on apply and has an explicit scoped down path', () => {
    const source = fs.readFileSync(
      path.resolve(process.cwd(), 'src/migrations/20260814_090000_wingsgroup_lead_governance.ts'),
      'utf8',
    )

    expect(source).toMatch(/ADD COLUMN IF NOT EXISTS "wings_group_lead_retention_until"/)
    expect(source).toMatch(
      /CREATE INDEX IF NOT EXISTS "form_submissions_wings_group_lead_site_retention_idx"/,
    )
    expect(source).toMatch(
      /DROP INDEX IF EXISTS "form_submissions_wings_group_lead_site_retention_idx"/,
    )
    expect(source).toMatch(/DROP COLUMN IF EXISTS "wings_group_lead_retention_until"/)
    expect(source).toContain('site_id')
  })

  it('registers the additive callback enum migration without a rollback deletion', () => {
    const source = fs.readFileSync(
      path.resolve(process.cwd(), 'src/migrations/20260823_090000_wingsgroup_callback_channel.ts'),
      'utf8',
    )

    expect(source).toMatch(
      /enum_site_settings_wings_group_v3_consultation_channels_key[\s\S]*ADD VALUE IF NOT EXISTS 'callback'/,
    )
    expect(source).toMatch(
      /enum_form_submissions_wings_group_lead_preferred_channel[\s\S]*ADD VALUE IF NOT EXISTS 'callback'/,
    )
    expect(source).not.toMatch(/DROP TYPE|DROP VALUE/i)
  })
})
