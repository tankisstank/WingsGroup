import { describe, expect, it, vi } from 'vitest'

vi.mock('@payload-config', () => ({ default: {} }))
vi.mock('next/headers', () => ({ headers: vi.fn() }))
vi.mock('payload', () => ({ createLocalReq: vi.fn(), getPayload: vi.fn() }))

import { parsePageWizardPayload } from '@/app/(payload)/api/page-wizard/parsePageWizardPayload'

describe('Page Wizard locale contract', () => {
  const basePayload = {
    preset: 'campaign-launch',
    site: '12',
    slug: 'fast-track-phu-quoc-vip',
    summary: 'Landing page cho dịch vụ Fast Track.',
    title: 'Fast Track Phu Quoc VIP',
  }

  it('defaults legacy requests to Vietnamese while accepting enabled CMS locales', () => {
    expect(parsePageWizardPayload(basePayload)).toMatchObject({ locale: 'vi' })
    expect(parsePageWizardPayload({ ...basePayload, locale: 'en' })).toMatchObject({ locale: 'en' })
    expect(parsePageWizardPayload({ ...basePayload, locale: 'ja' })).toMatchObject({ locale: 'ja' })
  })

  it('rejects a locale that is not enabled in the CMS catalog', () => {
    expect(() => parsePageWizardPayload({ ...basePayload, locale: 'xx' })).toThrow(
      'Locale không hợp lệ hoặc chưa được bật trong CMS.',
    )
  })
})
