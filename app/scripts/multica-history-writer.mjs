import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const repoRoot = path.resolve(appRoot, '..')
export const SANDBOX_WORKSPACE_ID = 'fbd0e39f-4459-4ae2-a997-2133145fced1'
const EXTERNAL_ID_KEY = 'history_external_id'
const EXPECTED = { projects: 7, epics: 8, stories: 57, criteria: 189 }

const readJson = (filePath) => JSON.parse(fs.readFileSync(filePath, 'utf8'))
const writeJsonAtomic = (filePath, value) => {
  fs.mkdirSync(path.dirname(filePath), { recursive: true })
  const temporary = `${filePath}.tmp`
  fs.writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`, 'utf8')
  fs.renameSync(temporary, filePath)
}
const sha256 = (value) => createHash('sha256').update(JSON.stringify(value)).digest('hex')
const sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds))

function parseArguments(argv) {
  const value = (name) => argv.includes(name) ? argv[argv.indexOf(name) + 1] : undefined
  return {
    apply: argv.includes('--apply'),
    workspaceId: value('--workspace-id') || SANDBOX_WORKSPACE_ID,
    planPath: path.resolve(repoRoot, value('--plan') || 'artifacts/multica-history/approved-plan.json'),
    journalPath: path.resolve(repoRoot, value('--journal') || 'artifacts/multica-history/journal.json'),
  }
}

function assertSafeText(value, label) {
  const text = String(value || '').trim()
  if (!text) throw new Error(`${label} must not be empty`)
  if (/mention:\/\/|@\w/.test(text)) throw new Error(`${label} contains a mention-like value`)
  return text
}

export function summarize(plan) {
  const criteria = plan.stories.reduce((total, story) => total + story.criteria.length, 0)
  return { projects: plan.projects.length, epics: plan.epics.length, stories: plan.stories.length, criteria, assignments: 0, mentions: 0 }
}

export function validatePlan(plan) {
  if (!Array.isArray(plan.projects) || !Array.isArray(plan.epics) || !Array.isArray(plan.stories)) throw new Error('Plan must contain projects, epics and stories arrays')
  const summary = summarize(plan)
  for (const [key, expected] of Object.entries(EXPECTED)) {
    if (summary[key] !== expected) throw new Error(`Expected ${expected} ${key}; received ${summary[key]}`)
  }
  const ids = new Set()
  const add = (externalId, label) => {
    assertSafeText(externalId, `${label}.externalId`)
    if (ids.has(externalId)) throw new Error(`Duplicate external ID: ${externalId}`)
    ids.add(externalId)
  }
  for (const project of plan.projects) {
    add(project.externalId, 'project')
    assertSafeText(project.title, 'project.title')
    assertSafeText(project.description, 'project.description')
  }
  for (const epic of plan.epics) {
    add(epic.externalId, 'epic')
    assertSafeText(epic.projectExternalId, 'epic.projectExternalId')
    assertSafeText(epic.title, 'epic.title')
    assertSafeText(epic.description, 'epic.description')
  }
  for (const story of plan.stories) {
    add(story.externalId, 'story')
    assertSafeText(story.projectExternalId, 'story.projectExternalId')
    assertSafeText(story.epicExternalId, 'story.epicExternalId')
    assertSafeText(story.title, 'story.title')
    assertSafeText(story.description, 'story.description')
    for (const criterion of story.criteria) {
      add(criterion.externalId, 'criterion')
      assertSafeText(criterion.title, 'criterion.title')
      assertSafeText(criterion.description, 'criterion.description')
    }
  }
  return summary
}

function loadPlan(planPath) {
  if (!fs.existsSync(planPath)) {
    throw new Error(`Approved source plan is missing: ${planPath}. Refusing to infer missing historical records.`)
  }
  const plan = readJson(planPath)
  validatePlan(plan)
  return plan
}

async function runMultica(workspaceId, args) {
  let lastError
  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      return JSON.parse(execFileSync('multica', [...args, '--workspace-id', workspaceId, '--output', 'json'], { cwd: repoRoot, encoding: 'utf8' }))
    } catch (error) {
      lastError = error
      const message = `${error.stdout || ''}\n${error.stderr || ''}`
      if (!/\b429\b|rate limit|too many requests/i.test(message) || attempt === 4) break
      await sleep(500 * 2 ** attempt + Math.floor(Math.random() * 250))
    }
  }
  throw new Error(`Multica call failed: ${args.join(' ')}\n${lastError?.stderr || lastError?.message || ''}`)
}

function rows(response, key) { return Array.isArray(response) ? response : response[key] || [] }
async function findIssue(workspaceId, externalId) {
  const result = await runMultica(workspaceId, ['issue', 'list', '--metadata', `${EXTERNAL_ID_KEY}=${externalId}`, '--limit', '3'])
  const matches = rows(result, 'issues')
  if (matches.length > 1) throw new Error(`Duplicate target records for ${externalId}`)
  return matches[0]
}

function openJournal(journalPath, workspaceId, plan) {
  const planHash = sha256(plan)
  if (!fs.existsSync(journalPath)) return { workspaceId, planHash, completed: {} }
  const journal = readJson(journalPath)
  if (journal.workspaceId !== workspaceId || journal.planHash !== planHash) throw new Error('Journal does not belong to this sandbox and exact source plan')
  return journal
}

async function ensureProject(workspaceId, project) {
  const result = await runMultica(workspaceId, ['project', 'list'])
  const existing = rows(result, 'projects').find((item) => item.title === project.title || item.name === project.title)
  if (existing) return existing.id
  const description = `${assertSafeText(project.description, 'project.description')}\n\nProvenance external ID: ${project.externalId}`
  return (await runMultica(workspaceId, ['project', 'create', '--title', project.title, '--description', description, '--status', 'backlog'])).id
}

async function ensureIssue(workspaceId, journal, journalPath, item) {
  const existing = await findIssue(workspaceId, item.externalId)
  if (existing) return existing.id
  const created = await runMultica(workspaceId, ['issue', 'create', '--title', item.title, '--description', item.description, '--status', 'backlog', '--project', item.projectId, ...(item.parentId ? ['--parent', item.parentId] : [])])
  await runMultica(workspaceId, ['issue', 'metadata', 'set', created.id, '--key', EXTERNAL_ID_KEY, '--value', item.externalId, '--type', 'string'])
  journal.completed[item.externalId] = created.id
  writeJsonAtomic(journalPath, journal)
  return created.id
}

async function applyPlan(workspaceId, plan, journalPath) {
  const journal = openJournal(journalPath, workspaceId, plan)
  const projects = new Map()
  for (const project of plan.projects) projects.set(project.externalId, await ensureProject(workspaceId, project))
  const epics = new Map()
  for (const epic of plan.epics) epics.set(epic.externalId, await ensureIssue(workspaceId, journal, journalPath, { ...epic, projectId: projects.get(epic.projectExternalId) }))
  for (const story of plan.stories) {
    const storyId = await ensureIssue(workspaceId, journal, journalPath, { ...story, projectId: projects.get(story.projectExternalId), parentId: epics.get(story.epicExternalId) })
    for (const criterion of story.criteria) await ensureIssue(workspaceId, journal, journalPath, { ...criterion, projectId: projects.get(story.projectExternalId), parentId: storyId })
  }
}

async function main() {
  const options = parseArguments(process.argv.slice(2))
  if (options.workspaceId !== SANDBOX_WORKSPACE_ID) throw new Error('Only the approved one-time sandbox is permitted')
  const plan = loadPlan(options.planPath)
  const summary = summarize(plan)
  if (!options.apply) return console.log(JSON.stringify({ mode: 'dry-run', workspaceId: options.workspaceId, plan: options.planPath, ...summary }, null, 2))
  if (process.env.MULTICA_HISTORY_APPLY !== '1') throw new Error('Apply requires MULTICA_HISTORY_APPLY=1 and --apply')
  const workspace = await runMultica(options.workspaceId, ['workspace', 'get'])
  if (workspace.id !== SANDBOX_WORKSPACE_ID) throw new Error('Sandbox identity verification failed')
  await applyPlan(options.workspaceId, plan, options.journalPath)
  console.log(JSON.stringify({ mode: 'apply', workspaceId: options.workspaceId, journal: options.journalPath, ...summary }, null, 2))
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main().catch((error) => { console.error(error.message); process.exitCode = 1 })
