import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const cssPath = path.resolve(
  import.meta.dirname,
  '../../src/components/WingsSideHiFi/hifi-sections.css',
)
const pageCssPath = path.resolve(
  import.meta.dirname,
  '../../src/components/WingsSideHiFi/hifi-pages.css',
)

describe('WingSide Proof Archive CSS contract', () => {
  it('keeps the fixed desktop and mobile proof-stage frames', () => {
    const css = fs.readFileSync(cssPath, 'utf8')

    expect(css).toContain('.ws-hifi-creds__proof-stage')
    expect(css).toContain('box-sizing: border-box')
    expect(css).toContain('grid-template-rows: minmax(0, 1fr)')
    expect(css).toMatch(/height:\s*570px/)
    expect(css).toMatch(/min-height:\s*570px/)
    expect(css).toMatch(/max-height:\s*570px/)
    expect(css).toContain('grid-template-rows: 430px 560px')
    expect(css).toMatch(/height:\s*990px/)
    expect(css).toMatch(/min-height:\s*990px/)
    expect(css).toMatch(/max-height:\s*990px/)
  })

  it('keeps panes constrained and document images contained', () => {
    const css = fs.readFileSync(cssPath, 'utf8')

    expect(css).toContain('height: 100%')
    expect(css).toContain('min-width: 0')
    expect(css).toContain('min-height: 0')
    expect(css).toContain('.ws-hifi-creds__media-picture')
    expect(css).toContain('object-fit: contain')
    expect(css).toContain('overflow-x: auto')
  })

  it('keeps obsolete carousel selectors out of hifi-pages.css', () => {
    const css = fs.readFileSync(pageCssPath, 'utf8')

    expect(css).not.toContain('ws-hifi-creds__slide')
    expect(css).not.toContain('ws-hifi-creds__progress')
    expect(css).not.toContain('ws-hifi-creds__dot')
  })
})
