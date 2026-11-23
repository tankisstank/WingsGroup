import { mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { spawnSync } from 'node:child_process'

type AuditCommand = {
  category: string
  description: string
  pattern: string
  targetPaths: string[]
}

type RawMatch = {
  category: string
  classification:
    | 'core-registry'
    | 'generated-artifact'
    | 'migration-registry'
    | 'needs-review'
    | 'seed-fixture'
    | 'site-specific'
    | 'test-fixture'
  description: string
  file: string
  line: number
  text: string
}

const timestamp = new Date().toISOString()
const dateStamp = timestamp.slice(0, 10)

const getArgumentValue = (name: string): string | undefined => {
  const inlineArgument = process.argv.find((argument) => argument.startsWith(`${name}=`))
  if (inlineArgument) return inlineArgument.split('=').slice(1).join('=')

  const index = process.argv.indexOf(name)
  if (index >= 0) return process.argv[index + 1]

  return undefined
}

const outputDir = resolve(
  process.cwd(),
  getArgumentValue('--output-dir') ||
    `../artifacts/audits/multisite-remediation-${dateStamp}`,
)

const commands: AuditCommand[] = [
  {
    category: 'binary-locale-branch',
    description: 'Hard-coded locale branching that may break public locale expansion.',
    pattern: "locale === 'en'|locale === 'vi'|locale !== 'en'|locale !== 'vi'",
    targetPaths: ['src', 'tests', 'scripts'],
  },
  {
    category: 'site-literal',
    description: 'Site-specific literals that may leak into shared code.',
    pattern: 'wingsside|wings-go|wings-group|wingscare|wingspass|wingsplus',
    targetPaths: ['src', 'tests', 'scripts'],
  },
  {
    category: 'seo-and-tenant-headers',
    description: 'SEO and trusted tenant header touch points.',
    pattern:
      'canonical|hreflang|sitemap|robots|x-site-code|x-site-prefix|x-locale|x-site-host|x-site-context-source',
    targetPaths: ['src', 'tests'],
  },
]

const groupMatchesByClassification = (entries: RawMatch[]) => {
  const grouped: Record<RawMatch['classification'], RawMatch[]> = {
    'core-registry': [],
    'generated-artifact': [],
    'migration-registry': [],
    'needs-review': [],
    'seed-fixture': [],
    'site-specific': [],
    'test-fixture': [],
  }

  for (const entry of entries) {
    grouped[entry.classification].push(entry)
  }

  return grouped
}

const classifyMatch = (file: string): RawMatch['classification'] => {
  const normalized = file.replaceAll('\\', '/')
  if (normalized.endsWith('src/payload-types.ts') || normalized.endsWith('.json')) {
    return 'generated-artifact'
  }
  if (normalized.startsWith('src/migrations/')) {
    return 'migration-registry'
  }
  if (
    normalized === 'src/utilities/sitePaths.ts' ||
    normalized === 'src/utilities/siteTheme.ts' ||
    normalized === 'src/utilities/siteURLs.ts' ||
    normalized === 'src/utilities/themeTokens.ts' ||
    normalized === 'src/utilities/themeSeed.ts' ||
    normalized === 'src/utilities/heroPresentationSeed.ts' ||
    normalized === 'src/utilities/layoutPresets.ts' ||
    normalized === 'src/utilities/generateMeta.ts' ||
    normalized === 'src/utilities/structuredData.ts' ||
    normalized === 'src/utilities/headerPrimaryActions.ts' ||
    normalized === 'src/utilities/siteCapabilities.ts' ||
    normalized === 'src/utilities/siteContactPaths.ts' ||
    normalized === 'src/utilities/siteDomains.ts' ||
    normalized === 'src/utilities/siteSEO.ts' ||
    normalized === 'src/utilities/siteContext.ts' ||
    normalized === 'src/proxy.ts' ||
    normalized === 'src/components/ThemeManager/index.tsx' ||
    normalized === 'src/app/(frontend)/layout.tsx' ||
    normalized === 'src/app/(frontend)/[...slug]/page.tsx' ||
    normalized === 'src/app/(frontend)/posts/[slug]/page.tsx' ||
    normalized === 'src/app/(frontend)/search/page.tsx' ||
    normalized === 'src/app/(frontend)/(sitemaps)/robots.txt/route.ts' ||
    normalized === 'src/app/(frontend)/(sitemaps)/sitemap.xml/route.ts' ||
    normalized === 'src/app/(frontend)/(sitemaps)/pages-sitemap.xml/route.ts' ||
    normalized === 'src/app/(frontend)/(sitemaps)/posts-sitemap.xml/route.ts' ||
    normalized === 'src/app/(payload)/api/lead-submissions/route.ts' ||
    normalized === 'src/lead-capture/redis.ts' ||
    normalized === 'src/collections/SiteSettings.ts' ||
    normalized === 'src/collections/Sites.ts' ||
    normalized === 'src/collections/Posts/hooks/revalidatePost.ts' ||
    normalized === 'src/collections/Pages/hooks/revalidatePage.ts' ||
    normalized === 'src/payload.config.ts' ||
    normalized === 'src/infrastructure/cache/tenantCache.ts'
  ) {
    return 'core-registry'
  }
  if (normalized.startsWith('tests/')) return 'test-fixture'
  if (normalized.startsWith('scripts/lib/wingsside') || normalized.includes('wingsside-locale')) {
    return 'site-specific'
  }
  if (
    normalized.startsWith('scripts/') ||
    normalized.includes('seed-subsites') ||
    normalized.includes('seedPhase1Launch')
  ) {
    return 'seed-fixture'
  }
  return 'needs-review'
}

const parseRipgrepOutput = (category: string, description: string, stdout: string): RawMatch[] =>
  stdout
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => {
      const match = line.match(/^(.*?):(\d+):(.*)$/)
      if (!match) return null

      const [, file, lineNumber, text] = match
      return {
        category,
        classification: classifyMatch(file),
        description,
        file,
        line: Number(lineNumber),
        text: text.trim(),
      } satisfies RawMatch
    })
    .filter((match): match is RawMatch => Boolean(match))

const main = async () => {
  const results: RawMatch[] = []

  for (const command of commands) {
    const rg = spawnSync(
      'rg',
      ['-n', command.pattern, ...command.targetPaths],
      {
        cwd: process.cwd(),
        encoding: 'utf8',
        shell: false,
      },
    )

    if (rg.status !== 0 && !rg.stdout.trim()) {
      if (rg.status === 1) {
        continue
      }
      throw new Error(rg.stderr || `rg failed for ${command.category}`)
    }

    results.push(...parseRipgrepOutput(command.category, command.description, rg.stdout))
  }

  const grouped = groupMatchesByClassification(results)
  const summary = {
    generatedAt: timestamp,
    totals: {
      all: results.length,
      coreRegistry: grouped['core-registry']?.length || 0,
      generatedArtifact: grouped['generated-artifact']?.length || 0,
      migrationRegistry: grouped['migration-registry']?.length || 0,
      needsReview: grouped['needs-review']?.length || 0,
      seedFixture: grouped['seed-fixture']?.length || 0,
      siteSpecific: grouped['site-specific']?.length || 0,
      testFixture: grouped['test-fixture']?.length || 0,
    },
  }

  const markdownLines = [
    '# Multisite core static audit',
    '',
    `- Generated at: \`${timestamp}\``,
    `- Total matches: \`${summary.totals.all}\``,
    `- Needs review: \`${summary.totals.needsReview}\``,
    `- Core registries: \`${summary.totals.coreRegistry}\``,
    `- Generated artifacts: \`${summary.totals.generatedArtifact}\``,
    `- Migration registries: \`${summary.totals.migrationRegistry}\``,
    `- Site-specific: \`${summary.totals.siteSpecific}\``,
    `- Seed fixtures: \`${summary.totals.seedFixture}\``,
    `- Test fixtures: \`${summary.totals.testFixture}\``,
    '',
    '## Needs review',
    '',
  ]

  for (const entry of grouped['needs-review'] || []) {
    markdownLines.push(
      `- \`${entry.category}\` [${entry.file}:${entry.line}](../app/${entry.file}:${entry.line})`,
      `  ${entry.text}`,
    )
  }

  markdownLines.push('', '## Core registries', '')
  for (const entry of grouped['core-registry'] || []) {
    markdownLines.push(`- \`${entry.category}\` ${entry.file}:${entry.line} - ${entry.text}`)
  }

  markdownLines.push('', '## Generated artifacts', '')
  for (const entry of grouped['generated-artifact'] || []) {
    markdownLines.push(`- \`${entry.category}\` ${entry.file}:${entry.line} - ${entry.text}`)
  }

  markdownLines.push('', '## Migration registries', '')
  for (const entry of grouped['migration-registry'] || []) {
    markdownLines.push(`- \`${entry.category}\` ${entry.file}:${entry.line} - ${entry.text}`)
  }

  markdownLines.push('', '## Site-specific', '')
  for (const entry of grouped['site-specific'] || []) {
    markdownLines.push(`- \`${entry.category}\` ${entry.file}:${entry.line} - ${entry.text}`)
  }

  markdownLines.push('', '## Seed fixtures', '')
  for (const entry of grouped['seed-fixture'] || []) {
    markdownLines.push(`- \`${entry.category}\` ${entry.file}:${entry.line} - ${entry.text}`)
  }

  markdownLines.push('', '## Test fixtures', '')
  for (const entry of grouped['test-fixture'] || []) {
    markdownLines.push(`- \`${entry.category}\` ${entry.file}:${entry.line} - ${entry.text}`)
  }

  await mkdir(outputDir, { recursive: true })
  await writeFile(
    resolve(outputDir, 'core-static-audit.json'),
    `${JSON.stringify({ summary, results }, null, 2)}\n`,
  )
  await writeFile(resolve(outputDir, 'core-static-audit.md'), `${markdownLines.join('\n')}\n`)

  console.log(JSON.stringify(summary, null, 2))
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
