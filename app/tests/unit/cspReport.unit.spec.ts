import { beforeEach, describe, expect, it, vi } from 'vitest'

import { POST } from '@/app/(payload)/api/security/csp-report/route'
import { renderMetrics, resetMetricsForTests } from '@/observability'

describe('CSP report endpoint', () => {
  beforeEach(() => resetMetricsForTests())

  it('accepts a bounded report and logs origins without full paths', async () => {
    const warning = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    const response = await POST(
      new Request('https://wingsgroup.vn/api/security/csp-report', {
        body: JSON.stringify({
          'csp-report': {
            'blocked-uri': 'https://cdn.example.net/private/path?token=secret',
            'document-uri': 'https://wingsgroup.vn/customer/private',
            'effective-directive': 'script-src-elem',
          },
        }),
        headers: { 'content-type': 'application/csp-report' },
        method: 'POST',
      }),
    )

    expect(response.status).toBe(204)
    expect(warning).toHaveBeenCalledOnce()
    expect(JSON.parse(String(warning.mock.calls[0]?.[0]))).toMatchObject({
      action: 'csp_violation',
      blockedOrigin: 'https://cdn.example.net',
      documentOrigin: 'https://wingsgroup.vn',
      level: 'warn',
    })
    expect(JSON.stringify(warning.mock.calls)).not.toContain('secret')
    warning.mockRestore()
  })

  it('rejects malformed and oversized reports', async () => {
    const malformed = await POST(
      new Request('https://wingsgroup.vn/api/security/csp-report', {
        body: '{',
        headers: { 'content-type': 'application/csp-report' },
        method: 'POST',
      }),
    )
    const oversized = await POST(
      new Request('https://wingsgroup.vn/api/security/csp-report', {
        body: JSON.stringify({ value: 'x'.repeat(17 * 1024) }),
        headers: { 'content-type': 'application/csp-report' },
        method: 'POST',
      }),
    )

    expect(malformed.status).toBe(400)
    expect(oversized.status).toBe(413)
  })

  it('buckets unknown directives instead of creating attacker-controlled metric labels', async () => {
    const warning = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    const response = await POST(
      new Request('https://wingsgroup.vn/api/security/csp-report', {
        body: JSON.stringify({ 'csp-report': { 'effective-directive': 'attacker-series-123' } }),
        headers: { 'content-type': 'application/csp-report' },
        method: 'POST',
      }),
    )
    expect(response.status).toBe(204)
    expect(renderMetrics()).toContain('wingstravel_csp_reports_total{directive="other"} 1')
    warning.mockRestore()
  })
})
