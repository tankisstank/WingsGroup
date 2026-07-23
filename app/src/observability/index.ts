type LogLevel = 'error' | 'info' | 'warn'

type SafeField = boolean | null | number | string | undefined

const safeKey = /^[a-zA-Z][a-zA-Z0-9_]{0,63}$/
const sensitiveKey = /(authorization|cookie|email|field|ip|name|password|secret|token|value)/i

const sanitizeFields = (
  fields: Record<string, unknown>,
): Record<string, Exclude<SafeField, undefined>> => {
  const sanitized: Record<string, Exclude<SafeField, undefined>> = {}
  for (const [key, value] of Object.entries(fields)) {
    if (!safeKey.test(key) || sensitiveKey.test(key) || value === undefined) continue
    if (value === null || typeof value === 'boolean' || typeof value === 'number')
      sanitized[key] = value
    else if (typeof value === 'string') sanitized[key] = value.slice(0, 128)
  }
  return sanitized
}

export const logOperationalEvent = (
  level: LogLevel,
  action: string,
  fields: Record<string, unknown> = {},
): void => {
  const record = {
    action: action.slice(0, 96),
    level,
    message: action.slice(0, 96),
    timestamp: new Date().toISOString(),
    ...sanitizeFields(fields),
  }
  const line = JSON.stringify(record)
  if (level === 'error') console.error(line)
  else if (level === 'warn') console.warn(line)
  else console.info(line)
}

type MetricName =
  | 'wingstravel_csp_reports_total'
  | 'wingstravel_lead_delivery_failures_total'
  | 'wingstravel_lead_queue_failures_total'
  | 'wingstravel_lead_requeued_total'
  | 'wingstravel_lead_submissions_total'
  | 'wingstravel_readiness_checks_total'

const counters = new Map<string, number>()
const maxMetricSeries = 256

const metricKey = (name: MetricName, labels: Record<string, string>): string =>
  `${name}|${Object.entries(labels)
    .filter(([key]) => safeKey.test(key))
    .map(([key, value]) => [key, value.replace(/[\r\n]/g, ' ').slice(0, 64)] as const)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}=${value}`)
    .join(',')}`

export const incrementMetric = (
  name: MetricName,
  labels: Record<string, string> = {},
  amount = 1,
): void => {
  const key = metricKey(name, labels)
  if (!counters.has(key) && counters.size >= maxMetricSeries - 1) {
    const overflowKey = metricKey(name, { overflow: 'true' })
    counters.set(overflowKey, (counters.get(overflowKey) || 0) + amount)
    return
  }
  counters.set(key, (counters.get(key) || 0) + amount)
}

const prometheusLabels = (raw: string): string => {
  const labels = raw.split(',').filter(Boolean)
  if (!labels.length) return ''
  return `{${labels
    .map((label) => {
      const separator = label.indexOf('=')
      const key = label.slice(0, separator)
      const value = label
        .slice(separator + 1)
        .replaceAll('\\', '\\\\')
        .replaceAll('"', '\\"')
      return `${key}="${value}"`
    })
    .join(',')}}`
}

export const renderMetrics = (): string => {
  const lines = [
    '# HELP wingstravel_process_up Whether this application process can serve metrics.',
    '# TYPE wingstravel_process_up gauge',
    'wingstravel_process_up 1',
  ]
  for (const [key, value] of [...counters.entries()].sort(([left], [right]) =>
    left.localeCompare(right),
  )) {
    const [name, labels = ''] = key.split('|', 2)
    lines.push(`${name}${prometheusLabels(labels)} ${value}`)
  }
  return `${lines.join('\n')}\n`
}

export const resetMetricsForTests = (): void => counters.clear()
