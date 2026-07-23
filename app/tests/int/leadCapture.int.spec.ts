import config from '@/payload.config'
import { getPayload, type Payload } from 'payload'
import { beforeAll, describe, expect, it } from 'vitest'

let payload: Payload

describe('lead capture security integration', () => {
  beforeAll(async () => {
    const payloadConfig = await config
    payload = await getPayload({ config: payloadConfig })
  })

  it('denies direct anonymous creates to the form-submissions collection', async () => {
    await expect(
      payload.create({
        collection: 'form-submissions',
        data: { deliveryStatus: 'pending', form: 999999, submissionData: [] },
        overrideAccess: false,
      }),
    ).rejects.toThrow()
  })

  it('registers a durable lead-notification task with exponential retries', async () => {
    const task = payload.config.jobs?.tasks?.find(({ slug }) => slug === 'sendLeadNotification')
    expect(task).toBeDefined()
    expect(task?.retries).toMatchObject({ attempts: 3, backoff: { type: 'exponential' } })
  })
})
