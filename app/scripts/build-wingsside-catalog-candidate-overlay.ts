import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import {
  buildWingsSideCatalogCandidateOverlay,
  buildWingsSideCatalogCandidateReviewPacket,
  signWingsSideCatalogCandidateRehearsal,
  verifyWingsSideCatalogCandidateSignedEvidence,
} from './lib/wingsSideCatalogCandidateOverlay'
import type { WingsSideCatalogSourceSnapshot } from './lib/wingsSideCatalogSourceSnapshot'

const argument = (name: string) => {
  const inline = process.argv.find((value) => value.startsWith(`${name}=`))
  if (inline) return inline.slice(name.length + 1)
  const index = process.argv.indexOf(name)
  return index >= 0 ? process.argv[index + 1] : undefined
}

const required = (name: string) => {
  const value = argument(name)
  if (!value) throw new Error(`Missing required ${name}`)
  return value
}

const requiredPath = (name: string) => path.resolve(required(name))
const readJSON = async <T>(filePath: string): Promise<T> =>
  JSON.parse(await fs.readFile(filePath, 'utf8')) as T
const writeNewJSON = (filePath: string, value: unknown) =>
  fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, {
    encoding: 'utf8',
    flag: 'wx',
  })

export const runWingsSideCatalogCandidateOverlay = async () => {
  const snapshotPath = requiredPath('--snapshot')
  const englishCandidatePath = requiredPath('--english-candidate')
  const historicalSourceManifestPath = requiredPath('--historical-source-manifest')
  const pricingDisclosuresPath = requiredPath('--pricing-disclosures')
  const outputPath = requiredPath('--output')
  const reviewPath = requiredPath('--review')
  const signedEvidencePath = argument('--signed-evidence')
    ? path.resolve(required('--signed-evidence'))
    : undefined
  const candidate = buildWingsSideCatalogCandidateOverlay({
    englishCandidate: await readJSON(englishCandidatePath),
    englishCandidatePath,
    historicalSourceManifest: await readJSON(historicalSourceManifestPath),
    historicalSourceManifestPath,
    leaderWorktreeAppRoot: requiredPath('--leader-worktree-app-root'),
    pricingDisclosures: await readJSON(pricingDisclosuresPath),
    pricingDisclosuresPath,
    snapshot: await readJSON<WingsSideCatalogSourceSnapshot>(snapshotPath),
  })
  const review = buildWingsSideCatalogCandidateReviewPacket(candidate)
  await writeNewJSON(outputPath, candidate)
  await writeNewJSON(reviewPath, review)
  if (signedEvidencePath) {
    const signed = signWingsSideCatalogCandidateRehearsal({
      approvedAt: required('--approved-at'),
      approvedBy: required('--approved-by'),
      candidate,
      runID: required('--run-id'),
    })
    verifyWingsSideCatalogCandidateSignedEvidence(signed, candidate)
    await writeNewJSON(signedEvidencePath, signed)
  }
  return {
    candidateChecksum: candidate.candidateChecksum,
    englishTourCount: candidate.englishTours.length,
    pricingDisclosureCount: candidate.pricingDisclosures.length,
    signedEvidencePath,
  }
}

const direct =
  process.argv[1] &&
  path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))

if (direct) {
  void runWingsSideCatalogCandidateOverlay().then(
    (result) => console.log(JSON.stringify(result)),
    (error) => {
      console.error(error instanceof Error ? error.message : error)
      process.exitCode = 1
    },
  )
}
