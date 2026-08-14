import { describe, expect, it } from 'vitest'

import { parseLeadRequest, validateFieldsForForm } from '@/lead-capture/validation'
import {
  buildWingsGroupOperationalFields,
  getWingsGroupRetentionUntil,
  isWingsGroupOperationalField,
  normalizeTrustedLeadSourcePath,
  resolveWingsGroupLeadGovernance,
  validateWingsGroupLeadContract,
  validateWingsGroupRequiredFields,
  WINGSGROUP_CONSENT_COPY,
  WINGSGROUP_CONSENT_VERSION,
} from '@/lead-capture/wingsGroupV3'
import type { Form } from '@/payload-types'

const settings = {
  wingsGroupV3: {
    consultationChannels: [
      { key: 'zalo', state: 'unconfigured' },
      {
        key: 'whatsapp',
        owner: 'Commercial operations',
        sla: '4 business hours',
        state: 'approved',
        trackingReference: 'analytics-review-1',
        url: 'https://example.com/whatsapp',
      },
      { key: 'messenger', state: 'disabled' },
    ],
    enabled: true,
    privacy: {
      consentRequired: true,
      consentVersion: 'wingsgroup-contact-v1',
      dataSubjectContact: 'info@doicanhviet.com',
      interBranchTransferAllowed: true,
      policyRouteEn: '/en/chinh-sach-bao-mat',
      policyRouteVi: '/chinh-sach-bao-mat',
      policyVersion: 'wingsgroup-privacy-v1',
      retentionMonths: 24,
    },
  },
}

describe('WingsGroup v3 lead governance', () => {
  it('publishes only complete approved channels and keeps unconfigured channels non-clickable', () => {
    const governance = resolveWingsGroupLeadGovernance(settings, 'vi')

    expect(governance).toMatchObject({
      consentCopy: WINGSGROUP_CONSENT_COPY.vi,
      consentVersion: WINGSGROUP_CONSENT_VERSION,
      policyHref: '/chinh-sach-bao-mat',
      retentionMonths: 24,
    })
    expect(governance?.channels).toEqual([
      { key: 'zalo', label: 'Zalo', state: 'pending-update' },
      {
        href: 'https://example.com/whatsapp',
        key: 'whatsapp',
        label: 'WhatsApp',
        state: 'approved',
      },
    ])
  })

  it('fails closed when approved privacy configuration differs from the release contract', () => {
    expect(
      resolveWingsGroupLeadGovernance(
        {
          ...settings,
          wingsGroupV3: {
            ...settings.wingsGroupV3,
            privacy: { ...settings.wingsGroupV3.privacy, retentionMonths: 25 },
          },
        },
        'en',
      ),
    ).toBeNull()
  })

  it('requires exact consent and required name/need semantics', () => {
    const governance = resolveWingsGroupLeadGovernance(settings, 'en')!
    expect(
      validateWingsGroupLeadContract(
        { consent: true, consentVersion: WINGSGROUP_CONSENT_VERSION },
        governance,
      ),
    ).toEqual({ consent: true, consentVersion: WINGSGROUP_CONSENT_VERSION })
    expect(() =>
      validateWingsGroupLeadContract(
        { consent: false, consentVersion: WINGSGROUP_CONSENT_VERSION },
        governance,
      ),
    ).toThrow(/consent/i)
    expect(() => validateWingsGroupRequiredFields([{ field: 'name', value: 'Alice' }])).toThrow(
      /required/i,
    )
    expect(() =>
      validateWingsGroupRequiredFields([
        { field: 'full-name', value: 'Alice' },
        { field: 'message', value: 'A private itinerary' },
      ]),
    ).not.toThrow()
  })

  it('derives bounded operational metadata and a 24-month retention marker', () => {
    const consentedAt = new Date('2024-02-29T10:15:00.000Z')
    const fields = buildWingsGroupOperationalFields({
      consentedAt,
      contract: {
        consent: true,
        consentVersion: WINGSGROUP_CONSENT_VERSION,
        preferredChannel: 'zalo',
      },
      locale: 'vi',
      sourcePath: '/lien-he?forged=query',
    })

    expect(normalizeTrustedLeadSourcePath('https://attacker.example/private')).toBe('/')
    expect(getWingsGroupRetentionUntil(consentedAt)).toBe('2026-02-28T10:15:00.000Z')
    expect(fields).toEqual(
      expect.arrayContaining([
        { field: '_wingsgroup_source_path', value: '/lien-he' },
        { field: '_wingsgroup_consent_version', value: WINGSGROUP_CONSENT_VERSION },
        { field: '_wingsgroup_retention_until', value: '2026-02-28T10:15:00.000Z' },
        { field: '_wingsgroup_preferred_channel', value: 'zalo' },
      ]),
    )
    expect(fields.every(({ field }) => isWingsGroupOperationalField(field))).toBe(true)
  })
})

describe('WingsGroup lead request boundary', () => {
  it('rejects forged tenant/context fields and invalid preferred channels', () => {
    const base = {
      formId: 7,
      idempotencyKey: '4cb68f3f-6dc9-4b3f-918b-74153f271abc',
      submissionData: [],
    }

    expect(() => parseLeadRequest(JSON.stringify({ ...base, site: 'wings-group' }))).toThrow()
    expect(() =>
      parseLeadRequest(
        JSON.stringify({
          ...base,
          leadContract: {
            consent: true,
            consentVersion: WINGSGROUP_CONSENT_VERSION,
            preferredChannel: 'email',
          },
        }),
      ),
    ).toThrow()
  })

  it('does not accept false for a required checkbox', () => {
    const form = {
      fields: [{ blockType: 'checkbox', label: 'Consent', name: 'consent', required: true }],
      id: 7,
      title: 'Consent form',
    } as Form

    expect(() =>
      validateFieldsForForm(form, [{ field: 'consent', value: false }]),
    ).toThrow(/required/i)
    expect(validateFieldsForForm(form, [{ field: 'consent', value: true }])).toEqual([
      { field: 'consent', label: 'Consent', value: 'true' },
    ])
  })
})
