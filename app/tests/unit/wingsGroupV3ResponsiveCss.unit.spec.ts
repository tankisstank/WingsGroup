import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const componentCss = path.resolve(
  import.meta.dirname,
  '../../src/components/WingsGroupV3/WingsGroupV3.module.css',
)
const shellCss = path.resolve(import.meta.dirname, '../../src/app/(frontend)/wingsgroup-v3.css')
const cmsPage = path.resolve(import.meta.dirname, '../../src/app/(frontend)/cmsPage.tsx')

describe('WingsGroup v3 responsive CSS contract', () => {
  it('keeps the ecosystem frame fixed at 800px only above the compact breakpoint', () => {
    const css = fs.readFileSync(componentCss, 'utf8')

    expect(css).toMatch(/\.ecosystemFrame\s*\{[\s\S]*?height:\s*800px;[\s\S]*?overflow:\s*hidden;/)
    expect(css).toContain('@media (max-width: 850px)')
    expect(css).toMatch(
      /@media \(max-width: 850px\)[\s\S]*?\.ecosystemFrame\s*\{[\s\S]*?height:\s*auto;[\s\S]*?overflow:\s*visible;/,
    )
    expect(css).toMatch(/\.ecosystemSection\s*\{[\s\S]*?clamp\(3rem, 5vw, 4\.5rem\)/)
  })

  it('scopes shell changes to the WingsGroup v3 feature flag', () => {
    const css = fs.readFileSync(shellCss, 'utf8')
    const selectors = css
      .split('{')
      .slice(0, -1)
      .map((chunk) => chunk.split('}').pop() || '')
      .filter((selector) => selector.trim() && !selector.trim().startsWith('@'))
      .filter((selector) => !selector.includes('.wingsgroup-v3-editorial-article'))

    expect(selectors.every((selector) => selector.includes("data-site-code='wings-group'"))).toBe(
      true,
    )
    expect(css).toContain("data-wingsgroup-v3='true'")
  })

  it('keeps RelatedPages outside the fixed WingsGroup v3 home composition', () => {
    const source = fs.readFileSync(cmsPage, 'utf8')

    expect(source).toContain("useWingsGroupV3Home ? 'wingsgroup-v3-home' : ''")
    expect(source).toContain('!useWingsGroupV3Home && !useWingsGroupV3Surface ?')
  })

  it('uses the V3 article class as the spacing boundary in the shell', () => {
    const css = fs.readFileSync(shellCss, 'utf8')

    expect(css).toMatch(
      /body\[data-site-code='wings-group'\]\[data-wingsgroup-v3='true'\][\s\S]*?article\.wingsgroup-v3-home\s*\{[\s\S]*?padding-bottom:\s*0;[\s\S]*?padding-top:\s*0;/,
    )
  })

  it('aligns editorial article sections to the breadcrumb track on desktop and mobile', () => {
    const css = fs.readFileSync(componentCss, 'utf8')

    expect(css).toMatch(
      /:global\(\.wingsgroup-v3-editorial-article\) \.editorialArticleHeader,[\s\S]*?max-width:\s*1240px;[\s\S]*?padding-inline:\s*clamp\(1rem, 4vw, 2rem\);/,
    )
    expect(css).toMatch(
      /:global\(\.wingsgroup-v3-editorial-article\) \.editorialArticleBody\s*\{[\s\S]*?justify-self:\s*start;/,
    )
    expect(css).toMatch(
      /@media \(max-width: 850px\)[\s\S]*?:global\(\.wingsgroup-v3-editorial-article\) \.editorialArticleHeader,[\s\S]*?padding-inline:\s*20px;/,
    )
  })
})
