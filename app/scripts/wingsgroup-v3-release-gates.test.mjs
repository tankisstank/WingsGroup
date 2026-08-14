import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

import {
  assessReleaseGates,
  expectedConsultationChannelKeys,
  expectedEcosystemDeepLinkKeys,
  expectedGateInventory,
} from './wingsgroup-v3-release-gates.mjs'

const governedRegister = JSON.parse(
  fs.readFileSync(new URL('../../docs/product/wingsgroup-v3-release-gates.json', import.meta.url), 'utf8'),
)

const register = () => structuredClone(governedRegister)
const gateByKey = (candidate, key) => candidate.gates.find((gate) => gate.key === key)

const fullyApprovedRegister = () => {
  const candidate = register()
  for (const gate of candidate.gates) {
    if (!gate.mandatory) continue
    gate.state = 'approved'
    if (!Array.isArray(gate.evidence) || gate.evidence.length === 0) {
      gate.evidence = [`test-approval:${gate.key}`]
    }
  }

  for (const link of gateByKey(candidate, 'ecosystem-deep-links').links) {
    link.state = 'approved'
    link.url = `https://${link.key}.example.test/`
    link.expectedCanonical = link.url
    link.owner = 'Test destination owner'
    link.trackingEvidence = `test-tracking:${link.key}`
  }

  return candidate
}

test('the governed register has the immutable expected inventory and remains fail-closed while mandatory gates are pending', () => {
  const result = assessReleaseGates(register())

  assert.equal(result.approved, false)
  assert.deepEqual(result.errors, [])
  assert.equal(result.mandatoryGateCount, 7)
  assert.equal(result.pendingMandatory.length, 6)
  assert.ok(result.pendingMandatory.some(({ key }) => key === 'privacy-consent'))
  assert.ok(!result.pendingMandatory.some(({ key }) => key === 'legal-identity'))
  assert.deepEqual(
    governedRegister.gates.map(({ key, mandatory }) => ({ key, mandatory })),
    expectedGateInventory,
  )
})

test('approved mandatory gates require non-sensitive evidence references', () => {
  const candidate = fullyApprovedRegister()
  gateByKey(candidate, 'legal-identity').evidence = []

  const result = assessReleaseGates(candidate)

  assert.equal(result.approved, false)
  assert.match(result.errors.join(' '), /evidence reference/)
})

test('configured consultation channels require their complete operational contract', () => {
  const candidate = fullyApprovedRegister()
  gateByKey(candidate, 'consultation-channels').channels[0] = {
    key: 'zalo',
    state: 'configured',
    url: 'http://example.test',
  }

  const result = assessReleaseGates(candidate)

  assert.equal(result.approved, false)
  assert.match(result.errors.join(' '), /HTTPS URL/)
  assert.match(result.errors.join(' '), /requires an owner/)
  assert.match(result.errors.join(' '), /requires an SLA/)
  assert.match(result.errors.join(' '), /tracking evidence/)
})

test('the complete optional consultation-channel gate may remain pending without blocking release', () => {
  const candidate = fullyApprovedRegister()
  const result = assessReleaseGates(candidate)

  assert.equal(gateByKey(candidate, 'consultation-channels').state, 'pending-update')
  assert.equal(gateByKey(candidate, 'consultation-channels').mandatory, false)
  assert.deepEqual(
    gateByKey(candidate, 'consultation-channels').channels.map(({ key }) => key),
    expectedConsultationChannelKeys,
  )
  assert.equal(result.approved, true)
  assert.deepEqual(result.pendingMandatory, [])
})

test('approved privacy gate requires the complete stakeholder-approved contract', () => {
  const candidate = fullyApprovedRegister()
  const privacyGate = gateByKey(candidate, 'privacy-consent')
  delete privacyGate.policy.version
  delete privacyGate.policy.retentionPeriodMonths
  delete privacyGate.policy.dataSubjectContact
  delete privacyGate.consent.version

  const result = assessReleaseGates(candidate)

  assert.equal(result.approved, false)
  assert.match(result.errors.join(' '), /policy version/)
  assert.match(result.errors.join(' '), /retention period/)
  assert.match(result.errors.join(' '), /data-subject contact/)
  assert.match(result.errors.join(' '), /versioned consent/)
})

test('the fully evidenced expected inventory can pass the release-gate contract', () => {
  const result = assessReleaseGates(fullyApprovedRegister())

  assert.equal(result.approved, true)
  assert.deepEqual(result.errors, [])
  assert.deepEqual(result.pendingMandatory, [])
})

test('omitting any expected gate fails closed', () => {
  for (const expectedGate of expectedGateInventory) {
    const candidate = fullyApprovedRegister()
    candidate.gates = candidate.gates.filter((gate) => gate.key !== expectedGate.key)

    const result = assessReleaseGates(candidate)

    assert.equal(result.approved, false, expectedGate.key)
    assert.match(result.errors.join(' '), new RegExp(`Missing expected gate key\\(s\\): ${expectedGate.key}`))
  }
})

test('downgrading a mandatory gate to optional fails closed', () => {
  const candidate = fullyApprovedRegister()
  gateByKey(candidate, 'proof-publication').mandatory = false

  const result = assessReleaseGates(candidate)

  assert.equal(result.approved, false)
  assert.match(
    result.errors.join(' '),
    /Gate proof-publication mandatory classification must be true; received false/,
  )
})

test('upgrading the optional consultation gate to mandatory also violates its locked classification', () => {
  const candidate = fullyApprovedRegister()
  gateByKey(candidate, 'consultation-channels').mandatory = true
  gateByKey(candidate, 'consultation-channels').state = 'approved'
  gateByKey(candidate, 'consultation-channels').evidence = ['test-approval:consultation-channels']

  const result = assessReleaseGates(candidate)

  assert.equal(result.approved, false)
  assert.match(
    result.errors.join(' '),
    /Gate consultation-channels mandatory classification must be false; received true/,
  )
})

test('extra, duplicate, and renamed gates fail closed', () => {
  const extra = fullyApprovedRegister()
  extra.gates.push({ ...structuredClone(extra.gates[0]), key: 'unreviewed-gate' })
  assert.match(assessReleaseGates(extra).errors.join(' '), /Unexpected gate key\(s\): unreviewed-gate/)

  const duplicate = fullyApprovedRegister()
  duplicate.gates.push(structuredClone(duplicate.gates[0]))
  assert.match(assessReleaseGates(duplicate).errors.join(' '), /Duplicate gate key\(s\): legal-identity/)

  const renamed = fullyApprovedRegister()
  gateByKey(renamed, 'brand-logo-tokens').key = 'brand-assets'
  const renamedErrors = assessReleaseGates(renamed).errors.join(' ')
  assert.match(renamedErrors, /Missing expected gate key\(s\): brand-logo-tokens/)
  assert.match(renamedErrors, /Unexpected gate key\(s\): brand-assets/)
})

test('consultation-channel inventory rejects omissions, extras, and duplicates', () => {
  const missing = fullyApprovedRegister()
  gateByKey(missing, 'consultation-channels').channels.pop()
  assert.match(
    assessReleaseGates(missing).errors.join(' '),
    /Missing expected consultation channel key\(s\): messenger/,
  )

  const extra = fullyApprovedRegister()
  gateByKey(extra, 'consultation-channels').channels.push({ key: 'telegram', state: 'disabled' })
  assert.match(
    assessReleaseGates(extra).errors.join(' '),
    /Unexpected consultation channel key\(s\): telegram/,
  )

  const duplicate = fullyApprovedRegister()
  gateByKey(duplicate, 'consultation-channels').channels.push({ key: 'zalo', state: 'disabled' })
  assert.match(
    assessReleaseGates(duplicate).errors.join(' '),
    /Duplicate consultation channel key\(s\): zalo/,
  )
})

test('ecosystem deep-link inventory is immutable', () => {
  const candidate = fullyApprovedRegister()
  const ecosystemGate = gateByKey(candidate, 'ecosystem-deep-links')
  assert.deepEqual(ecosystemGate.links.map(({ key }) => key), expectedEcosystemDeepLinkKeys)
  ecosystemGate.links[1].key = 'wingsside'

  const errors = assessReleaseGates(candidate).errors.join(' ')

  assert.match(errors, /Missing expected ecosystem deep-link key\(s\): wing-side/)
  assert.match(errors, /Unexpected ecosystem deep-link key\(s\): wingsside/)
})
