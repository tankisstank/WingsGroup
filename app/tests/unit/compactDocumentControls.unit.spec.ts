import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

describe('compact Page document controls', () => {
  const root = process.cwd()
  const pages = fs.readFileSync(path.join(root, 'src/collections/Pages/index.ts'), 'utf8')
  const control = fs.readFileSync(path.join(root, 'src/components/ContentLocaleControl/index.tsx'), 'utf8')
  const css = fs.readFileSync(path.join(root, 'src/app/(payload)/custom.scss'), 'utf8')

  it('keeps the full locale panel out of the sticky toolbar while retaining locale links and statuses', () => {
    expect(pages).toContain('ContentLocaleCompactDocumentControl')
    expect(pages).not.toContain("beforeDocumentControls: [\n          '@/components/AdminGuidance/PageEditGuidance'")
    expect(control).toContain('export function ContentLocaleCompactDocumentControl')
    expect(control).toContain('wings-content-locale-compact__status')
    expect(css).toContain('.doc-controls__controls .wings-content-locale-compact')
    expect(css).not.toContain('.doc-controls__controls .wings-content-locale-control {')
  })
})
