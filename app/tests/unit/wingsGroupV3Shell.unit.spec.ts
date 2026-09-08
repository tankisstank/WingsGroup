import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const sourceRoot = path.resolve(import.meta.dirname, '../../src')
const read = (relativePath: string) => fs.readFileSync(path.join(sourceRoot, relativePath), 'utf8')

describe('WingsGroup v3 shared public shell', () => {
  it('limits the header to the governed Vietnamese route inventory and one consultation action', () => {
    const header = read('Header/Component.tsx')
    const nav = read('Header/Nav/index.tsx')
    const renderBlocks = read('blocks/RenderBlocks.tsx')
    const ecosystem = read('components/WingsGroupV3/EcosystemExplorer.tsx')
    const trust = read('blocks/WingsGroupTrust/Component.tsx')

    expect(header).toContain('isWingsGroupV3SurfacePath(publicPathname)')
    expect(header).toContain("url: '#consultation-dialog'")
    expect(nav).toContain("{ href: '/#about', label: 'Hệ sinh thái' }")
    expect(nav).toContain("{ href: '/tin-tuc', label: 'Cẩm nang' }")
    expect(nav).toContain("{ href: '/#contact', label: 'Liên hệ' }")
    expect(nav).toContain('data-wingsgroup-consultation-trigger={isWingsGroupV3Surface')
    expect(nav).not.toContain('href="/en"')
    expect(renderBlocks).toContain('showDeepDiveLinks: wingsGroupV3Home')
    expect(renderBlocks).toContain('showDeepDiveLink: true')
    expect(ecosystem).toContain('href="/nang-luc-dich-vu"')
    expect(ecosystem).toContain('href="/he-sinh-thai"')
    expect(trust).toContain('href="/ve-wingsgroup"')
  })

  it('keeps public WingsGroup routes free of the theme selector and generic related-page rail', () => {
    const footer = read('Footer/Component.tsx')
    const layout = read('app/(frontend)/layout.tsx')
    const page = read('app/(frontend)/cmsPage.tsx')

    expect(footer).toContain('isWingsGroupV3SurfacePath(publicPathname)')
    expect(layout).toContain('isWingsGroupV3SurfacePath(publicPathname)')
    expect(footer).toContain("' site-footer--wingsgroup-v3'")
    expect(footer).toContain('!isWingsGroupV3Surface ? <ThemeSelector')
    expect(layout).toContain('!isWingsGroupV3Surface ? <AdminBar')
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

  it('uses text navigation, a quiet breadcrumb and a flat mobile list for the v3 shell', () => {
    const nav = read('Header/Nav/index.tsx')
    const css = read('app/(frontend)/wingsgroup-v3.css')
    const heroCss = read('components/WingsGroupV3/WingsGroupV3.module.css')

    expect(nav).toContain('data-active={')
    expect(css).toContain('.site-header--wingsgroup-v3\n  .theme-nav-link')
    expect(css).toContain('.wingsgroup-v3-breadcrumb > ol')
    expect(css).toContain('.site-mobile-nav__link--primary')
    expect(css).toContain('border-bottom: 1px solid #dedbd3')
    expect(heroCss).toContain(
      'grid-template-columns: minmax(0, 460px) minmax(0, 1fr) minmax(0, 300px)',
    )
    expect(heroCss).toContain('grid-column: 2 / span 2')
  })
})
