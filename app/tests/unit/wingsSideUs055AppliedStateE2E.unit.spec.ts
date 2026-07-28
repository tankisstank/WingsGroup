import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import {
  assertUs055AppliedStateE2EReport,
  assertUs055HomeSpecContract,
  us055ReadinessRequestOptions,
} from '../../scripts/lib/wingsSideUs055AppliedStateE2E.mjs'

const homeSpecSource = readFileSync(
  resolve(process.cwd(), 'tests/e2e/wingsside-why-travel-real-tour-matrix.e2e.spec.ts'),
  'utf8',
)

const passingReport = () => ({
  errors: [],
  stats: {
    expected: 2,
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
        {
          file: 'tests/e2e/wingsside-why-travel-real-tour-matrix.e2e.spec.ts',
          ok: true,
          tests: [
            {
              results: [{ status: 'passed' }],
              status: 'expected',
            },
          ],
          title:
            'connects all four Why Travel roles to eligible real tours across five locales and two widths',
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

  it('binds two exact passes to the route and Home interaction contracts', () => {
    expect(
      assertUs055AppliedStateE2EReport({
        report: passingReport(),
        specSha256ByPath: {
          'tests/e2e/wingsside-tour-locale-matrix.e2e.spec.ts': 'a'.repeat(64),
          'tests/e2e/wingsside-why-travel-real-tour-matrix.e2e.spec.ts':
            'b'.repeat(64),
        },
      }),
    ).toMatchObject({
      expectedHomeMatrixCaseCount: 40,
      expectedHomeRoleCount: 4,
      expectedLocaleCount: 5,
      expectedTourCount: 22,
      expectedURLCount: 110,
      expectedViewportCount: 2,
      playwright: { expected: 2, skipped: 0, unexpected: 0 },
      specs: [
        {
          path: 'tests/e2e/wingsside-why-travel-real-tour-matrix.e2e.spec.ts',
          sha256: 'b'.repeat(64),
        },
        {
          path: 'tests/e2e/wingsside-tour-locale-matrix.e2e.spec.ts',
          sha256: 'a'.repeat(64),
        },
      ],
    })
  })

  it('binds the browser matrix to the local WingSide alias and all four exact roles', () => {
    expect(() => assertUs055HomeSpecContract(homeSpecSource)).not.toThrow()
  })

  it.each([
    ['local Home alias', "const localAliasPrefix = '/wingsside'", "const localAliasPrefix = '/'"],
    [
      'public Host request',
      "headers: { host: 'wingside.vn' }",
      "headers: { host: '127.0.0.1' }",
    ],
    [
      'collaborative-care role',
      "{ marker: 'why-care', role: 'collaborative-care' }",
      "{ marker: 'why-care', role: 'care' }",
    ],
  ])('fails closed when the Home spec drifts from the %s contract', (_label, exact, drift) => {
    expect(() => assertUs055HomeSpecContract(homeSpecSource.replace(exact, drift))).toThrow(
      'committed spec contract drifted',
    )
  })

  it.each([
    ['unexpected result', { stats: { expected: 1, skipped: 0, unexpected: 1 } }],
    ['skipped result', { stats: { expected: 1, skipped: 1, unexpected: 0 } }],
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
        specSha256ByPath: {
          'tests/e2e/wingsside-tour-locale-matrix.e2e.spec.ts': 'a'.repeat(64),
          'tests/e2e/wingsside-why-travel-real-tour-matrix.e2e.spec.ts':
            'b'.repeat(64),
        },
      }),
    ).toThrow('not two exact passes')
  })

  it('fails closed when either committed spec hash is missing', () => {
    expect(() =>
      assertUs055AppliedStateE2EReport({
        report: passingReport(),
        specSha256ByPath: {
          'tests/e2e/wingsside-tour-locale-matrix.e2e.spec.ts': 'a'.repeat(64),
        },
      }),
    ).toThrow('not two exact passes')
  })

  it.each([
    ['wrong file', { file: 'tests/e2e/substituted.e2e.spec.ts' }],
    ['wrong title', { title: 'substituted title' }],
  ])('fails closed for a %s substitution', (_label, substitution) => {
    const report = passingReport()
    report.suites[0]!.specs[1] = {
      ...report.suites[0]!.specs[1]!,
      ...substitution,
    }
    expect(() =>
      assertUs055AppliedStateE2EReport({
        report,
        specSha256ByPath: {
          'tests/e2e/wingsside-tour-locale-matrix.e2e.spec.ts': 'a'.repeat(64),
          'tests/e2e/wingsside-why-travel-real-tour-matrix.e2e.spec.ts':
            'b'.repeat(64),
        },
      }),
    ).toThrow('not two exact passes')
  })
})
