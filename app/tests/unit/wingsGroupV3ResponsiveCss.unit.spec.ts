import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const componentCss = path.resolve(
  import.meta.dirname,
  '../../src/components/WingsGroupV3/WingsGroupV3.module.css',
)
const shellCss = path.resolve(import.meta.dirname, '../../src/app/(frontend)/wingsgroup-v3.css')

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

    expect(selectors.every((selector) => selector.includes("data-site-code='wings-group'"))).toBe(
      true,
    )
    expect(css).toContain("data-wingsgroup-v3='true'")
  })
})
