import { mkdir, mkdtemp, rm, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

import {
  assertWingsSideTourMediaD4CManifestEqual,
  buildWingsSideTourMediaD4CManifest,
  parseWingsSideD4CEditorialManifest,
  parseWingsSideTourMediaD4CManifest,
  readWingsSideD4CVerifiedFile,
  resolveWingsSideD4CApprovedRoot,
  wingsSideD4CSha256,
} from '../../scripts/lib/wingsSideTourMediaD4C'
import {
  buildWingsSideD4CReviewDraft,
  parseWingsSideD4CReviewManifest,
  summarizeWingsSideD4CReview,
} from '../../scripts/lib/wingsSideTourMediaD4CReview'

const tours = Array.from({ length: 22 }, (_, index) => ({
  heroMediaID: index + 1,
  marketCardMediaID: null,
  routeMapMediaID: null,
  tourID: index + 101,
  tourSlug: `tour-${String(index + 1).padStart(2, '0')}`,
}))

const buildManifest = (bytes: Buffer) =>
  buildWingsSideTourMediaD4CManifest({
    databaseFilename: 'snapshot.db',
    databaseSha256: 'a'.repeat(64),
    editorialSourceManifestSha256: 'b'.repeat(64),
    loadAsset: () => ({ byteLength: bytes.byteLength, sha256: wingsSideD4CSha256(bytes) }),
    mediaRootReference: 'test',
    mediaRows: tours.map(({ heroMediaID }, index) => ({
      filename: `image-${index + 1}.jpg`,
      height: 450,
      mediaID: heroMediaID!,
      mimeType: 'image/jpeg',
      recordedByteLength: bytes.byteLength,
      width: 800,
    })),
    relationRows: [],
    tourRows: tours,
  })

describe('WingSide D4-C canonical source inventory', () => {
  it('preserves references while deduplicating identical content hashes', () => {
    const shared = Buffer.from('same-source-bytes')
    const manifest = buildWingsSideTourMediaD4CManifest({
      databaseFilename: 'snapshot.db',
      databaseSha256: 'a'.repeat(64),
      editorialSourceManifestSha256: 'b'.repeat(64),
      loadAsset: () => ({
        byteLength: shared.byteLength,
        sha256: wingsSideD4CSha256(shared),
      }),
      mediaRootReference: 'test',
      mediaRows: tours.map(({ heroMediaID }, index) => ({
        filename: `image-${index + 1}.jpg`,
        height: 450,
        mediaID: heroMediaID!,
        mimeType: 'image/jpeg',
        recordedByteLength: shared.byteLength,
        width: 800,
      })),
      relationRows: [],
      tourRows: tours,
    })

    expect(manifest.coverage).toEqual({
      sourceReferenceCount: 22,
      tourCount: 22,
      uniqueContentHashCount: 1,
      uniqueMediaIDCount: 22,
    })
    expect(manifest.assets[0]?.mediaIDs).toHaveLength(22)
    expect(manifest.assets[0]?.references).toHaveLength(22)
  })

  it('detects source snapshot drift', () => {
    expect(() =>
      assertWingsSideTourMediaD4CManifestEqual(
        buildManifest(Buffer.from('before')),
        buildManifest(Buffer.from('after')),
      ),
    ).toThrow('source snapshot checksum mismatch')
  })

  it('rejects a junction or symlink component that escapes the approved root', async () => {
    const fixture = await mkdtemp(path.join(tmpdir(), 'wingsside-d4c-path-'))
    const root = path.join(fixture, 'root')
    const outside = path.join(fixture, 'outside')
    await Promise.all([mkdir(root), mkdir(outside)])
    await writeFile(path.join(outside, 'shared.bin'), 'outside')
    await symlink(outside, path.join(root, 'link'), process.platform === 'win32' ? 'junction' : 'dir')
    try {
      const approvedRootRealPath = await resolveWingsSideD4CApprovedRoot(root)
      await expect(
        readWingsSideD4CVerifiedFile({
          approvedRootRealPath,
          relativePath: path.join('link', 'shared.bin'),
        }),
      ).rejects.toThrow('symlink or junction')
    } finally {
      await rm(fixture, { force: true, recursive: true })
    }
  })

  it('rejects absolute and parent traversal paths', async () => {
    const fixture = await mkdtemp(path.join(tmpdir(), 'wingsside-d4c-traversal-'))
    try {
      const approvedRootRealPath = await resolveWingsSideD4CApprovedRoot(fixture)
      await expect(
        readWingsSideD4CVerifiedFile({
          approvedRootRealPath,
          relativePath: path.join('..', 'outside.bin'),
        }),
      ).rejects.toThrow('safe relative path')
      await expect(
        readWingsSideD4CVerifiedFile({
          approvedRootRealPath,
          relativePath: path.resolve(fixture, 'inside.bin'),
        }),
      ).rejects.toThrow('safe relative path')
    } finally {
      await rm(fixture, { force: true, recursive: true })
    }
  })

  it('reads an ordinary regular file through a stable verified handle', async () => {
    const fixture = await mkdtemp(path.join(tmpdir(), 'wingsside-d4c-regular-'))
    const bytes = Buffer.from('verified bytes')
    await writeFile(path.join(fixture, 'asset.bin'), bytes)
    try {
      const result = await readWingsSideD4CVerifiedFile({
        approvedRootRealPath: await resolveWingsSideD4CApprovedRoot(fixture),
        relativePath: 'asset.bin',
      })
      expect(result.bytes).toEqual(bytes)
      expect(result.sha256).toBe(wingsSideD4CSha256(bytes))
    } finally {
      await rm(fixture, { force: true, recursive: true })
    }
  })

  it('strictly parses editorial and canonical JSON schemas', () => {
    const editorial = {
      generatedFrom: 'fixture',
      sourceLocale: 'en',
      tours: tours.map(({ tourSlug }) => ({ checksum: 'c'.repeat(64), slug: tourSlug })),
      version: 1,
    }
    expect(parseWingsSideD4CEditorialManifest(editorial).tours).toHaveLength(22)
    expect(() =>
      parseWingsSideD4CEditorialManifest({ ...editorial, unexpected: true }),
    ).toThrow('missing or unknown fields')

    const manifest = buildManifest(Buffer.from('schema fixture'))
    expect(parseWingsSideTourMediaD4CManifest(manifest)).toEqual(manifest)
    expect(() =>
      parseWingsSideTourMediaD4CManifest({ ...manifest, schemaVersion: 2 }),
    ).toThrow('schemaVersion')
    expect(() =>
      parseWingsSideTourMediaD4CManifest({ ...manifest, sourceSnapshotSha256: 'invalid' }),
    ).toThrow('lowercase SHA-256')
    expect(() =>
      parseWingsSideTourMediaD4CManifest({
        ...manifest,
        coverage: { ...manifest.coverage, tourCount: 21 },
      }),
    ).toThrow('coverage does not match content')
    expect(() =>
      parseWingsSideTourMediaD4CManifest({
        ...manifest,
        assets: [{ ...manifest.assets[0], unexpected: true }, ...manifest.assets.slice(1)],
      }),
    ).toThrow('missing or unknown fields')
    expect(() =>
      parseWingsSideTourMediaD4CManifest({
        ...manifest,
        assets: [{ ...manifest.assets[0], mediaIDs: ['1'] }, ...manifest.assets.slice(1)],
      }),
    ).toThrow('must be an integer')
    expect(() =>
      parseWingsSideTourMediaD4CManifest({
        ...manifest,
        assets: [
          {
            ...manifest.assets[0],
            references: [{ ...manifest.assets[0]!.references[0], fieldPath: 7 }],
          },
          ...manifest.assets.slice(1),
        ],
      }),
    ).toThrow('must be a non-empty string')
  })
})

describe('WingSide D4-C visual disposition manifest', () => {
  it('creates deterministic 100% hash coverage and validates exact inventory binding', () => {
    const inventory = buildManifest(Buffer.from('review fixture'))
    const draft = buildWingsSideD4CReviewDraft({ inventory })
    expect(draft.assets).toHaveLength(inventory.assets.length)
    expect(draft.coverage).toEqual({
      acceptedOutputCount: 0,
      cleanCount: 0,
      rejectedCount: 0,
      reviewedCount: 0,
      uncertainCount: inventory.assets.length,
      uniqueContentHashCount: inventory.assets.length,
      watermarkPositiveCount: 0,
    })
    expect(parseWingsSideD4CReviewManifest(draft, inventory)).toEqual(draft)
  })

  it('rejects false coverage and substitution of a source hash', () => {
    const inventory = buildManifest(Buffer.from('review fixture'))
    const draft = buildWingsSideD4CReviewDraft({ inventory })
    expect(() =>
      parseWingsSideD4CReviewManifest(
        {
          ...draft,
          coverage: { ...draft.coverage, reviewedCount: 1 },
        },
        inventory,
      ),
    ).toThrow('does not match assets')
    expect(() =>
      parseWingsSideD4CReviewManifest(
        {
          ...draft,
          assets: [
            {
              ...draft.assets[0],
              source: { ...draft.assets[0]!.source, sha256: 'f'.repeat(64) },
            },
          ],
          coverage: summarizeWingsSideD4CReview([
            {
              ...draft.assets[0]!,
              source: { ...draft.assets[0]!.source, sha256: 'f'.repeat(64) },
            },
          ]),
        },
        inventory,
      ),
    ).toThrow('differs from canonical inventory')
  })
})
