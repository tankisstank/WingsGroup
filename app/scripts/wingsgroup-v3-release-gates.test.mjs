import assert from 'node:assert/strict'
import test from 'node:test'

import { assessReleaseGates } from './wingsgroup-v3-release-gates.mjs'

const gate = (overrides = {}) => ({
  key: 'legal-identity',
  scope: 'Legal identity',
  mandatory: true,
  state: 'pending',
  owner: 'Legal owner',
  evidenceRequirements: ['Approval reference'],
  failClosedBehavior: 'Do not publish the claim.',
  consumers: ['US-061'],
  ...overrides,
})

const register = (gates) => ({
  version: 1,
  siteCode: 'wings-group',
  release: 'wingsgroup-v3',
  gates,
})

test('mandatory pending gates fail closed without becoming malformed', () => {
  const result = assessReleaseGates(register([gate()]))
  assert.equal(result.approved, false)
  assert.deepEqual(result.errors, [])
  assert.deepEqual(result.pendingMandatory, [{ key: 'legal-identity', state: 'pending' }])
})

test('approved mandatory gates require non-sensitive evidence references', () => {
  const result = assessReleaseGates(register([gate({ state: 'approved' })]))
  assert.equal(result.approved, false)
  assert.match(result.errors.join(' '), /evidence reference/)
})

test('configured consultation channels require their complete operational contract', () => {
  const result = assessReleaseGates(
    register([
      gate({
        channels: [{ key: 'zalo', state: 'configured', url: 'http://example.test' }],
        evidence: ['legal-approval-2026-08-13'],
        state: 'approved',
      }),
    ]),
  )
  assert.equal(result.approved, false)
  assert.match(result.errors.join(' '), /HTTPS URL/)
  assert.match(result.errors.join(' '), /requires an owner/)
  assert.match(result.errors.join(' '), /requires an SLA/)
  assert.match(result.errors.join(' '), /tracking evidence/)
})

test('optional consultation channels may wait for an update without blocking release', () => {
  const result = assessReleaseGates(
    register([
      gate({ evidence: ['legal-approval-2026-08-13'], state: 'approved' }),
      {
        key: 'consultation-channels',
        scope: 'Optional external channels',
        mandatory: false,
        state: 'pending-update',
        owner: 'Commercial operations owner',
        evidenceRequirements: ['HTTPS URL when configured'],
        failClosedBehavior: 'Keep external links hidden.',
        consumers: ['US-064'],
      },
    ]),
  )
  assert.equal(result.approved, true)
  assert.deepEqual(result.pendingMandatory, [])
})

test('approved privacy gate requires the complete stakeholder-approved contract', () => {
  const result = assessReleaseGates(
    register([
      gate({
        key: 'privacy-consent',
        evidence: ['stakeholder-approval-2026-08-14'],
        state: 'approved',
      }),
    ]),
  )

  assert.equal(result.approved, false)
  assert.match(result.errors.join(' '), /policy version/)
  assert.match(result.errors.join(' '), /retention period/)
  assert.match(result.errors.join(' '), /data-subject contact/)
  assert.match(result.errors.join(' '), /versioned consent/)
})

test('fully evidenced approved gates can pass the release-gate contract', () => {
  const result = assessReleaseGates(
    register([
      gate({
        evidence: ['approval-record-2026-08-13'],
        state: 'approved',
      }),
    ]),
  )
  assert.equal(result.approved, true)
  assert.deepEqual(result.pendingMandatory, [])
})
