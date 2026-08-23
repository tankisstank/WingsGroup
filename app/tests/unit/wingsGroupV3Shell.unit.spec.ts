import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const sourceRoot = path.resolve(import.meta.dirname, '../../src')
const read = (relativePath: string) => fs.readFileSync(path.join(sourceRoot, relativePath), 'utf8')

describe('WingsGroup v3 shared public shell', () => {
  it('limits the header to the governed Vietnamese route inventory and one consultation action', () => {
    const header = read('Header/Component.tsx')
    const nav = read('Header/Nav/index.tsx')

    expect(header).toContain('getWingsGroupRouteDefinition(publicPathname)')
    expect(header).toContain("url: '#consultation-dialog'")
    expect(nav).toContain("{ href: '/he-sinh-thai', label: 'Hệ sinh thái' }")
    expect(nav).toContain("{ href: '/tin-tuc', label: 'Cẩm nang' }")
    expect(nav).toContain('data-wingsgroup-consultation-trigger={isWingsGroupV3Surface')
    expect(nav).not.toContain('href="/en"')
  })

  it('keeps public WingsGroup routes free of the theme selector and generic related-page rail', () => {
    const footer = read('Footer/Component.tsx')
    const layout = read('app/(frontend)/layout.tsx')
    const page = read('app/(frontend)/cmsPage.tsx')

    expect(footer).toContain("' site-footer--wingsgroup-v3'")
    expect(footer).toContain('!isWingsGroupV3Surface ? <ThemeSelector')
    expect(layout).toContain('!isWingsGroupV3Surface ? (')
    expect(layout).toContain('<AdminBar')
    expect(page).toContain("useWingsGroupV3Surface ? 'wingsgroup-v3-surface' : ''")
    expect(page).toContain('wingsgroup-v3-breadcrumb container')
    expect(page).toContain('data-wingsgroup-pending-policy')
  })

  it('uses the editorial rail on desktop and a single natural column on mobile', () => {
    const css = read('app/(frontend)/wingsgroup-v3.css')

    expect(css).toContain(
      'grid-template-columns: minmax(0, 460px) minmax(0, 1fr) minmax(260px, 300px)',
    )
    expect(css).toContain('grid-template-columns: minmax(0, 1fr) !important')
    expect(css).toContain('.wingsgroup-v3-surface .layout-cta')
    expect(css).toContain('border-radius: 0')
    expect(css).toContain("data-wingsgroup-v3='true'")
  })
})
