import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

describe('compact document controls', () => {
  const root = process.cwd()
  const control = fs.readFileSync(path.join(root, 'src/components/ContentLocaleControl/index.tsx'), 'utf8')
  const css = fs.readFileSync(path.join(root, 'src/app/(payload)/custom.scss'), 'utf8')
  const editCollections = [
    'src/collections/TourProducts.ts',
    'src/collections/Posts/index.ts',
    'src/collections/TourDepartures.ts',
    'src/collections/Media.ts',
    'src/collections/DepartureVariants.ts',
    'src/collections/Categories.ts',
    'src/collections/TourCampaigns.ts',
    'src/collections/SiteSettings.ts',
  ]

  it('keeps full locale panels out of every affected sticky edit toolbar', () => {
    for (const relativePath of editCollections) {
      const collection = fs.readFileSync(path.join(root, relativePath), 'utf8')

      expect(collection).toContain('ContentLocaleCompactDocumentControl')
      expect(collection).not.toContain('ContentLocaleDocumentControl')
    }

    expect(control).toContain('export function ContentLocaleCompactDocumentControl')
    expect(control).toContain('wings-content-locale-compact__status')
    expect(css).toContain('.collection-edit .doc-controls__controls .wings-content-locale-compact')
    expect(css).toContain('flex-wrap: nowrap;')
    expect(css).toContain('overflow-x: auto;')
    expect(css).not.toContain('.doc-controls__controls .wings-content-locale-control {')
  })

  it('exposes locale status text and a distinct failed-load state', () => {
    expect(control).toContain('role="listitem"')
    expect(control).toContain("data-status={status}")
    expect(control).toContain("loadState === 'error'")
    expect(control).toContain("error: 'Lỗi tải'")
    expect(control).toContain('localeLabelWithCode(option)')
    expect(control).not.toContain('${option.label} (${option.code}):')
    expect(css).toContain("data-status='error'")
  })

  it('keeps Tour Products field labels in Vietnamese', () => {
    const tourProduct = fs.readFileSync(path.join(root, 'src/collections/TourProducts.ts'), 'utf8')

    expect(tourProduct).toContain("label: 'Trang tour trên website'")
    expect(tourProduct).toContain("label: 'Tự tạo đường dẫn từ tiêu đề tour'")
    expect(tourProduct).not.toContain("label: 'Page wrapper'")
  })

  it('keeps Tour authoring panels inside the document body, not sticky controls', () => {
    const tourProduct = fs.readFileSync(path.join(root, 'src/collections/TourProducts.ts'), 'utf8')
    const controls = tourProduct.slice(
      tourProduct.indexOf('beforeDocumentControls:'),
      tourProduct.indexOf('],\n      },\n    },\n    description:'),
    )

    expect(controls).not.toContain('TourAuthoring')
    expect(tourProduct).toContain("label: 'Lịch bay & xuất bản'")
    expect(tourProduct).toContain("name: 'tourAuthoringPanel'")
    expect(tourProduct).toContain("Field: '@/components/TourAuthoring#default'")
  })
})
