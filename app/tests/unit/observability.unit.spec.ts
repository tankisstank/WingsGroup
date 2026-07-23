import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  incrementMetric,
  logOperationalEvent,
  renderMetrics,
  resetMetricsForTests,
} from '@/observability'
import { GET as getMetrics } from '@/app/(payload)/api/operations/metrics/route'

describe('production observability contract', () => {
  beforeEach(() => {
    resetMetricsForTests()
    vi.stubEnv('METRICS_TOKEN', 'metrics-test-token')
  })

  afterEach(() => vi.unstubAllEnvs())

  it('requires the exact bearer token and does not reveal endpoint existence', () => {
    expect(getMetrics(new Request('https://example.test/api/operations/metrics')).status).toBe(404)
    expect(
      getMetrics(
        new Request('https://example.test/api/operations/metrics', {
          headers: { authorization: 'Bearer wrong' },
        }),
      ).status,
    ).toBe(404)
    expect(
      getMetrics(
        new Request('https://example.test/api/operations/metrics', {
          headers: { authorization: 'Bearer metrics-test-token' },
        }),
      ).status,
    ).toBe(200)
  })

  it('renders deterministic Prometheus counters', () => {
    incrementMetric('wingstravel_readiness_checks_total', { result: 'ready' })
    incrementMetric('wingstravel_readiness_checks_total', { result: 'ready' }, 2)
    expect(renderMetrics()).toContain('wingstravel_readiness_checks_total{result="ready"} 3')
  })

  it('bounds attacker-controlled metric series', () => {
    for (let index = 0; index < 300; index += 1) {
      incrementMetric('wingstravel_csp_reports_total', { directive: `attacker-${index}` })
    }
    const metricLines = renderMetrics()
      .split('\n')
      .filter((line) => line.startsWith('wingstravel_csp_reports_total'))
    expect(metricLines.length).toBeLessThanOrEqual(256)
    expect(metricLines.some((line) => line.includes('overflow="true"'))).toBe(true)
  })

  it('emits one JSON line and removes sensitive or structured values', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    logOperationalEvent('error', 'lead_failed', {
      email: 'private@example.test',
      error: new Error('secret'),
      request_id: 'request-1',
      status_code: 503,
      token: 'secret',
    })
    const record = JSON.parse(String(consoleSpy.mock.calls[0]?.[0]))
    expect(record).toMatchObject({
      action: 'lead_failed',
      request_id: 'request-1',
      status_code: 503,
    })
    expect(record).not.toHaveProperty('email')
    expect(record).not.toHaveProperty('error')
    expect(record).not.toHaveProperty('token')
  })
})
