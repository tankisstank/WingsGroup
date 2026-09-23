import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const root = path.resolve(__dirname, '../..')
const read = (relativePath: string) => fs.readFileSync(path.join(root, relativePath), 'utf8')

const relativeLuminance = (hex: string) => {
  const channels = hex
    .replace('#', '')
    .match(/[0-9a-f]{2}/gi)
    ?.map((channel) => parseInt(channel, 16) / 255)

  if (!channels || channels.length !== 3) {
    throw new Error(`Invalid hex color: ${hex}`)
  }

  return channels
    .map((channel) => (channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4))
    .reduce((sum, channel, index) => sum + channel * [0.2126, 0.7152, 0.0722][index], 0)
}

const contrastRatio = (foreground: string, background: string) => {
  const foregroundLuminance = relativeLuminance(foreground)
  const backgroundLuminance = relativeLuminance(background)
  const lighter = Math.max(foregroundLuminance, backgroundLuminance)
  const darker = Math.min(foregroundLuminance, backgroundLuminance)

  return (lighter + 0.05) / (darker + 0.05)
}

describe('applied CMS UI compatibility contract', () => {
  it('keeps package tokens fallback-first and opts into OKLCH only with support', () => {
    const css = read('src/app/(payload)/custom.scss')

    expect(css).toContain('--wings-applied-bg: #eef2f4;')
    expect(css).toContain('--wings-applied-accent: #e78f2c;')
    expect(css).toContain('--wings-applied-bg: oklch(0.965 0.008 225);')
    expect(css).toContain('@supports (color: oklch(0.965 0.008 225))')
    expect(css).toContain('@supports not (background: color-mix(in oklch, white 10%, black))')
  })

  it('uses cross-platform font stacks for shell and bespoke operator views', () => {
    const css = read('src/app/(payload)/custom.scss')

    expect(css).toMatch(/--wings-admin-display:[\s\S]*-apple-system/)
    expect(css).toMatch(/--wings-admin-body:[\s\S]*BlinkMacSystemFont[\s\S]*Roboto/)
    expect(css).toContain(
      "--wings-admin-mono: 'Cascadia Code', 'SF Mono', Consolas, 'Courier New', monospace;",
    )
    expect(css).toContain('body.wings-admin-shell :where(.cms-console, .wings-dashboard)')
    expect(css).toContain('font-family: var(--wings-admin-body);')
  })

  it('uses readable foreground roles for package-inspired action and accent text', () => {
    const css = read('src/app/(payload)/custom.scss')
    const dashboard = read('src/components/AdminDashboard/index.scss')
    const console = read('src/components/AdminOperatorConsole/index.scss')

    expect(css).toContain('--wings-admin-action-text: #111827;')
    expect(css).toContain('--wings-admin-accent-text: #a63f1d;')
    expect(css).toContain('--wings-admin-accent-text: #0f5f61;')
    expect(css).toContain('color: var(--wings-admin-action-text) !important;')
    expect(dashboard).toContain('color: var(--wings-admin-accent-text);')
    expect(console).toContain('--cms-console-accent-text: var(--wings-admin-accent-text);')
    expect(console).toContain('color: var(--cms-console-accent-text);')

    expect(contrastRatio('#111827', '#d9783c')).toBeGreaterThanOrEqual(4.5)
    expect(contrastRatio('#111827', '#e78f2c')).toBeGreaterThanOrEqual(4.5)
    expect(contrastRatio('#a63f1d', '#ffffff')).toBeGreaterThanOrEqual(4.5)
    expect(contrastRatio('#0f5f61', '#ffffff')).toBeGreaterThanOrEqual(4.5)
  })

  it('ports the package landmarks into React views without importing the static runtime', () => {
    const nav = read('src/components/AdminNavIntro/index.tsx')
    const console = read('src/components/AdminOperatorConsole/index.tsx')
    const review = read('src/components/SiteReview/index.tsx')
    const wizard = read('src/components/PageWizard/index.tsx')
    const wizardRoute = read('src/app/(payload)/api/page-wizard/route.ts')

    expect(nav).toContain('wings-admin-nav-intro__desktop')
    expect(nav).toContain("label: 'Nội dung'")
    expect(console).toContain('console-task-')
    expect(console).toContain('Đánh dấu đã kiểm tra')
    expect(review).toContain('data-od-id="site-review-checklist"')
    expect(review).toContain('Checklist này hỗ trợ rà soát trong phiên hiện tại')
    expect(wizard).toContain('data-od-id="page-wizard-locale"')
    expect(wizard).toContain('locale,')
    expect(wizardRoute).toContain('site.supportedLocales')
    expect(wizardRoute).toContain('locale,')

    expect(nav).not.toContain('innerHTML')
    expect(wizard).not.toContain('document.querySelector')
  })
})
