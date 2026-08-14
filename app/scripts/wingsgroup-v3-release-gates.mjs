import fs from 'node:fs/promises'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

export const allowedGateStates = new Set(['pending', 'pending-update', 'approved', 'rejected', 'not-applicable'])
export const allowedChannelStates = new Set(['unconfigured', 'configured', 'disabled'])

const defaultRegisterPath = path.resolve(
  import.meta.dirname,
  '..',
  '..',
  'docs',
  'product',
  'wingsgroup-v3-release-gates.json',
)

const parseArgs = (argv) => {
  const args = new Map()
  for (let index = 2; index < argv.length; index += 1) {
    const token = argv[index]
    if (!token.startsWith('--')) continue
    const [key, inlineValue] = token.slice(2).split('=', 2)
    const nextValue = argv[index + 1]
    const value = inlineValue ?? (nextValue && !nextValue.startsWith('--') ? nextValue : 'true')
    if (inlineValue === undefined && nextValue && !nextValue.startsWith('--')) index += 1
    args.set(key, value)
  }
  return args
}

export const validateGate = (gate) => {
  const errors = []
  const warnings = []
  if (!gate?.key) errors.push('Gate key is required.')
  if (!gate?.scope) errors.push('Gate scope is required.')
  if (typeof gate?.mandatory !== 'boolean') errors.push('Gate mandatory flag is required.')
  if (!allowedGateStates.has(gate?.state)) errors.push(`Unsupported gate state: ${gate?.state || '(missing)'}.`)
  if (!gate?.owner) errors.push('Gate owner is required.')
  if (!Array.isArray(gate?.evidenceRequirements) || gate.evidenceRequirements.length === 0)
    errors.push('At least one evidence requirement is required.')
  if (!gate?.failClosedBehavior) errors.push('Fail-closed behavior is required.')
  if (!Array.isArray(gate?.consumers) || gate.consumers.length === 0)
    errors.push('At least one downstream consumer is required.')

  if (gate?.state === 'approved') {
    if (!Array.isArray(gate.evidence) || gate.evidence.length === 0)
      errors.push('Approved gate requires a non-sensitive evidence reference.')
  }

  if (gate?.key === 'privacy-consent' && gate?.state === 'approved') {
    if (!gate?.policy?.version) errors.push('Approved privacy gate requires a policy version.')
    if (!gate?.policy?.routes?.vi || !gate?.policy?.routes?.en)
      errors.push('Approved privacy gate requires Vietnamese and English policy routes.')
    if (!Number.isInteger(gate?.policy?.retentionPeriodMonths) || gate.policy.retentionPeriodMonths <= 0)
      errors.push('Approved privacy gate requires a positive retention period in months.')
    if (!/^\S+@\S+\.\S+$/.test(gate?.policy?.dataSubjectContact || ''))
      errors.push('Approved privacy gate requires a valid data-subject contact email.')
    if (gate?.policy?.interBranchTransfer?.allowed !== true || !gate?.policy?.interBranchTransfer?.scope)
      errors.push('Approved privacy gate requires an explicit inter-branch transfer decision and scope.')
    if (!gate?.consent?.version || gate?.consent?.required !== true)
      errors.push('Approved privacy gate requires a mandatory versioned consent contract.')
    if (!gate?.consent?.vi || !gate?.consent?.en)
      errors.push('Approved privacy gate requires Vietnamese and English consent wording.')
  }

  for (const channel of gate?.channels || []) {
    if (!channel?.key) errors.push('Consultation channel key is required.')
    if (!allowedChannelStates.has(channel?.state))
      errors.push(`Unsupported consultation channel state: ${channel?.state || '(missing)'}.`)
    if (channel?.state === 'configured') {
      if (!/^https:\/\//.test(channel.url || '')) errors.push(`Configured channel ${channel.key} requires an HTTPS URL.`)
      if (!channel.owner) errors.push(`Configured channel ${channel.key} requires an owner.`)
      if (!channel.sla) errors.push(`Configured channel ${channel.key} requires an SLA.`)
      if (!channel.trackingEvidence) errors.push(`Configured channel ${channel.key} requires tracking evidence.`)
    }
  }

  for (const link of gate?.links || []) {
    if (!link?.key) errors.push('Ecosystem deep-link key is required.')
    if (!allowedGateStates.has(link?.state))
      errors.push(`Unsupported ecosystem deep-link state: ${link?.state || '(missing)'}.`)
    if (link?.state === 'approved') {
      if (!/^https:\/\//.test(link.url || '')) errors.push(`Approved deep link ${link.key} requires an HTTPS URL.`)
      if (!/^https:\/\//.test(link.expectedCanonical || '')) errors.push(`Approved deep link ${link.key} requires an HTTPS canonical.`)
      if (!link.owner) errors.push(`Approved deep link ${link.key} requires an owner.`)
      if (!link.trackingEvidence) errors.push(`Approved deep link ${link.key} requires tracking evidence.`)
    }
  }

  if (gate?.mandatory && gate?.state !== 'approved') {
    warnings.push(`Mandatory gate is ${gate.state}; production release remains blocked.`)
  }
  return { errors, warnings }
}

export const assessReleaseGates = (register) => {
  const errors = []
  if (register?.version !== 1) errors.push('Register version must be 1.')
  if (register?.siteCode !== 'wings-group') errors.push('Register must target site code wings-group.')
  if (register?.release !== 'wingsgroup-v3') errors.push('Register must target release wingsgroup-v3.')
  if (!Array.isArray(register?.gates) || register.gates.length === 0) errors.push('Register requires gates.')

  const gateResults = (register?.gates || []).map((gate) => ({ key: gate.key, ...validateGate(gate) }))
  const duplicateKeys = gateResults.filter(
    (gate, index) => gateResults.findIndex((candidate) => candidate.key === gate.key) !== index,
  )
  if (duplicateKeys.length) errors.push(`Duplicate gate key(s): ${[...new Set(duplicateKeys.map((gate) => gate.key))].join(', ')}.`)

  const validationErrors = gateResults.flatMap((gate) => gate.errors.map((message) => `${gate.key}: ${message}`))
  const pendingMandatory = (register?.gates || []).filter((gate) => gate.mandatory && gate.state !== 'approved')
  const approved = pendingMandatory.length === 0 && errors.length === 0 && validationErrors.length === 0

  return {
    approved,
    errors: [...errors, ...validationErrors],
    gateResults,
    mandatoryGateCount: (register?.gates || []).filter((gate) => gate.mandatory).length,
    pendingMandatory: pendingMandatory.map((gate) => ({ key: gate.key, state: gate.state })),
    siteCode: register?.siteCode || null,
  }
}

export const loadRegister = async (registerPath = defaultRegisterPath) =>
  JSON.parse(await fs.readFile(registerPath, 'utf8'))

const formatText = (assessment, registerPath) => {
  const lines = [
    `WingsGroup v3 release-gate register: ${registerPath}`,
    `Mandatory gates: ${assessment.mandatoryGateCount}`,
  ]
  if (assessment.errors.length) lines.push(`Configuration errors: ${assessment.errors.length}`)
  if (assessment.pendingMandatory.length) {
    lines.push('Release blocked by mandatory gates:')
    for (const gate of assessment.pendingMandatory) lines.push(`- ${gate.key}: ${gate.state}`)
  }
  if (assessment.approved) lines.push('Release gates approved.')
  return lines.join('\n')
}

export async function main(argv = process.argv) {
  const args = parseArgs(argv)
  const registerPath = path.resolve(args.get('register') || defaultRegisterPath)
  const assessment = assessReleaseGates(await loadRegister(registerPath))
  if (args.get('json') === 'true') console.log(JSON.stringify(assessment, null, 2))
  else console.log(formatText(assessment, registerPath))
  return assessment.approved ? 0 : 1
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().then((exitCode) => {
    process.exitCode = exitCode
  }).catch((error) => {
    console.error(error instanceof Error ? error.message : String(error))
    process.exitCode = 2
  })
}
