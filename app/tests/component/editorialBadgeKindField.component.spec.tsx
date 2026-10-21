import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const uiMocks = vi.hoisted(() => ({
  data: { editorialBadges: [], site: 2 },
  kindValue: '',
  labelValue: '',
  locale: 'vi',
  setKind: vi.fn(),
  setLabel: vi.fn(),
  siteValue: 2 as number | string | null,
}))

vi.mock('@payloadcms/ui', () => ({
  FieldError: () => null,
  FieldLabel: ({ label }: { label?: string }) => React.createElement('label', null, label),
  useDocumentInfo: () => ({ data: uiMocks.data }),
  useField: ({ path }: { path: string }) => {
    if (path === 'site') {
      return { errorMessage: null, setValue: vi.fn(), showError: false, value: uiMocks.siteValue }
    }
    if (path.endsWith('.label')) {
      return { errorMessage: null, setValue: uiMocks.setLabel, showError: false, value: uiMocks.labelValue }
    }
    return { errorMessage: null, setValue: uiMocks.setKind, showError: false, value: uiMocks.kindValue }
  },
  useLocale: () => ({ code: uiMocks.locale }),
}))

import EditorialBadgeKindField from '@/components/TourAuthoring/EditorialBadgeKindField'

describe('US-084 EditorialBadgeKindField Component Tests', () => {
  beforeEach(() => {
    window.localStorage.clear()
    uiMocks.data = { editorialBadges: [], site: 2 }
    uiMocks.kindValue = ''
    uiMocks.labelValue = ''
    uiMocks.locale = 'vi'
    uiMocks.siteValue = 2
    uiMocks.setKind.mockReset()
    uiMocks.setLabel.mockReset()
  })

  afterEach(() => {
    cleanup()
    window.localStorage.clear()
  })

  it('prefills default preset label when no prior label has been stored', () => {
    render(<EditorialBadgeKindField path="editorialBadges.0.kind" />)

    const select = screen.getByRole('combobox')
    fireEvent.change(select, { target: { value: 'hot' } })

    expect(uiMocks.setKind).toHaveBeenCalledWith('hot')
    expect(uiMocks.setLabel).toHaveBeenCalledWith('Tour hot')
  })

  it('remembers and uses nearest last-used label for matching site, locale, and kind', () => {
    // Pre-populate editor's last-used choice for site 2, vi, hot
    window.localStorage.setItem(
      'wingstravel:editorial-badge-label:2:vi:hot',
      'Tour Hot Hè Rực Rỡ 2026',
    )

    render(<EditorialBadgeKindField path="editorialBadges.0.kind" />)

    const select = screen.getByRole('combobox')
    fireEvent.change(select, { target: { value: 'hot' } })

    expect(uiMocks.setKind).toHaveBeenCalledWith('hot')
    expect(uiMocks.setLabel).toHaveBeenCalledWith('Tour Hot Hè Rực Rỡ 2026')
  })

  it('prevents cross-site leakage in CMS: different site does not use another site stored label', () => {
    // Stored for site 1
    window.localStorage.setItem(
      'wingstravel:editorial-badge-label:1:vi:hot',
      'Site 1 Độc Quyền',
    )

    // Current tour is on site 2
    uiMocks.siteValue = 2
    uiMocks.data = { editorialBadges: [], site: 2 }

    render(<EditorialBadgeKindField path="editorialBadges.0.kind" />)

    const select = screen.getByRole('combobox')
    fireEvent.change(select, { target: { value: 'hot' } })

    expect(uiMocks.setKind).toHaveBeenCalledWith('hot')
    // Must NOT be "Site 1 Độc Quyền"
    expect(uiMocks.setLabel).toHaveBeenCalledWith('Tour hot')
    expect(uiMocks.setLabel).not.toHaveBeenCalledWith('Site 1 Độc Quyền')
  })

  it('prevents cross-locale leakage in CMS: English locale uses English preset when no English choice stored', () => {
    // Stored Vietnamese label for site 2
    window.localStorage.setItem(
      'wingstravel:editorial-badge-label:2:vi:vip',
      'VIP Thượng Hạng',
    )

    // Current tour editing in English locale
    uiMocks.locale = 'en'

    render(<EditorialBadgeKindField path="editorialBadges.0.kind" />)

    const select = screen.getByRole('combobox')
    fireEvent.change(select, { target: { value: 'vip' } })

    expect(uiMocks.setKind).toHaveBeenCalledWith('vip')
    expect(uiMocks.setLabel).toHaveBeenCalledWith('VIP')
    expect(uiMocks.setLabel).not.toHaveBeenCalledWith('VIP Thượng Hạng')
  })

  it('persists edited label to storage on change without overwriting form label', () => {
    uiMocks.kindValue = 'specialized'
    uiMocks.labelValue = 'Chuyên Biệt Khám Phá'

    render(<EditorialBadgeKindField path="editorialBadges.0.kind" />)

    // useEffect should store the current non-empty label
    expect(
      window.localStorage.getItem('wingstravel:editorial-badge-label:2:vi:specialized'),
    ).toBe('Chuyên Biệt Khám Phá')

    // Form setLabel was NOT called on mount (explicit label preserved)
    expect(uiMocks.setLabel).not.toHaveBeenCalled()
  })
})
