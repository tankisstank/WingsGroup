import { describe, expect, it } from 'vitest'

import {
  applySelection,
  createLifecyclePlan,
  DOICANHVIET_SITE_CODE,
  mediaFilenamePrefixesFromSourceIDs,
} from '../../scripts/doicanhviet-lifecycle-safety'

describe('DoicanhViet lifecycle safety boundary', () => {
  it('keeps preview pure and requires an exact, scoped WingsGo apply', () => {
    const preview = createLifecyclePlan(['--only', '215094,215093'], 'publish')
    expect(preview.apply).toBe(false)
    expect(preview.adminEmail).toBeNull()
    expect(applySelection(preview)).toEqual({
      sourceIds: ['215093', '215094'],
      tourCodes: ['DCV-215093', 'DCV-215094'],
    })
    expect(mediaFilenamePrefixesFromSourceIDs(preview.only)).toEqual(['dcv-215093-', 'dcv-215094-'])

    expect(() =>
      createLifecyclePlan(
        ['--apply', '--site-code', DOICANHVIET_SITE_CODE, '--admin-email', 'admin@example.test'],
        'publish',
      ),
    ).toThrow('--only')
    expect(() =>
      createLifecyclePlan(
        [
          '--apply',
          '--site-code',
          'wing-side',
          '--only',
          '215093',
          '--admin-email',
          'admin@example.test',
        ],
        'publish',
      ),
    ).toThrow('wings-go')

    const apply = createLifecyclePlan(
      [
        '--apply',
        '--site-code',
        DOICANHVIET_SITE_CODE,
        '--only',
        'DCV-215094,215093',
        '--admin-email',
        'admin@example.test',
      ],
      'publish',
    )
    expect(apply.apply).toBe(true)
    expect(apply.adminEmail).toBe('admin@example.test')
  })
})
