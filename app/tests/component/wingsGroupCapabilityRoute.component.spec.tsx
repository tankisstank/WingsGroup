import { cleanup, render, screen } from '@testing-library/react'
import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { RenderBlocks } from '@/blocks/RenderBlocks'
import type { Page } from '@/payload-types'

vi.mock('next/image', () => ({
  default: ({ alt, src, ...props }: React.ComponentProps<'img'>) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img alt={alt || ''} src={String(src || '')} {...props} />
  ),
}))

vi.mock('@/components/SiteLink', () => ({
  SiteLink: ({ children, href, ...props }: React.ComponentProps<'a'>) => (
    <a href={String(href)} {...props}>
      {children}
    </a>
  ),
}))

describe('RenderBlocks - WingsGroup Capability Route', () => {
  afterEach(() => {
    cleanup()
  })

  it('forwards the English locale to WingsGroupCapabilitySection on capability route', () => {
    const featureGridBlock = {
      blockType: 'featureGrid',
      eyebrow: 'SPECIALIZED CAPABILITIES',
      title: 'Clear Service Process - Complete Accompaniment',
      description: 'From inquiry intake to the end of the tour, WingsGroup always has dedicated coordinators following every step closely.',
    } as Page['layout'][number]

    render(
      <RenderBlocks
        blocks={[featureGridBlock]}
        locale="en"
        wingsGroupV3
        wingsGroupV3Route="capability"
      />,
    )

    // Check value badges rendered in English
    const badges = screen.getByTestId('wingsgroup-value-badges')
    expect(badges.getAttribute('aria-label')).toBe('WingsGroup value badges')
    expect(screen.getAllByText('Safety & Trust').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('Professional Team').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('Dedicated to Every Journey')).toBeTruthy()

    // Check service process rendered in English
    const process = screen.getByTestId('wingsgroup-service-process')
    expect(process.textContent).toContain('FOUR STEPS, ONE DEDICATED TEAM')
    expect(process.textContent).toContain('Consultation & Inquiry Intake 24/7')
    expect(process.textContent).toContain('Transparent Itinerary & Quotation')
    expect(process.textContent).toContain('Service Confirmation & Pre-trip Briefing')
    expect(process.textContent).toContain('Dedicated On-trip Support')

    // Check quality standards rendered in English
    const standards = screen.getByTestId('wingsgroup-quality-standards')
    expect(standards.textContent).toContain('QUALITY STANDARDS')
    expect(standards.textContent).toContain('Standards WingsGroup Always Prioritises')
    expect(standards.textContent).toContain('Care for Every Journey')
    expect(standards.textContent).toContain('Carefully Selected Airlines & Partners')

    // Check banner CTA rendered in English
    expect(screen.getByText('Ready for your next journey?')).toBeTruthy()
    expect(screen.getByText('Consult with us')).toBeTruthy()

    // Verify absence of Vietnamese text
    expect(screen.queryByText('An toàn & Tin cậy')).toBeNull()
    expect(screen.queryByText('BỐN BƯỚC, MỘT ĐỘI NGŨ ĐỒNG HÀNH')).toBeNull()
    expect(screen.queryByText('Gặp nhân viên tư vấn')).toBeNull()
  })

  it('renders Vietnamese correctly when locale is vi', () => {
    const featureGridBlock = {
      blockType: 'featureGrid',
      eyebrow: 'NĂNG LỰC PHỤC VỤ CHUYÊN SÂU',
      title: 'Quy trình phục vụ rõ ràng - Đồng hành trọn hành trình',
      description: 'Từ lúc tiếp nhận nhu cầu đến khi đoàn kết thúc chuyến đi, WingsGroup luôn có người phụ trách theo sát từng bước.',
    } as Page['layout'][number]

    render(
      <RenderBlocks
        blocks={[featureGridBlock]}
        locale="vi"
        wingsGroupV3
        wingsGroupV3Route="capability"
      />,
    )

    const badges = screen.getByTestId('wingsgroup-value-badges')
    expect(badges.getAttribute('aria-label')).toBe('Ba giá trị cốt lõi')
    expect(screen.getByText('An toàn & Tin cậy')).toBeTruthy()

    const process = screen.getByTestId('wingsgroup-service-process')
    expect(process.textContent).toContain('BỐN BƯỚC, MỘT ĐỘI NGŨ ĐỒNG HÀNH')

    expect(screen.getByText('Bạn chọn điểm đến. WingsGroup lo phần còn lại!')).toBeTruthy()
    expect(screen.getByText('Gặp nhân viên tư vấn')).toBeTruthy()
  })
})
