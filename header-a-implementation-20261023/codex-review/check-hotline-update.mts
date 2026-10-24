import type { Payload } from 'payload'
import {
  evaluateHotlineTransition,
  updateWingsGroupHotlineInPayload,
} from '../../app/scripts/updateWingsGroupHotline'

const scenarios = [
  { name: 'new main + intentionally empty additional', main: '0948786775', additional: [] },
  { name: 'old main + intentionally empty additional', main: '0912910101', additional: [] },
  { name: 'old main + custom additional', main: '0912910101', additional: [{ phoneNumber: '0988776655', label: 'Custom' }] },
]
const results = []

for (const scenario of scenarios) {
  const updates: Array<Record<string, unknown>> = []
  const mockPayload = {
    find: async ({ collection }: { collection: string }) => ({
      docs: collection === 'sites'
        ? [{ id: 9, code: 'wings-group' }]
        : [{ id: 20, site: 9, supportPhone: scenario.main, additionalHotlines: scenario.additional }],
    }),
    update: async (options: { data: Record<string, unknown> }) => {
      updates.push(options.data)
      return { id: 20, ...options.data }
    },
    logger: { info: () => undefined },
  } as unknown as Payload
  const result = await updateWingsGroupHotlineInPayload(mockPayload)
  const preservesAdditional = !updates.some((update) => 'additionalHotlines' in update)
  const truthfulNoop = result.status !== 'noop' || updates.length === 0
  results.push({
    scenario: scenario.name,
    preservesAdditional,
    truthfulNoop,
    result,
    updates,
  })
}

const emptyMain = evaluateHotlineTransition('wings-group', null)
const report = {
  timestamp: new Date().toISOString(),
  allAdditionalPreserved: results.every((result) => result.preservesAdditional),
  allNoopsTruthful: results.every((result) => result.truthfulNoop),
  emptyMainIsPreserved: !emptyMain.shouldUpdate,
  results,
  emptyMain,
}
console.log(JSON.stringify(report, null, 2))
if (!report.allAdditionalPreserved || !report.allNoopsTruthful || !report.emptyMainIsPreserved) {
  process.exitCode = 1
}
