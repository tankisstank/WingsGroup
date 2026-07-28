import { describe, expect, it } from 'vitest'

import {
  assertUs055AppliedStateE2EReport,
  us055ReadinessRequestOptions,
} from '../../scripts/lib/wingsSideUs055AppliedStateE2E.mjs'

const passingReport = () => ({
  errors: [],
  stats: {
    expected: 1,
    skipped: 0,
    unexpected: 0,
  },
  suites: [
    {
      specs: [
        {
          file: 'tests/e2e/wingsside-tour-locale-matrix.e2e.spec.ts',
          ok: true,
          tests: [
            {
              results: [{ status: 'passed' }],
              status: 'expected',
            },
          ],
          title: 'serves the exact 110 URL sitemap matrix with reciprocal locale metadata',
        },
      ],
    },
  ],
})

describe('US-055 applied-state 110 URL E2E evidence', () => {
  it('uses node:http with an explicit WingSide Host on loopback readiness', () => {
    expect(us055ReadinessRequestOptions('http://127.0.0.1:41234')).toEqual({
      headers: { Host: 'wingside.vn' },
      hostname: '127.0.0.1',
      method: 'GET',
      path: '/pages-sitemap.xml',
      port: 41234,
    })
    expect(() =>
      us055ReadinessRequestOptions('http://example.test:41234'),
    ).toThrow('IPv4 loopback')
  })

  it('binds one exact pass to the committed 22 by 5 contract', () => {
    expect(
      assertUs055AppliedStateE2EReport({
        report: passingReport(),
        specSha256: 'a'.repeat(64),
      }),
    ).toMatchObject({
      expectedLocaleCount: 5,
      expectedTourCount: 22,
      expectedURLCount: 110,
      playwright: { expected: 1, skipped: 0, unexpected: 0 },
      specSha256: 'a'.repeat(64),
    })
  })

  it.each([
    ['unexpected result', { stats: { expected: 0, skipped: 0, unexpected: 1 } }],
    ['skipped result', { stats: { expected: 0, skipped: 1, unexpected: 0 } }],
    ['top-level error', { errors: [{ message: 'boom' }] }],
    [
      'wrong test count',
      {
        suites: [
          ...passingReport().suites,
          ...passingReport().suites,
        ],
      },
    ],
  ])('fails closed for %s', (_label, override) => {
    expect(() =>
      assertUs055AppliedStateE2EReport({
        report: { ...passingReport(), ...override },
        specSha256: 'a'.repeat(64),
      }),
    ).toThrow('not one exact pass')
  })
})
