import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

describe('US-093 K1 Boundary - Pure wingsGoScheduleModel Client Isolation', () => {
  it('wingsGoScheduleModel.ts does not import server-only or payload packages', () => {
    const filePath = path.resolve(__dirname, '../../src/tours/wingsGoScheduleModel.ts')
    const content = fs.readFileSync(filePath, 'utf8')

    // Disallowed imports in pure client-safe model
    expect(content).not.toMatch(/from\s+['"]payload['"]/)
    expect(content).not.toMatch(/from\s+['"]@payload-config['"]/)
    expect(content).not.toMatch(/from\s+['"]@\/utilities\/siteContext['"]/)
    expect(content).not.toMatch(/from\s+['"]next\//)
    expect(content).not.toMatch(/server-only/)
  })
})
