import { render, screen } from '@testing-library/react'
import React from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const payloadMock = vi.hoisted(() => ({
  find: vi.fn(async () => ({ docs: [] })),
}))

vi.mock('@payload-config', () => ({ default: {} }))
vi.mock('payload', () => ({ getPayload: vi.fn(async () => payloadMock) }))
vi.mock('@/utilities/siteContext', () => ({ appendSiteWhere: vi.fn(async () => ({})) }))
vi.mock('@/components/Media', () => ({
  Media: () => <div data-testid="editorial-media" />,
}))
vi.mock('@/components/SiteLink', () => ({
  SiteLink: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}))

import { WingsGroupEditorialRail } from '@/components/WingsGroupV3/EditorialRail'

describe('WingsGroup English editorial rail', () => {
  beforeEach(() => {
    payloadMock.find.mockClear()
  })

  it('uses the customer-facing WingsGroup source label in the guarded fallback rail', async () => {
    render(
      await WingsGroupEditorialRail({
        blockType: 'archive',
        limit: 3,
        locale: 'en',
        populateBy: 'collection',
        relationTo: 'posts',
      } as never),
    )

    expect(screen.getAllByText('WingsGroup')).toHaveLength(3)
    expect(screen.queryByText('WingsGroup v3')).toBeNull()
    expect(screen.getAllByRole('link', { name: 'Read story' })).toHaveLength(3)
  })
})
