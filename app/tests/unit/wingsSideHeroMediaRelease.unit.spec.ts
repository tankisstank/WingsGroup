import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import {
  applyWingsSideHeroMediaPlan,
  checksumFile,
  rollbackWingsSideHeroMediaPlan,
  type WingsSideHeroMediaPlan,
} from '../../scripts/lib/wingsSideHeroMediaRelease'

const roots: string[] = []

const createPlan = () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'wingsside-wp4-media-'))
  roots.push(root)
  const sourceRoot = path.join(root, 'source')
  const destinationRoot = path.join(root, 'destination')
  fs.mkdirSync(sourceRoot)
  const entries = Array.from({ length: 22 }, (_, index) => {
    const sourcePath = path.join(sourceRoot, `bpt-${index + 1}.jpg`)
    fs.writeFileSync(sourcePath, `hero-${index + 1}`)
    return {
      destinationFilename: `dcv-${index + 1}.jpg`,
      destinationPath: path.join(destinationRoot, `dcv-${index + 1}.jpg`),
      existedBefore: false,
      expectedHash: checksumFile(sourcePath),
      heroMediaID: index + 1,
      isHero: true,
      sourceFilename: `bpt-${index + 1}.jpg`,
      sourceId: `bestprice-${index + 1}`,
      sourcePath,
    }
  })
  const plan: WingsSideHeroMediaPlan = {
    createdAt: new Date().toISOString(),
    destinationRoot,
    entries,
    expectedCount: 22,
    heroCount: 22,
    sourceRoot,
    version: 1,
  }
  return plan
}

afterEach(() => {
  for (const root of roots.splice(0)) fs.rmSync(root, { force: true, recursive: true })
})

describe('WingSide hero media release plan', () => {
  it('stages and verifies exactly 22 files, then rolls back only created files', () => {
    const plan = createPlan()
    expect(applyWingsSideHeroMediaPlan(plan)).toEqual({ created: 22, verified: 22 })
    expect(plan.entries.every((entry) => fs.existsSync(entry.destinationPath))).toBe(true)

    expect(rollbackWingsSideHeroMediaPlan(plan)).toEqual({ removed: 22, retained: 0 })
    expect(plan.entries.every((entry) => !fs.existsSync(entry.destinationPath))).toBe(true)
  })

  it('is idempotent and refuses to remove a drifted destination', () => {
    const plan = createPlan()
    applyWingsSideHeroMediaPlan(plan)
    expect(applyWingsSideHeroMediaPlan(plan)).toEqual({ created: 0, verified: 22 })

    fs.writeFileSync(plan.entries[0]!.destinationPath, 'drifted')
    expect(() => rollbackWingsSideHeroMediaPlan(plan)).toThrow(/Refusing to remove drifted/)
  })
})
