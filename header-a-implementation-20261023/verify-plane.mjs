import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

const appPackage = new URL('../app/package.json', import.meta.url)
const requireFromApp = createRequire(appPackage)
requireFromApp('dotenv').config({
  path: fileURLToPath(new URL('../app/.env', import.meta.url)),
  quiet: true,
})

const baseURL = (process.env.PLANE_BASE_URL || 'https://api.plane.so').replace(/\/$/, '')
const workspace = process.env.PLANE_WORKSPACE_SLUG
const apiKey = process.env.PLANE_API_KEY
if (!workspace || !apiKey) {
  throw new Error('Missing Plane credentials; values are not printed.')
}
const workspacePath = `/api/v1/workspaces/${workspace}`
const applyMetadata = process.argv.includes('--apply-metadata')

async function request(method, pathname, body) {
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const response = await fetch(new URL(pathname, baseURL), {
      method,
      headers: {
        'X-API-Key': apiKey,
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    })
    if (response.status === 429 && attempt < 3) {
      const waitSeconds = Math.min(Number(response.headers.get('Retry-After') || 10), 60)
      await new Promise((resolve) => setTimeout(resolve, waitSeconds * 1000))
      continue
    }
    if (!response.ok) {
      throw new Error(`${method} ${pathname}: HTTP ${response.status}`)
    }
    return response.status === 204 ? null : response.json()
  }
  throw new Error('Plane retry limit reached.')
}

async function list(pathname) {
  const items = []
  let nextPath = pathname
  const visited = new Set()
  while (nextPath) {
    if (visited.has(nextPath)) {
      throw new Error('Plane pagination repeated a page.')
    }
    visited.add(nextPath)
    const payload = await request('GET', nextPath)
    items.push(...(Array.isArray(payload) ? payload : payload.results || []))
    if (payload.next) {
      nextPath = payload.next
    } else if (payload.next_page_results && payload.next_cursor) {
      const nextURL = new URL(pathname, baseURL)
      nextURL.searchParams.set('cursor', payload.next_cursor)
      nextPath = nextURL.href
    } else {
      nextPath = null
    }
  }
  return items
}

const projects = await list(`${workspacePath}/projects/`)
const project = projects.find((candidate) => candidate.identifier === 'WGCORE')
if (!project) {
  throw new Error('WGCORE project not found.')
}
const projectPath = `${workspacePath}/projects/${project.id}`
const [workItems, states, members, labels] = await Promise.all([
  list(`${projectPath}/work-items/`),
  list(`${projectPath}/states/`),
  list(`${projectPath}/members/`),
  list(`${projectPath}/labels/`),
])
const parent = workItems.find((item) => item.external_id === 'story:US-085')
const epic = workItems.find((item) => item.external_id === 'epic-workitem:E09')
if (!parent || !epic) {
  throw new Error('US-085 or E09 Epic work item missing.')
}
const children = workItems.filter((item) => item.parent === parent.id)
if (children.length !== 4) {
  throw new Error(`Expected four US-085 children, found ${children.length}.`)
}
const ownerRecord = members.find((member) => {
  const account = member.member || member.user || member
  return [account.display_name, account.username, account.first_name, account.email]
    .some((value) => String(value || '').split('@')[0].toLowerCase() === 'c0508g')
})
const ownerID = (ownerRecord?.member || ownerRecord?.user || ownerRecord)?.id
if (!ownerID) {
  throw new Error('Default owner c0508g not found in WGCORE members.')
}

if (applyMetadata) {
  const labelColors = {
    bug: '#EF4444',
    feature: '#3B82F6',
    content: '#22C55E',
    uat: '#A855F7',
  }
  for (const [name, color] of Object.entries(labelColors)) {
    if (!labels.some((label) => label.name.toLowerCase() === name)) {
      labels.push(await request('POST', `${projectPath}/labels/`, { name, color }))
    }
  }
  for (const item of [parent, ...children]) {
    let names = ['bug', 'feature', 'content']
    if (item !== parent) {
      names = item.name.includes('Kiểm chứng') ? ['uat']
        : item.name.includes('hotline') ? ['content']
          : item.name.includes('header') ? ['bug', 'feature'] : ['feature']
    }
    const labelIDs = names.map((name) => labels.find((label) => label.name.toLowerCase() === name).id)
    const updated = await request('PATCH', `${projectPath}/work-items/${item.id}/`, {
      assignees: [ownerID],
      labels: labelIDs,
    })
    Object.assign(item, updated)
  }
}

const items = await Promise.all([parent, ...children].map((item) =>
  request('GET', `${projectPath}/work-items/${item.id}/`),
))
const stateNames = new Map(states.map((state) => [state.id, state.name]))
const idOf = (value) => typeof value === 'string' ? value : value.id
const issues = []
for (const item of items) {
  if (!item.start_date || !item.target_date) issues.push(`Missing dates: ${item.name}`)
  if (item.name.length >= 80) issues.push(`Title too long: ${item.name}`)
  if (/Tiêu chí chấp nhận \d+$/u.test(item.name)) issues.push(`Generic child: ${item.name}`)
  if ((item.assignees || []).length !== 1 || idOf(item.assignees[0]) !== ownerID) {
    issues.push(`Incorrect owner: ${item.name}`)
  }
}
if (items[0].parent !== epic.id) issues.push('US-085 is not a child of E09.')
if (stateNames.get(idOf(items[0].state)) !== 'Chờ xác nhận') issues.push('Incorrect US-085 state.')
if (String(items[0].start_date).slice(0, 10) !== '2026-10-23') issues.push('Incorrect start date.')
if (String(items[0].target_date).slice(0, 10) !== '2026-10-26') issues.push('Incorrect review target.')
const report = {
  timestamp: new Date().toISOString(),
  status: issues.length ? 'FAIL' : 'PASS',
  project: project.name,
  epic: { name: epic.name, id: epic.id, type: epic.type || epic.type_id || null },
  missingDates: items.filter((item) => !item.start_date || !item.target_date).length,
  genericChildNames: children.filter((item) => /Tiêu chí chấp nhận \d+$/u.test(item.name)).length,
  verifiedChildren: children.length,
  expectedOwner: 'c0508g',
  items: items.map((item) => ({
    id: item.id,
    name: item.name,
    parent: item.parent,
    state: stateNames.get(idOf(item.state)),
    start_date: item.start_date,
    target_date: item.target_date,
    assigneeCount: item.assignees?.length || 0,
    labels: (item.labels || []).map((label) => labels.find((candidate) => candidate.id === idOf(label))?.name),
  })),
  issues,
}
console.log(JSON.stringify(report, null, 2))
if (issues.length) process.exitCode = 1
