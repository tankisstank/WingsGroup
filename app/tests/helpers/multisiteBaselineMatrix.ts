import { readFileSync } from 'node:fs'
import { join } from 'node:path'

type BaselineMatrixRow = {
  evidenceFile: string
  expectedCanonical: string
  expectedIndexability: 'index' | 'noindex'
  expectedStatus: number
  expectedTenant: string
  host: string
  locale: string
  path: string
  routeType: string
  site: string
}

let cachedRows: BaselineMatrixRow[] | null = null

const parseCSVLine = (line: string): string[] => {
  if (!line.includes('"')) {
    return line.split(',')
  }

  return line
    .split('","')
    .map((cell, index, cells) => {
      if (index === 0) return cell.replace(/^"/, '')
      if (index === cells.length - 1) return cell.replace(/"$/, '')
      return cell
    })
    .map((cell) => cell.replace(/""/g, '"'))
}

export const loadMultisiteBaselineMatrix = (): BaselineMatrixRow[] => {
  if (cachedRows) {
    return cachedRows
  }

  const file = join(
    process.cwd(),
    '..',
    'artifacts',
    'audits',
    'multisite-remediation-2026-07-13',
    'baseline-matrix.csv',
  )
  const [headerLine, ...rowLines] = readFileSync(file, 'utf8')
    .split(/\r?\n/)
    .filter(Boolean)

  const headers = parseCSVLine(headerLine)

  cachedRows = rowLines.map((line) => {
    const cells = parseCSVLine(line)
    const record = Object.fromEntries(headers.map((header, index) => [header, cells[index] || '']))

    return {
      evidenceFile: record.evidenceFile,
      expectedCanonical: record.expectedCanonical,
      expectedIndexability: record.expectedIndexability as 'index' | 'noindex',
      expectedStatus: Number(record.expectedStatus),
      expectedTenant: record.expectedTenant,
      host: record.host,
      locale: record.locale,
      path: record.path,
      routeType: record.routeType,
      site: record.site,
    } satisfies BaselineMatrixRow
  })

  return cachedRows
}

export type { BaselineMatrixRow }
