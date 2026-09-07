import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const root = path.resolve(__dirname, '../..')
const read = (relativePath: string) => fs.readFileSync(path.join(root, relativePath), 'utf8')

describe('admin navigation chrome', () => {
  it('keeps the desktop toggle inside the sidebar and reserves the header toggle for mobile', () => {
    const css = read('src/app/(payload)/custom.scss')

    expect(css).toContain('left: calc(258px - 58px);')
    expect(css).toContain('left: calc(224px - 58px);')
    expect(css).toContain('left: calc(258px + 16px);')
    expect(css).toContain('.app-header__mobile-nav-toggler .stroke')
    expect(css).toContain('.template-default__nav-toggler .hamburger__open-icon')
    expect(css).toContain('.app-header__mobile-nav-toggler {\n      display: none !important;')
  })

  it('does not render the retired dashboard operating instructions', () => {
    const dashboard = read('src/components/BeforeDashboard/index.tsx')

    expect(dashboard).not.toContain('Dùng bảng điều hành bên dưới')
    expect(dashboard).not.toContain('Editor tạo và cập nhật bản nháp')
    expect(dashboard).not.toContain('Lead gửi về được scope theo site')
  })
})
