import { describe, expect, it } from 'vitest'

import {
  classifyLocaleDocument,
  getLocaleContentBlockerCount,
  summarizeLocaleAuditRows,
  type LocaleContentAuditRow,
} from '../../scripts/lib/multisiteLocaleContentAudit'

const buildDoc = (title: string, description: string) => ({
  title,
  meta: {
    title,
    description,
  },
  layout: [
    {
      blockType: 'content',
      columns: [
        {
          title,
          richText: {
            root: {
              children: [
                {
                  type: 'paragraph',
                  children: [{ text: description, type: 'text', version: 1 }],
                  version: 1,
                },
              ],
              version: 1,
            },
          },
        },
      ],
    },
  ],
})

const row = (status: LocaleContentAuditRow['status']): LocaleContentAuditRow => ({
  locale: 'vi',
  notes: [],
  path: '/',
  site: 'wing-side',
  source: 'page',
  status,
})

describe('multisite locale-content classifier', () => {
  it('does not mark the default locale as editorial-review when compared with itself', () => {
    const defaultDoc = buildDoc('Giới thiệu', 'Nội dung tiếng Việt đã xuất bản.')

    expect(
      classifyLocaleDocument({
        defaultDoc,
        defaultLocale: 'vi',
        doc: defaultDoc,
        locale: 'vi',
      }),
    ).toEqual({
      notes: ['Localized document present without placeholder markers.'],
      status: 'translated',
    })
  })

  it('still marks a non-default locale that matches the default copy as editorial-review', () => {
    const defaultDoc = buildDoc('About', 'Published English copy.')
    const localizedDoc = buildDoc('About', 'Published English copy.')

    expect(
      classifyLocaleDocument({
        defaultDoc,
        defaultLocale: 'en',
        doc: localizedDoc,
        locale: 'it',
      }),
    ).toEqual({
      evidence: undefined,
      notes: ['Visible copy is identical to the default locale and needs editorial review.'],
      status: 'needs-editorial-review',
    })
  })

  it('does not treat Style logic as a placeholder marker by itself', () => {
    const defaultDoc = buildDoc('Travel styles', 'Published English copy.')
    const localizedDoc = {
      title: 'Estilos de viaje',
      eyebrow: 'Lógica del estilo',
      meta: {
        title: 'Estilos de viaje',
        description: 'Contenido localizado.',
      },
    }

    expect(
      classifyLocaleDocument({
        defaultDoc,
        defaultLocale: 'en',
        doc: localizedDoc,
        locale: 'es',
      }).status,
    ).not.toBe('placeholder')
  })

  it('does not treat the Spanish word "todo" as a TODO placeholder marker', () => {
    const defaultDoc = buildDoc('Trust and proof', 'Published English copy.')
    const localizedDoc = {
      title: 'Confianza y transparencia',
      meta: {
        title: 'Confianza y transparencia',
        description:
          'La página presenta las pruebas más importantes en secciones claras, en lugar de esconderlo todo en párrafos largos.',
      },
    }

    expect(
      classifyLocaleDocument({
        defaultDoc,
        defaultLocale: 'en',
        doc: localizedDoc,
        locale: 'es',
      }).status,
    ).not.toBe('placeholder')
  })

  it('returns evidence for mixed-language matches', () => {
    const defaultDoc = buildDoc('About', 'Published English copy.')
    const localizedDoc = {
      title: 'Giới thiệu',
      meta: {
        title: 'Giới thiệu',
        description: 'Trang này vẫn còn travel style guidance trong phần mô tả.',
      },
    }

    expect(
      classifyLocaleDocument({
        defaultDoc,
        defaultLocale: 'en',
        doc: localizedDoc,
        locale: 'vi',
      }),
    ).toEqual({
      evidence: [
        {
          marker: '/\\btravel style\\b/i',
          value: 'Trang này vẫn còn travel style guidance trong phần mô tả.',
        },
      ],
      notes: ['Generic English travel/editorial markers still visible in non-English locale.'],
      status: 'mixed-language',
    })
  })
})

describe('multisite locale content audit blocker count', () => {
  it('keeps fallback-approved rows non-blocking for inventory-only gaps', () => {
    const summary = summarizeLocaleAuditRows([row('translated'), row('fallback-approved')])

    expect(getLocaleContentBlockerCount(summary)).toBe(0)
  })

  it('counts missing, placeholder, mixed-language and editorial-review rows as blockers', () => {
    const summary = summarizeLocaleAuditRows([
      row('missing'),
      row('placeholder'),
      row('mixed-language'),
      row('needs-editorial-review'),
      row('fallback-approved'),
    ])

    expect(getLocaleContentBlockerCount(summary)).toBe(4)
  })

  it('is nonzero for strict-mode negative audit summaries', () => {
    const summary = summarizeLocaleAuditRows([row('translated'), row('needs-editorial-review')])

    expect(getLocaleContentBlockerCount(summary)).toBeGreaterThan(0)
  })
})
