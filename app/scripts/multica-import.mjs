#!/usr/bin/env node

/**
 * Read-only migration preview for the WingsTravel Plane -> Multica move.
 *
 * This program deliberately has no Multica client or credentials. Its default
 * preview and guarded apply contract are both non-writing: a later, separately
 * authorized change must add the actual idempotent writer.
 */
import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const action = process.argv[2] || 'preview'
const jsonOutput = process.argv.includes('--json')
const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const repoRoot = path.resolve(appRoot, '..')
const manifestPath = path.join(repoRoot, 'docs', 'plane', 'manifest.json')
const storyRoot = path.join(repoRoot, 'docs', 'stories')

const expectedSummary = {
  project_count: 7,
  epic_count: 8,
  story_count: 57,
  acceptance_criterion_count: 189,
}
const confirmationToken = 'CONFIRM_MULTICA_HISTORY_IMPORT'

if (!['preview', 'plan', 'apply'].includes(action)) {
  throw new Error(`Unknown action: ${action}. Use 'preview', 'plan', or guarded 'apply'.`)
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'))
}

function runHarnessSql(sql) {
  const command = process.platform === 'win32' ? 'powershell.exe' : path.join(repoRoot, 'scripts', 'harness')
  const args = process.platform === 'win32'
    ? ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', path.join(repoRoot, 'scripts', 'harness.ps1'), 'query', 'sql', sql]
    : ['query', 'sql', sql]
  const result = spawnSync(command, args, { cwd: repoRoot, encoding: 'utf8' })
  if (result.status !== 0) {
    throw new Error(result.stderr || result.stdout || 'Failed to query Harness')
  }
  return result.stdout.split(/\r?\n/).map((line) => line.trim()).filter(Boolean).at(-1) || ''
}

function loadStories() {
  const sql = "SELECT json_group_array(json_object('id', id, 'title', title, 'created_at', created_at, 'status', status, 'unit', unit_proof, 'integration', integration_proof, 'e2e', e2e_proof, 'platform', platform_proof, 'evidence', evidence, 'notes', notes)) AS data FROM story WHERE id LIKE 'US-%';"
  return JSON.parse(runHarnessSql(sql)).sort((left, right) => left.id.localeCompare(right.id, undefined, { numeric: true }))
}

function walkFiles(dirPath) {
  if (!fs.existsSync(dirPath)) return []
  return fs.readdirSync(dirPath, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(dirPath, entry.name)
    return entry.isDirectory() ? walkFiles(entryPath) : [entryPath]
  })
}

function resolveStoryPath(story, mapping, manifest) {
  if (story.notes?.includes('docs/stories/')) {
    const candidate = path.join(repoRoot, story.notes)
    if (fs.existsSync(candidate)) return candidate
  }
  const epic = (manifest.epics || []).find((item) => item.key === mapping.epicKey)
  const searchRoots = [epic?.source ? path.dirname(path.join(repoRoot, epic.source)) : null, storyRoot].filter(Boolean)
  for (const root of searchRoots) {
    const lowerId = story.id.toLowerCase()
    const match = walkFiles(root).find((filePath) => path.basename(filePath).toLowerCase().startsWith(lowerId))
    if (match) return match
    const stack = [root]
    while (stack.length) {
      const current = stack.pop()
      for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
        if (!entry.isDirectory()) continue
        const fullPath = path.join(current, entry.name)
        if (entry.name.toLowerCase().startsWith(lowerId)) {
          const overview = path.join(fullPath, 'overview.md')
          if (fs.existsSync(overview)) return overview
        }
        stack.push(fullPath)
      }
    }
  }
  return null
}

function extractAcceptanceCriteria(markdown) {
  const lines = markdown.replace(/\r/g, '').split('\n')
  const start = lines.findIndex((line) => line.trim().toLowerCase() === '## acceptance criteria')
  if (start === -1) return []
  const items = []
  let pending = null
  for (const rawLine of lines.slice(start + 1)) {
    if (rawLine.startsWith('## ')) break
    const line = rawLine.trim()
    if (!line) continue
    if (line.startsWith('- ')) {
      if (pending) items.push(pending.trim())
      pending = line.slice(2)
    } else if (pending) {
      pending += ` ${line}`
    }
  }
  if (pending) items.push(pending.trim())
  return items.slice(0, 6)
}

function proofStatus(story, mapping) {
  if (['Full', 'Partial', 'Pending'].includes(mapping.proofStatusOverride)) return mapping.proofStatusOverride
  const proofs = [story.unit, story.integration, story.e2e, story.platform].map(Number)
  if (proofs.every((value) => value === 1)) return 'Full'
  return proofs.some((value) => value === 1) ? 'Partial' : 'Pending'
}

function planeState(story, mapping) {
  if (mapping.planeStateOverride) return mapping.planeStateOverride
  if (story.status === 'planned') return 'Đã lên kế hoạch'
  return proofStatus(story, mapping) === 'Full' ? 'Đã bàn giao' : 'Chờ xác nhận'
}

function multicaState(sourceState) {
  const states = {
    'Kế hoạch': 'backlog',
    'Đã lên kế hoạch': 'backlog',
    'Tiếp nhận': 'todo',
    'Đang thực hiện': 'in_progress',
    'Đang rà soát': 'in_review',
    'Chờ xác nhận': 'in_review',
    'Tắc nghẽn': 'blocked',
    'Đã bàn giao': 'done',
    'Hoàn tất': 'done',
    'Đã hủy': 'cancelled',
  }
  if (!states[sourceState]) throw new Error(`No Multica mapping for Plane state: ${sourceState}`)
  return states[sourceState]
}

function toDateOnly(value) {
  return String(value || '').match(/\b20\d{2}-\d{2}-\d{2}\b/)?.[0] || null
}

function latestEvidenceDate(value) {
  return (String(value || '').match(/\b20\d{2}-\d{2}-\d{2}\b/g) || []).sort().at(-1) || null
}

function containsAgentTriggerSyntax(value) {
  return /mention:\/\/|\[@[^\]]+\]\(mention:/i.test(String(value))
}

function allRecordValues(records) {
  return records.flatMap((record) => [
    record.title,
    JSON.stringify(record.properties),
    ...record.acceptance_criteria.flatMap((criterion) => [criterion.title, JSON.stringify(criterion.properties)]),
  ])
}

function validatePreviewInvariants(preview) {
  const failures = Object.entries(expectedSummary).flatMap(([key, value]) =>
    preview.summary[key] === value ? [] : [`${key}: expected ${value}, received ${preview.summary[key]}`],
  )
  if (preview.mode !== 'dry-run') failures.push(`mode: expected dry-run, received ${preview.mode}`)
  if (preview.writes_performed !== false) failures.push(`writes_performed: expected false, received ${preview.writes_performed}`)
  if (preview.epics.some((epic) => epic.assignee !== null) || preview.stories.some((story) => story.assignee !== null || story.acceptance_criteria.some((criterion) => criterion.assignee !== null))) {
    failures.push('historical records must remain unassigned')
  }
  if (allRecordValues(preview.stories).some(containsAgentTriggerSyntax) || preview.epics.some((epic) => containsAgentTriggerSyntax(epic.title) || containsAgentTriggerSyntax(JSON.stringify(epic.properties)))) {
    failures.push('historical records must not contain Multica mention syntax')
  }
  return failures
}

function readOption(name) {
  const index = process.argv.indexOf(name)
  return index === -1 ? null : process.argv[index + 1] || null
}

function requireApplyConfirmation(preview) {
  const confirmations = {
    '--confirm': confirmationToken,
    '--expected-projects': String(expectedSummary.project_count),
    '--expected-epics': String(expectedSummary.epic_count),
    '--expected-stories': String(expectedSummary.story_count),
    '--expected-acceptance-criteria': String(expectedSummary.acceptance_criterion_count),
  }
  const missing = Object.entries(confirmations)
    .filter(([name, value]) => readOption(name) !== value)
    .map(([name, value]) => `${name} ${value}`)
  const invariantFailures = validatePreviewInvariants(preview)
  if (missing.length || invariantFailures.length) {
    const details = [
      ...missing.map((input) => `missing or incorrect confirmation: ${input}`),
      ...invariantFailures.map((failure) => `preview invariant failed: ${failure}`),
    ]
    throw new Error(`Refusing history import apply; no write was attempted.\n- ${details.join('\n- ')}`)
  }
}

function buildOperationPlan(preview) {
  return {
    mode: action === 'apply' ? 'guarded-apply-plan' : 'plan',
    writes_performed: false,
    write_adapter: 'not implemented; a separately approved change is required before any Multica mutation',
    safeguards: {
      historical_records_unassigned: true,
      agent_trigger_syntax_count: 0,
      mention_syntax_policy: 'forbidden',
      required_confirmation: action === 'apply' ? 'validated' : 'not requested',
      expected_summary: expectedSummary,
    },
    operations: [
      ...preview.projects.map((project) => ({ operation: 'create_or_update_project', key: project.key, name: project.name, assignee: null })),
      ...preview.epics.map((epic) => ({ operation: 'create_or_update_epic', external_id: epic.external_id, project_key: epic.project_key, title: epic.title, assignee: null })),
      ...preview.stories.flatMap((story) => [
        { operation: 'create_or_update_story', external_id: story.external_id, project_key: story.project_key, parent_external_id: story.parent_external_id, title: story.title, assignee: null },
        ...story.acceptance_criteria.map((criterion) => ({ operation: 'create_or_update_acceptance_criterion', external_id: criterion.external_id, parent_external_id: criterion.parent_external_id, stage: criterion.stage, title: criterion.title, assignee: null })),
      ]),
    ],
  }
}

function buildPreview(manifest) {
  const mappings = manifest.storyMappings || {}
  const stories = loadStories().filter((story) => mappings[story.id])
  const records = stories.map((story) => {
    const mapping = mappings[story.id]
    const sourcePath = resolveStoryPath(story, mapping, manifest)
    const declaredSourcePath = story.notes?.includes('docs/') ? story.notes : null
    const sourceLink = sourcePath
      ? path.relative(repoRoot, sourcePath).replaceAll('\\\\', '/')
      : declaredSourcePath || `harness:story:${story.id}`
    const sourceDocumentStatus = sourcePath
      ? 'resolved'
      : declaredSourcePath
        ? 'declared_missing'
        : 'harness_only'
    const acceptanceCriteria = sourcePath ? extractAcceptanceCriteria(fs.readFileSync(sourcePath, 'utf8')) : []
    const sourceState = planeState(story, mapping)
    return {
      external_id: `wingstravel:${story.id}`,
      kind: 'story',
      title: `${story.id} ${story.title}`,
      parent_external_id: mapping.epicKey ? `wingstravel:epic:${mapping.epicKey}` : null,
      project_key: mapping.projectKey,
      status: multicaState(sourceState),
      assignee: null,
      start_date: toDateOnly(story.created_at),
      due_date: latestEvidenceDate(story.evidence) || toDateOnly(story.created_at),
      properties: {
        source_story_id: story.id,
        source_plane_state: sourceState,
        proof_status: proofStatus(story, mapping),
        site: mapping.site || null,
        phase: mapping.phase || null,
        workstream: mapping.workstream || null,
        source_link: sourceLink,
        source_document_status: sourceDocumentStatus,
      },
      acceptance_criteria: acceptanceCriteria.map((criterion, index) => ({
        external_id: `wingstravel:${story.id}:ac:${index + 1}`,
        kind: 'acceptance_criterion',
        parent_external_id: `wingstravel:${story.id}`,
        stage: index + 1,
        title: `${story.id} - ${criterion}`,
        status: multicaState(sourceState),
        assignee: null,
        properties: { source_story_id: story.id, source_criterion: criterion },
      })),
    }
  })
  const epics = (manifest.epics || []).map((epic) => ({
    external_id: `wingstravel:epic:${epic.key}`,
    kind: 'epic',
    title: epic.name,
    project_key: epic.projectKey,
    status: 'done',
    assignee: null,
    properties: { source_epic_key: epic.key, source_link: epic.source || null },
  }))
  const declaredMissingSourceCount = records.filter((record) => record.properties.source_document_status === 'declared_missing').length
  const harnessOnlySourceCount = records.filter((record) => record.properties.source_document_status === 'harness_only').length
  const acceptanceCount = records.reduce((count, record) => count + record.acceptance_criteria.length, 0)
  return {
    mode: 'dry-run',
    writes_performed: false,
    migration_contract: 'Plane-to-Multica v1',
    source: { manifest: path.relative(repoRoot, manifestPath), harness: 'harness.db' },
    projects: (manifest.projects || []).map(({ key, name, identifier, description }) => ({ key, name, identifier, description })),
    epics,
    stories: records,
    retained_in_repository: { plane_pages: (manifest.pages || []).map((page) => page.source), milestones: manifest.milestones || [] },
    summary: {
      project_count: (manifest.projects || []).length,
      epic_count: epics.length,
      story_count: records.length,
      acceptance_criterion_count: acceptanceCount,
      unassigned_record_count: epics.length + records.length + acceptanceCount,
      declared_missing_source_document_count: declaredMissingSourceCount,
      harness_only_source_count: harnessOnlySourceCount,
    },
  }
}

const preview = buildPreview(readJson(manifestPath))
if (action === 'apply') requireApplyConfirmation(preview)

const output = action === 'preview' ? preview : buildOperationPlan(preview)
if (jsonOutput) {
  console.log(JSON.stringify(output, null, 2))
} else if (action === 'preview') {
  console.log(`Multica dry run: ${preview.summary.project_count} projects, ${preview.summary.epic_count} Epics, ${preview.summary.story_count} stories, ${preview.summary.acceptance_criterion_count} acceptance criteria.`)
  console.log(`Writes performed: ${preview.writes_performed}. Unassigned records: ${preview.summary.unassigned_record_count}. Declared-missing source documents: ${preview.summary.declared_missing_source_document_count}. Harness-only sources: ${preview.summary.harness_only_source_count}.`)
  console.log('Use --json for the complete deterministic migration contract.')
} else {
  console.log(`Multica ${output.mode}: ${output.operations.length} intended operations. Writes performed: false.`)
  console.log('Historical records are unassigned and agent-trigger mention syntax is forbidden. No Multica client was invoked.')
}
