export const wingsSideTourEnglishEditorialDefaultRiskyPhrases = [
  'book your tour NOW',
  'let your hair down',
  'rat race',
  'young people',
] as const

export const wingsSideTourEnglishEditorialDefaultVendorBrands = [
  'BestPrice',
  'BestPrice Travel',
] as const

export type WingsSideTourEnglishEditorialLintCode =
  | 'all-caps'
  | 'risky-phrase'
  | 'vendor-brand'

export type WingsSideTourEnglishEditorialLintFinding = {
  code: WingsSideTourEnglishEditorialLintCode
  match: string
  path: string
  slug: string
}

export type WingsSideTourEnglishEditorialLintConfig = {
  allowIataCodes?: boolean
  allCapsAllowlist?: string[]
  ignoredFieldNames?: string[]
  publicTextPaths: string[]
  riskyPhrases?: string[]
  vendorBrands?: string[]
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value)

const getAtPath = (source: unknown, path: string): unknown => {
  let cursor = source
  for (const segment of path.split('.').filter(Boolean)) {
    if (!isRecord(cursor)) return undefined
    cursor = cursor[segment]
  }
  return cursor
}

const textLeaves = (
  value: unknown,
  path: string,
  ignoredFieldNames: Set<string>,
): Array<{ path: string; value: string }> => {
  if (typeof value === 'string') return [{ path, value }]
  if (Array.isArray(value)) {
    return value.flatMap((child, index) =>
      textLeaves(child, `${path}.${index}`, ignoredFieldNames),
    )
  }
  if (isRecord(value)) {
    return Object.entries(value)
      .filter(([key]) => !ignoredFieldNames.has(key))
      .flatMap(([key, child]) =>
        textLeaves(child, path ? `${path}.${key}` : key, ignoredFieldNames),
      )
  }
  return []
}

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&')

const normalizedPhrasePattern = (phrase: string) =>
  new RegExp(escapeRegExp(phrase.trim()).replace(/\s+/gu, '\\s+'), 'giu')

const uppercaseTokens = (text: string): string[] =>
  (text.match(/\b\p{Lu}[\p{Lu}\p{M}\d&']*(?:-\p{Lu}[\p{Lu}\p{M}\d&']*)*\b/gu) ?? []).filter(
    (token) => (token.match(/\p{Lu}/gu) ?? []).length >= 2,
  )

export const lintWingsSideTourEnglishEditorial = ({
  config,
  tour,
}: {
  config: WingsSideTourEnglishEditorialLintConfig
  tour: Record<string, unknown>
}): WingsSideTourEnglishEditorialLintFinding[] => {
  const slug = typeof tour.slug === 'string' ? tour.slug : '<missing-slug>'
  const riskyPhrases = config.riskyPhrases ?? [
    ...wingsSideTourEnglishEditorialDefaultRiskyPhrases,
  ]
  const vendorBrands = config.vendorBrands ?? [
    ...wingsSideTourEnglishEditorialDefaultVendorBrands,
  ]
  const allowlist = new Set(
    (config.allCapsAllowlist ?? ['UNESCO', 'IATA']).map((value) => value.toLocaleUpperCase('en')),
  )
  const findings: WingsSideTourEnglishEditorialLintFinding[] = []
  const ignoredFieldNames = new Set(config.ignoredFieldNames ?? ['id'])

  const leaves = config.publicTextPaths.flatMap((path) =>
    textLeaves(getAtPath(tour, path), path, ignoredFieldNames),
  )
  for (const leaf of leaves) {
    for (const phrase of riskyPhrases) {
      const pattern = normalizedPhrasePattern(phrase)
      for (const match of leaf.value.matchAll(pattern)) {
        findings.push({ code: 'risky-phrase', match: match[0], path: leaf.path, slug })
      }
    }
    for (const brand of vendorBrands) {
      const pattern = new RegExp(`\\b${escapeRegExp(brand)}\\b`, 'giu')
      for (const match of leaf.value.matchAll(pattern)) {
        findings.push({ code: 'vendor-brand', match: match[0], path: leaf.path, slug })
      }
    }
    for (const token of uppercaseTokens(leaf.value)) {
      const upper = token.toLocaleUpperCase('en')
      const isAllowedIata = config.allowIataCodes === true && /^[A-Z]{3}$/u.test(upper)
      if (!allowlist.has(upper) && !isAllowedIata) {
        findings.push({ code: 'all-caps', match: token, path: leaf.path, slug })
      }
    }
  }

  return findings
}
