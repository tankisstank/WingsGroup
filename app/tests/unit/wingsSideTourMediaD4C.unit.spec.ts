import { describe, expect, it } from 'vitest'

import {
  assertWingsSideTourMediaD4CManifestEqual,
  buildWingsSideTourMediaD4CManifest,
  wingsSideD4CSha256,
} from '../../scripts/lib/wingsSideTourMediaD4C'

const tours = Array.from({ length: 22 }, (_, index) => ({
  heroMediaID: index + 1,
  marketCardMediaID: null,
  routeMapMediaID: null,
  tourID: index + 101,
  tourSlug: `tour-${String(index + 1).padStart(2, '0')}`,
}))

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
    const build = (bytes: Buffer) =>
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

    expect(() =>
      assertWingsSideTourMediaD4CManifestEqual(build(Buffer.from('before')), build(Buffer.from('after'))),
    ).toThrow('source snapshot checksum mismatch')
  })
})
