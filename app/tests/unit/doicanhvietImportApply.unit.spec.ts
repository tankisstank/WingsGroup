import { describe, expect, it } from 'vitest'

import { validateImportCLI } from '../../scripts/import-doicanhviet'

describe('Doicanhviet importer apply gates', () => {
  it('requires an explicit batch and admin email for apply', () => {
    expect(() => validateImportCLI({ args: { apply: true }, records: [], decisions: {} })).toThrow(
      'Apply requires explicit --batch-id',
    )
    expect(() =>
      validateImportCLI({
        args: { apply: true, 'batch-id': 'batch-001' },
        records: [],
        decisions: {},
      }),
    ).toThrow('Apply requires --admin-email')
  })

  it('requires a non-empty exact selection for apply', () => {
    expect(() =>
      validateImportCLI({
        args: { apply: true, 'batch-id': 'batch-001', 'admin-email': 'admin@example.test' },
        records: [],
        decisions: {},
      }),
    ).toThrow('Apply requires --only or a non-empty approved decision set')
  })

  it('requires the explicit apply guard even when all other apply arguments exist', () => {
    expect(() =>
      validateImportCLI({
        args: {
          'batch-id': 'batch-001',
          'admin-email': 'admin@example.test',
          only: 'alpha',
        },
        records: [],
        decisions: {},
      }),
    ).toThrow('Apply requires explicit --apply')
  })
})
