import { describe, expect, it } from 'vitest'
import { TourProducts } from '@/collections/TourProducts'
import { buildWingSideTourViewModel } from '@/tours/wingsSideTourViewModel'
import { sanitizeHref } from '@/components/RichText/sanitizeHref'
import { mergeTourVariant } from '@/tours/utils'

function findFieldRecursive(fields: any[], name: string): any {
  for (const field of fields) {
    if (field && typeof field === 'object') {
      if (field.name === name) return field
      if ('tabs' in field && Array.isArray(field.tabs)) {
        for (const tab of field.tabs) {
          if (tab && Array.isArray(tab.fields)) {
            const found = findFieldRecursive(tab.fields, name)
            if (found) return found
          }
        }
      }
      if ('fields' in field && Array.isArray(field.fields)) {
        const found = findFieldRecursive(field.fields, name)
        if (found) return found
      }
    }
  }
  return undefined
}

describe('US-080 Tour Itinerary Rich Text & Dual-Read Contract', () => {
  it('defines content richText field in itineraryDays array in TourProducts schema', () => {
    const itineraryDaysField = findFieldRecursive(TourProducts.fields, 'itineraryDays')
    expect(itineraryDaysField).toBeDefined()
    expect(itineraryDaysField?.type).toBe('array')

    if (!itineraryDaysField || !('fields' in itineraryDaysField)) {
      throw new Error('itineraryDaysField missing fields')
    }

    const summaryField = itineraryDaysField.fields.find(
      (field: any) => 'name' in field && field.name === 'summary',
    )
    expect(summaryField).toBeDefined()
    expect(summaryField?.type).toBe('textarea')
    expect((summaryField as any)?.required).toBe(true)
    expect((summaryField as any)?.localized).toBe(true)

    const contentField = itineraryDaysField.fields.find(
      (field: any) => 'name' in field && field.name === 'content',
    )
    expect(contentField).toBeDefined()
    expect(contentField?.type).toBe('richText')
    expect((contentField as any)?.required).toBe(false)
    expect((contentField as any)?.localized).toBe(true)
  })

  it('maps and preserves content field in wingsSideTourViewModel', () => {
    const mockTour: any = {
      id: 99,
      slug: 'tour-ha-noi-thuong-hai',
      title: 'Hà Nội – Thượng Hải',
      site: 1,
      durationDays: 5,
      durationNights: 4,
      itineraryDays: [
        {
          dayNumber: 1,
          title: 'Hà Nội – Thượng Hải',
          route: 'Hà Nội – Thượng Hải',
          summary: 'Xe và HDV đón khách tại điểm hẹn.\nKhởi hành đi Thượng Hải.',
          content: {
            root: {
              children: [
                {
                  type: 'paragraph',
                  children: [
                    {
                      type: 'text',
                      text: '08h20: Xe và HDV đón khách tại điểm hẹn.',
                      format: 1, // bold
                    },
                  ],
                },
              ],
            },
          },
        },
      ],
    }

    const detail = buildWingSideTourViewModel({
      data: { tour: mockTour } as any,
      locale: 'vi',
    })

    expect(detail.itinerary).toHaveLength(1)
    expect(detail.itinerary[0].dayNumber).toBe(1)
    expect(detail.itinerary[0].summary).toBe('Xe và HDV đón khách tại điểm hẹn. Khởi hành đi Thượng Hải.')
    expect(detail.itinerary[0].content).toBeDefined()
    expect((detail.itinerary[0].content as any)?.root?.children).toHaveLength(1)
  })

  it('preserves content through production mergeTourVariant function across all precedence cases', () => {
    const baseTour = {
      id: 101,
      title: 'Tour Trung Quốc',
      summary: 'Tóm tắt gốc',
      itineraryDays: [
        {
          dayNumber: 1,
          title: 'Ngày 1: Hà Nội – Thượng Hải',
          summary: 'Tóm tắt ngày 1',
          content: {
            root: {
              children: [{ type: 'paragraph', children: [{ text: 'Chi tiết RichText ngày 1' }] }],
            },
          },
        },
        {
          dayNumber: 2,
          title: 'Ngày 2: Thượng Hải – Ô Trấn',
          summary: 'Tóm tắt ngày 2',
          content: {
            root: {
              children: [{ type: 'paragraph', children: [{ text: 'Chi tiết RichText ngày 2' }] }],
            },
          },
        },
      ],
    }

    // Case 1: Variant without content override preserves base content
    const variant1 = {
      id: 'var-1',
      itineraryDayOverrides: [
        {
          dayNumber: 1,
          meals: 'Ăn trưa, tối',
        },
      ],
    }
    const merged1 = mergeTourVariant({ tour: baseTour, variant: variant1 })
    expect(merged1.tour.itineraryDays[0].content).toEqual(baseTour.itineraryDays[0].content)
    expect(merged1.tour.itineraryDays[0].meals).toBe('Ăn trưa, tối')
    expect(merged1.tour.itineraryDays[1].content).toEqual(baseTour.itineraryDays[1].content)

    // Case 2: Variant with content override takes precedence
    const overrideContent = {
      root: {
        children: [{ type: 'paragraph', children: [{ text: 'Override chi tiết ngày 1' }] }],
      },
    }
    const variant2 = {
      id: 'var-2',
      itineraryDayOverrides: [
        {
          dayNumber: 1,
          content: overrideContent,
        },
      ],
    }
    const merged2 = mergeTourVariant({ tour: baseTour, variant: variant2 })
    expect(merged2.tour.itineraryDays[0].content).toEqual(overrideContent)
    expect(merged2.tour.itineraryDays[1].content).toEqual(baseTour.itineraryDays[1].content)

    // Case 3: Variant with null/empty content does NOT overwrite base content
    const variant3 = {
      id: 'var-3',
      itineraryDayOverrides: [
        {
          dayNumber: 1,
          content: null,
          summary: '',
          meals: 'Ăn sáng nhẹ',
        },
      ],
    }
    const merged3 = mergeTourVariant({ tour: baseTour, variant: variant3 })
    expect(merged3.tour.itineraryDays[0].content).toEqual(baseTour.itineraryDays[0].content)
    expect(merged3.tour.itineraryDays[0].meals).toBe('Ăn sáng nhẹ')

    // Case 4: Variant with summaryOverride at tour level preserves day content
    const variant4 = {
      id: 'var-4',
      summaryOverride: 'Tóm tắt tour theo đợt Tết',
    }
    const merged4 = mergeTourVariant({ tour: baseTour, variant: variant4 })
    expect(merged4.tour.summary).toBe('Tóm tắt tour theo đợt Tết')
    expect(merged4.tour.itineraryDays[0].content).toEqual(baseTour.itineraryDays[0].content)
  })

  it('safely extracts text and handles malformed or empty Lexical nodes', () => {
    const extractLexicalText = (node: unknown): string => {
      if (!node || typeof node !== 'object') return ''
      if ('text' in node && typeof (node as { text: unknown }).text === 'string') {
        return (node as { text: string }).text
      }
      if ('children' in node && Array.isArray((node as { children: unknown[] }).children)) {
        return (node as { children: unknown[] }).children.map(extractLexicalText).join(' ')
      }
      return ''
    }

    expect(extractLexicalText(null)).toBe('')
    expect(extractLexicalText({})).toBe('')
    expect(extractLexicalText({ children: [] })).toBe('')
    expect(
      extractLexicalText({
        children: [
          {
            children: [{ text: '08h20:' }, { text: 'Xe đón' }],
          },
        ],
      }),
    ).toBe('08h20: Xe đón')

    // Empty paragraph structure produced by Lexical
    expect(
      extractLexicalText({
        root: {
          children: [
            {
              type: 'paragraph',
              children: [],
            },
          ],
        },
      }),
    ).toBe('')
  })

  it('blocks dangerous schemes and allows safe schemes using production sanitizeHref', () => {
    // Dangerous schemes: must be rejected to '#'
    expect(sanitizeHref('javascript:alert(1)')).toBe('#')
    expect(sanitizeHref('  javascript:void(0)')).toBe('#')
    expect(sanitizeHref('JAVASCRIPT:attack()')).toBe('#')
    expect(sanitizeHref('vbscript:msgbox(1)')).toBe('#')
    expect(sanitizeHref('VBSCRIPT:attack()')).toBe('#')
    expect(sanitizeHref('data:text/html,<script>alert(1)</script>')).toBe('#')
    expect(sanitizeHref('data:application/javascript;base64,...')).toBe('#')
    expect(sanitizeHref('//evil.com/phish')).toBe('#')
    expect(sanitizeHref('\u0000javascript:alert(1)')).toBe('#')
    expect(sanitizeHref('blob:https://evil.com/uuid')).toBe('#')
    expect(sanitizeHref('')).toBe('#')
    expect(sanitizeHref(null as any)).toBe('#')
    expect(sanitizeHref(undefined as any)).toBe('#')

    // Safe schemes: must be preserved
    expect(sanitizeHref('https://example.com/tour')).toBe('https://example.com/tour')
    expect(sanitizeHref('http://wingstravel.vn/contact')).toBe('http://wingstravel.vn/contact')
    expect(sanitizeHref('/tour/ha-noi-thuong-hai')).toBe('/tour/ha-noi-thuong-hai')
    expect(sanitizeHref('#itinerary-day-1')).toBe('#itinerary-day-1')
    expect(sanitizeHref('./attachments/doc.pdf')).toBe('./attachments/doc.pdf')
    expect(sanitizeHref('mailto:contact@wingstravel.vn')).toBe('mailto:contact@wingstravel.vn')
    expect(sanitizeHref('tel:+84900000000')).toBe('tel:+84900000000')
  })
})
