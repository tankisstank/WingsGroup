import fs from 'node:fs/promises'
import { describe, expect, it } from 'vitest'

import {
  assertWingsGroupV3FidelityContract,
  loadWingsGroupV3FidelityContract,
  WINGSGROUP_V3_DIALOG_CHANNELS,
  WINGSGROUP_V3_FIDELITY_SECTION_ORDER,
  WINGSGROUP_V3_VIEWPORT_MATRIX,
} from '../../scripts/lib/wingsGroupV3FidelityContract'

const getSection = (contract: Record<string, any>, key: string) =>
  contract.sections.find((section: Record<string, any>) => section.key === key)

describe('WingsGroup v3 executable fidelity contract', () => {
  it('is a valid seven-section Vietnamese public home contract', async () => {
    const contract = (await loadWingsGroupV3FidelityContract()) as Record<string, any>

    expect(contract.sectionOrder).toEqual([...WINGSGROUP_V3_FIDELITY_SECTION_ORDER])
    expect(contract.sections.map((section: Record<string, any>) => section.key)).toEqual([
      ...WINGSGROUP_V3_FIDELITY_SECTION_ORDER,
    ])
    expect(contract.header.primaryCta).toEqual({ label: 'Trao đổi nhu cầu', target: '#contact' })
    expect(contract.header.primaryNavigation).toHaveLength(5)
    expect(contract.header.mobileNavigation).toHaveLength(6)
  })

  it('locks the handoff headings, route CTA, pending trust/proof state and consultation dialog', async () => {
    const contract = (await loadWingsGroupV3FidelityContract()) as Record<string, any>
    expect(getSection(contract, 'hero').heading).toBe('Tìm đúng dịch vụ cho hành trình của bạn.')
    expect(getSection(contract, 'hero').ctas.map((cta: Record<string, any>) => cta.label)).toEqual([
      'Khám phá dịch vụ',
      'Tìm hiểu WingsGroup',
    ])
    expect(getSection(contract, 'service-router').routes).toHaveLength(4)
    expect(
      getSection(contract, 'service-router').routes.every(
        (route: Record<string, any>) =>
          route.cta === 'Trao đổi nhu cầu' && route.target === '#contact',
      ),
    ).toBe(true)
    expect(getSection(contract, 'trust').heading).toBe('Minh bạch để bạn an tâm lựa chọn.')
    expect(
      getSection(contract, 'trust').items.every(
        (item: Record<string, any>) => item.state === 'pending',
      ),
    ).toBe(true)
    expect(getSection(contract, 'proof').defaultState).toBe('pending')
    expect(getSection(contract, 'proof').pendingLabel).toBe('Đang cập nhật')
    expect(contract.consultationDialog.title).toBe('Trao đổi với chuyên viên.')
    expect(
      contract.consultationDialog.channels.map((channel: Record<string, any>) => channel.key),
    ).toEqual([...WINGSGROUP_V3_DIALOG_CHANNELS])
    expect(contract.consultationDialog.humanConsultationOnly).toBe(true)
  })

  it('locks the governed media allocation and responsive ecosystem behavior', async () => {
    const contract = (await loadWingsGroupV3FidelityContract()) as Record<string, any>
    const heroMedia = getSection(contract, 'hero').media.files
    const proofMedia = getSection(contract, 'proof').media
    const ecosystemMedia = getSection(contract, 'ecosystem').stage.media
    const editorialMedia = getSection(contract, 'editorial').cards.map(
      (card: Record<string, any>) => card.media,
    )

    expect(new Set([...heroMedia, ...proofMedia, ...ecosystemMedia, ...editorialMedia]).size).toBe(
      13,
    )
    expect(contract.mediaExpectations).toMatchObject({
      actualDimensionsRequired: true,
      bilingualAltRequired: true,
      checksumRequired: true,
      governedAssetCount: 13,
      publicationState: 'pending-production',
      usageScope: 'editorial-service',
    })
    expect(getSection(contract, 'ecosystem').stage).toMatchObject({
      frameHeightDesktop: 800,
      internalScroll: false,
      compactHeight: 'natural',
      ctaLocation: 'profile-only',
    })
    expect(getSection(contract, 'ecosystem').transitionBeforeTrustPx).toEqual({ min: 48, max: 72 })
  })

  it('uses the exact screenshot viewport matrix without generated screenshot fixtures', async () => {
    const contract = (await loadWingsGroupV3FidelityContract()) as Record<string, any>
    expect(
      contract.viewportMatrix.map((viewport: Record<string, any>) => [
        viewport.width,
        viewport.height,
      ]),
    ).toEqual(WINGSGROUP_V3_VIEWPORT_MATRIX.map(([width, height]) => [width, height]))
    expect(
      contract.viewportMatrix.every((viewport: Record<string, any>) => viewport.screenshotTarget),
    ).toBe(true)
  })

  it('fails when the contract is changed outside the governed shape', async () => {
    const contract = JSON.parse(
      await fs.readFile(
        `${process.cwd()}/../docs/product/wingsgroup-v3-fidelity-contract.json`,
        'utf8',
      ),
    ) as Record<string, any>
    contract.sectionOrder = [...contract.sectionOrder, 'unexpected']
    expect(() => assertWingsGroupV3FidelityContract(contract)).toThrow(/seven-section/)
  })
})
