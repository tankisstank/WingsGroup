import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

const require = createRequire(new URL('../app/package.json', import.meta.url))
require('dotenv').config({ path: fileURLToPath(new URL('../app/.env', import.meta.url)), quiet: true })
const base = process.env.PLANE_BASE_URL || 'https://api.plane.so'
const workspace = `/api/v1/workspaces/${process.env.PLANE_WORKSPACE_SLUG}`
assert(process.env.PLANE_API_KEY && process.env.PLANE_WORKSPACE_SLUG, 'Missing Plane credentials')

async function request(method, path, body) {
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const response = await fetch(new URL(path, base), {
      method,
      headers: { 'X-API-Key': process.env.PLANE_API_KEY, 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    })
    if (response.status === 429 && attempt < 3) {
      await new Promise(resolve => setTimeout(resolve, Math.min(Number(response.headers.get('Retry-After') || 10), 60) * 1000))
      continue
    }
    assert(response.ok, `${method} ${path}: HTTP ${response.status}`)
    return response.json()
  }
  throw new Error('Plane retry limit reached')
}

async function list(path) {
  const items = []
  let next = path
  const visited = new Set()
  while (next) {
    assert(!visited.has(next), 'Repeated pagination')
    visited.add(next)
    const page = await request('GET', next)
    items.push(...(Array.isArray(page) ? page : page.results || []))
    next = page.next || (page.next_page_results && page.next_cursor
      ? `${path}?cursor=${encodeURIComponent(page.next_cursor)}` : null)
  }
  return items
}

const project = (await list(`${workspace}/projects/`)).find(item => item.identifier === 'WGO')
assert(project, 'WGO missing')
const path = `${workspace}/projects/${project.id}`
const [all, states, members] = await Promise.all([
  list(`${path}/work-items/`), list(`${path}/states/`), list(`${path}/members/`),
])
const parent = all.find(item => item.external_id === 'story:US-081')
const epic = all.find(item => item.external_id === 'epic-workitem:E07')
assert(parent && epic, 'US081/E07 missing')
const children = all.filter(item => item.parent === parent.id)
assert.equal(children.length, 4)
assert.equal(parent.parent, epic.id)
const items = [parent, ...children]
const baselinePath = new URL('plane-before.json', import.meta.url)
if (process.argv.includes('--snapshot')) {
  await writeFile(baselinePath, JSON.stringify(items.map(({id, name, start_date, target_date}) => ({id, name, start_date, target_date})), null, 2))
  console.log('Captured original dates for US081 and four children')
} else {
  const baseline = JSON.parse(await readFile(baselinePath, 'utf8'))
  if (process.argv.includes('--restore-dates')) {
    for (const item of items) {
      const original = baseline.find(record => record.id === item.id)
      assert(original?.start_date && original?.target_date, 'Missing original dates')
      if (item.start_date !== original.start_date || item.target_date !== original.target_date) {
        Object.assign(item, await request('PATCH', `${path}/work-items/${item.id}/`, {
          start_date: original.start_date, target_date: original.target_date,
        }))
      }
    }
  }
  const ownerRecord = members.find(record => {
    const user = record.member || record.user || record
    return [user.display_name, user.username, user.first_name, user.email]
      .some(value => String(value || '').split('@')[0].toLowerCase() === 'c0508g')
  })
  const owner = (ownerRecord?.member || ownerRecord?.user || ownerRecord)?.id
  assert(owner, 'Owner c0508g missing')
  const idOf = value => typeof value === 'string' ? value : value.id
  if (process.argv.includes('--apply-metadata')) {
    const labels = await list(`${path}/labels/`)
    for (const [name, color] of [['bug', '#EF4444'], ['content', '#22C55E'], ['uat', '#A855F7']]) {
      if (!labels.some(label => label.name.toLowerCase() === name)) {
        labels.push(await request('POST', `${path}/labels/`, { name, color }))
      }
    }
    for (const item of items) {
      const names = item.id === parent.id ? ['bug', 'content']
        : item.name.includes('Bảo toàn') ? ['uat'] : ['bug']
      Object.assign(item, await request('PATCH', `${path}/work-items/${item.id}/`, {
        assignees: [owner],
        labels: names.map(name => labels.find(label => label.name.toLowerCase() === name).id),
      }))
    }
  }
  for (const item of items) {
    assert(item.start_date && item.target_date, 'Missing dates')
    assert(item.name.length < 80 && !/Tiêu chí chấp nhận \d+$/.test(item.name), `Invalid title ${item.name}`)
    assert.deepEqual(item.assignees.map(idOf), [owner], `Wrong owner ${item.name}`)
    assert.equal(states.find(state => state.id === idOf(item.state))?.name, 'Đã bàn giao')
    const original = baseline.find(record => record.id === item.id)
    assert.equal(item.start_date, original.start_date)
    assert.equal(item.target_date, original.target_date)
  }
  console.log(JSON.stringify({ checkedAt:new Date().toISOString(), status:'PASS', project:project.name,
    epic:{id:epic.id,name:epic.name,type:epic.type || epic.type_id}, children:children.length,
    missingDates:0,genericChildNames:0,owner:'c0508g',state:'Đã bàn giao',items:items.map(item => ({id:item.id,name:item.name,parent:item.parent,start_date:item.start_date,target_date:item.target_date})) }, null, 2))
}
