import assert from 'node:assert/strict'
import test from 'node:test'
import { validatePlan } from '../../scripts/multica-history-writer.mjs'

const plan = {
  projects: Array.from({ length: 7 }, (_, index) => ({ externalId: `project:${index}`, title: `Project ${index}`, description: 'Historical provenance' })),
  epics: Array.from({ length: 8 }, (_, index) => ({ externalId: `epic:${index}`, projectExternalId: `project:${index % 7}`, title: `Epic ${index}`, description: 'Historical provenance' })),
  stories: Array.from({ length: 57 }, (_, index) => ({
    externalId: `story:${index}`, projectExternalId: `project:${index % 7}`, epicExternalId: `epic:${index % 8}`,
    title: `Story ${index}`, description: 'Historical provenance',
    criteria: Array.from({ length: index < 18 ? 4 : 3 }, (_, criterion) => ({ externalId: `criterion:${index}:${criterion}`, title: 'Criterion', description: 'Historical provenance' })),
  })),
}

test('accepts exactly the approved historical inventory', () => {
  assert.deepEqual(validatePlan(plan), { projects: 7, epics: 8, stories: 57, criteria: 189, assignments: 0, mentions: 0 })
})

test('refuses a plan that contains a mention', () => {
  const invalid = structuredClone(plan)
  invalid.stories[0].title = '@agent unsafe'
  assert.throws(() => validatePlan(invalid), /mention-like/)
})
