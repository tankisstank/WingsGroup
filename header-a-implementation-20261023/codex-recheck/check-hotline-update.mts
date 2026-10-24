import assert from 'node:assert/strict'
import type { Payload } from 'payload'
import { updateWingsGroupHotlineInPayload } from '../../app/scripts/updateWingsGroupHotline'

const scenarios = [
  { name: 'new main, empty additional', main: '0948786775', additional: [], writes: 0 },
  { name: 'old main, empty additional', main: '0912910101', additional: [], writes: 1 },
  { name: 'old main, null additional', main: '0912910101', additional: null, writes: 1 },
  { name: 'old main, custom additional', main: '0912910101', additional: [{ phoneNumber: '0988776655', label: 'Custom' }], writes: 1 },
  { name: 'cleared main', main: null, additional: [], writes: 0 },
  { name: 'empty main', main: '', additional: [], writes: 0 },
  { name: 'custom main', main: '0988776655', additional: [], writes: 0 },
]
const results = []

for (const scenario of scenarios) {
  const writes: Array<Record<string, unknown>> = []
  const finds: Array<Record<string, unknown>> = []
  const payload = {
    find: async (options: Record<string, unknown>) => {
      finds.push(options)
      return { docs: options.collection === 'sites'
        ? [{ id: 9, code: 'wings-group' }]
        : [{ id: 20, site: 9, supportPhone: scenario.main, additionalHotlines: scenario.additional }] }
    },
    update: async (options: Record<string, unknown>) => {
      writes.push(options)
      return { id: 20, ...(options.data as object) }
    },
    logger: { info: () => undefined },
  } as unknown as Payload
  let status: string
  try {
    status = (await updateWingsGroupHotlineInPayload(payload)).status
  } catch (error) {
    if (scenario.writes !== 0 || scenario.main === '0948786775') throw error
    status = 'safe-abort'
  }
  assert.deepEqual(finds[0].where, { code: { equals: 'wings-group' } })
  assert.deepEqual(finds[1].where, { site: { equals: 9 } })
  assert.equal(writes.length, scenario.writes, scenario.name)
  for (const write of writes) {
    assert.equal(write.id, 20)
    assert.equal(write.collection, 'site-settings')
    assert.deepEqual(write.data, { supportPhone: '0948786775' })
    assert.deepEqual(write.context, { seed: true })
  }
  results.push({ name: scenario.name, status, writes: writes.length, passed: true })
}

console.log(JSON.stringify({ timestamp: new Date().toISOString(), passed: true, results }, null, 2))
