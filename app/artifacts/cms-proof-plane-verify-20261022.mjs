import 'dotenv/config'
import assert from 'node:assert/strict'
const base = (process.env.PLANE_BASE_URL || 'https://api.plane.so').replace(/\/$/u, '')
const workspace = process.env.PLANE_WORKSPACE_SLUG
assert(workspace && process.env.PLANE_API_KEY, 'Missing existing Plane configuration')
async function read(pathname, optionalType = false) {
  const response = await fetch(`${base}${pathname}`, {
    headers: { 'X-API-Key': process.env.PLANE_API_KEY },
    redirect: 'error',
  })
  if (optionalType && response.status === 402) return null
  assert(response.ok, `Plane read failed: ${response.status}`)
  return response.json()
}
function rows(body) {
  return Array.isArray(body) ? body : body.results || []
}
const projects = rows(await read(`/api/v1/workspaces/${workspace}/projects/`))
const project = projects.find(item => item.identifier === 'WGO')
assert(project, 'WingsGo project missing')
const prefix = `/api/v1/workspaces/${workspace}/projects/${project.id}`
const workItems = rows(await read(`${prefix}/work-items/?per_page=100`))
const story = workItems.find(item => /^US-083\b/u.test(item.name))
assert(story, 'US-083 missing')
const parentID = typeof story.parent === 'object' ? story.parent?.id : story.parent
const epic = await read(`${prefix}/work-items/${parentID}/`)
assert(/^E07\b/u.test(epic.name), 'Incorrect epic parent')
const typeResponse = await read(`${prefix}/work-item-types/`, true)
const types = typeResponse ? rows(typeResponse) : []
const typeID = typeof epic.type === 'object' ? epic.type?.id : epic.type
const epicType = types.find(item => item.id === typeID)
if (typeResponse) assert(epicType?.name === 'Epic', 'Parent must have Epic type')
const states = rows(await read(`${prefix}/states/`))
const stateID = typeof story.state === 'object' ? story.state?.id : story.state
const state = states.find(item => item.id === stateID)
const children = workItems.filter(item => (typeof item.parent === 'object' ? item.parent?.id : item.parent) === story.id)
assert(story.start_date && story.target_date, 'US dates missing')
assert(children.every(item => item.start_date && item.target_date), 'Child dates missing')
assert(children.every(item => !/^Tiêu chí chấp nhận \d+$/u.test(item.name)), 'Generic child name')
console.log(JSON.stringify({ at: new Date().toISOString(), project: project.name,
  story: story.name, state: state?.name, epic: epic.name, epicType: epicType?.name || 'unavailable: Plane plan HTTP402',
  start_date: story.start_date, target_date: story.target_date,
  childCount: children.length, missingDates: 0, genericChildren: 0, correctEpic: true }))
