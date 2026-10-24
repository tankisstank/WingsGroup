const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const { createRequire } = require('node:module')

const appRequire = createRequire(path.resolve('app/package.json'))
appRequire('dotenv').config({ path: path.resolve('app/.env'), quiet: true })
const baseURL = (process.env.PLANE_BASE_URL || 'https://api.plane.so').replace(/\/$/, '')
const workspace = process.env.PLANE_WORKSPACE_SLUG
assert.ok(workspace && process.env.PLANE_API_KEY, 'Plane configuration required')

async function list(endpoint) {
  const response = await fetch(`${baseURL}${endpoint}`, {
    headers: { 'X-API-Key': process.env.PLANE_API_KEY },
    signal: AbortSignal.timeout(30000),
  })
  assert.equal(response.ok, true, `Plane GET failed: ${response.status}`)
  const body = await response.json()
  const rows = Array.isArray(body) ? body : body.results
  assert.ok(Array.isArray(rows), 'Expected Plane collection')
  assert.ok(!body.next_page_results, 'Paginated response requires explicit continuation')
  return rows
}

async function main() {
  const projects = await list(`/api/v1/workspaces/${workspace}/projects/`)
  const findings = []
  for (const [storyID, identifier, epicKey] of [
    ['US-082', 'WGCORE', 'E09'],
    ['US-083', 'WGO', 'E07'],
  ]) {
    const project = projects.find((item) => item.identifier === identifier)
    assert.ok(project, `Missing project ${identifier}`)
    const items = await list(`/api/v1/workspaces/${workspace}/projects/${project.id}/work-items/`)
    const story = items.find((item) => item.external_id === `story:${storyID}`)
    const epic = items.find((item) => item.external_id === `epic-workitem:${epicKey}`)
    assert.ok(story && epic, `Missing ${storyID} or ${epicKey}`)
    assert.equal(story.parent, epic.id, `${storyID} has wrong Epic parent`)
    const states = await list(`/api/v1/workspaces/${workspace}/projects/${project.id}/states/`)
    const state = states.find((item) => item.id === story.state)
    assert.equal(state?.name, 'Đã bàn giao', `${storyID} delivery state mismatch`)
    const children = items.filter((item) => item.parent === story.id)
    const relevant = [story, ...children]
    assert.ok(relevant.every((item) => item.start_date && item.target_date), 'Missing dates')
    assert.ok(children.every((item) => !/Tiêu chí chấp nhận \d+$/u.test(item.name)), 'Generic child name')
    findings.push({
      storyID,
      project: project.name,
      epic: epic.name,
      parentVerified: true,
      state: state.name,
      start_date: story.start_date,
      target_date: story.target_date,
      children: children.length,
      missingDates: 0,
      genericChildNames: 0,
    })
  }
  const result = { timestamp: new Date().toISOString(), findings }
  fs.writeFileSync(path.join(__dirname, 'plane-verification.json'), JSON.stringify(result, null, 2))
  console.log(JSON.stringify(result, null, 2))
}

main().catch((error) => {
  console.error(error.message)
  process.exitCode = 1
})


