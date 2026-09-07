import type { TaskConfig } from 'payload'

import { createSMTPDelivery } from './delivery'
import type { LeadDeliveryMessage } from './types'
import { runWingsGroupLeadRetentionBatch } from './retention'
import { incrementMetric, logOperationalEvent } from '@/observability'

type LeadNotificationTask = {
  input: LeadDeliveryMessage
  output: { delivered: boolean }
}

export const sendLeadNotificationTask: TaskConfig<LeadNotificationTask> = {
  slug: 'sendLeadNotification',
  label: 'Send lead notification',
  inputSchema: [
    { name: 'submissionId', type: 'text', required: true },
    { name: 'siteCode', type: 'text', required: true },
    { name: 'formTitle', type: 'text', required: true },
    {
      name: 'fields',
      type: 'array',
      required: true,
      fields: [
        { name: 'label', type: 'text', required: true },
        { name: 'value', type: 'textarea', required: true },
      ],
    },
  ],
  outputSchema: [{ name: 'delivered', type: 'checkbox', required: true }],
  retries: {
    attempts: 3,
    backoff: {
      delay: 1000,
      type: 'exponential',
    },
  },
  handler: async ({ input, req }) => {
    await createSMTPDelivery()(input)
    // This update is intentionally part of the task attempt. If it fails after
    // SMTP accepts the message, Payload retries; the deterministic Message-ID
    // lets capable relays and inboxes collapse a duplicate.
    await req.payload.update({
      collection: 'form-submissions',
      id: input.submissionId,
      data: {
        deliveryErrorCode: null,
        deliveryStatus: 'delivered',
        deliveryUpdatedAt: new Date().toISOString(),
      },
      overrideAccess: true,
      req,
    })
    return { output: { delivered: true } }
  },
  onFail: async ({ input, req }) => {
    const metadata = input as Partial<LeadDeliveryMessage> | undefined
    if (metadata?.submissionId) {
      await req.payload
        .update({
          collection: 'form-submissions',
          id: metadata.submissionId,
          data: {
            deliveryErrorCode: 'delivery_failed',
            deliveryStatus: 'delivery_failed',
            deliveryUpdatedAt: new Date().toISOString(),
          },
          overrideAccess: true,
          req,
        })
        .catch(() => undefined)
    }
    req.payload.logger.error({
      msg: 'Lead notification entered dead-letter state.',
      siteCode: metadata?.siteCode,
      submissionId: metadata?.submissionId,
    })
    incrementMetric('wingstravel_lead_delivery_failures_total', {
      site: metadata?.siteCode || 'unknown',
    })
    logOperationalEvent('error', 'lead_delivery_dead_lettered', {
      site_code: metadata?.siteCode,
      submission_id: metadata?.submissionId,
    })
  },
}

type ReconcileLeadNotificationTask = {
  input: Record<string, never>
  output: { requeued: number }
}

const relationID = (value: unknown): number | string | null =>
  value && typeof value === 'object' && 'id' in value
    ? (value as { id: number | string }).id
    : typeof value === 'number' || typeof value === 'string'
      ? value
      : null

export const reconcileLeadNotificationTask: TaskConfig<ReconcileLeadNotificationTask> = {
  slug: 'reconcileLeadNotificationQueueFailures',
  label: 'Reconcile lead notification queue failures',
  outputSchema: [{ name: 'requeued', type: 'number', required: true }],
  schedule: [{ cron: '0 */5 * * * *', queue: 'lead-reconciliation' }],
  handler: async ({ req }) => {
    const recoverable = await req.payload.find({
      collection: 'form-submissions',
      depth: 0,
      limit: 50,
      overrideAccess: true,
      pagination: false,
      req,
      sort: 'createdAt',
      where: {
        or: [
          { deliveryStatus: { in: ['queue_failed', 'delivery_failed'] } },
          {
            and: [
              { deliveryStatus: { equals: 'pending' } },
              { createdAt: { less_than: new Date(Date.now() - 2 * 60 * 1000).toISOString() } },
            ],
          },
        ],
      },
    })
    let requeued = 0

    for (const submission of recoverable.docs) {
      try {
        const formID = relationID(submission.form)
        const siteID = relationID(submission.site)
        if (!formID || !siteID) continue

        const [form, site] = await Promise.all([
          req.payload.findByID({
            collection: 'forms',
            id: formID,
            depth: 0,
            overrideAccess: true,
            req,
          }),
          req.payload.findByID({
            collection: 'sites',
            id: siteID,
            depth: 0,
            overrideAccess: true,
            req,
          }),
        ])
        const labels = new Map(
          (form.fields || []).flatMap((field) =>
            'name' in field && typeof field.name === 'string'
              ? [[field.name, field.label || field.name] as const]
              : [],
          ),
        )

        const queue = req.payload.jobs.queue as (args: Record<string, unknown>) => Promise<unknown>
        await queue({
          input: {
            fields: (submission.submissionData || []).map(({ field, value }) => ({
              label: labels.get(field) || field,
              value,
            })),
            formTitle: form.title,
            siteCode: site.code,
            submissionId: String(submission.id),
          },
          overrideAccess: true,
          queue: 'lead-notifications',
          task: 'sendLeadNotification',
        })
        await req.payload.update({
          collection: 'form-submissions',
          id: submission.id,
          data: {
            deliveryErrorCode: null,
            deliveryStatus: 'queued',
            deliveryUpdatedAt: new Date().toISOString(),
          },
          overrideAccess: true,
          req,
        })
        requeued += 1
      } catch {
        // Leave the durable database status in place for the next bounded run.
      }
    }

    if (requeued > 0) {
      incrementMetric('wingstravel_lead_requeued_total', {}, requeued)
      logOperationalEvent('warn', 'lead_delivery_reconciled', { requeued })
    }

    return { output: { requeued } }
  },
}

type PurgeExpiredWingsGroupLeadsTask = {
  input: Record<string, never>
  output: {
    deleted: number
    enabled: boolean
    failed: number
    hasMore: boolean
  }
}

export const purgeExpiredWingsGroupLeadsTask: TaskConfig<PurgeExpiredWingsGroupLeadsTask> = {
  slug: 'purgeExpiredWingsGroupLeads',
  label: 'Purge expired WingsGroup leads',
  outputSchema: [
    { name: 'enabled', type: 'checkbox', required: true },
    { name: 'deleted', type: 'number', required: true },
    { name: 'failed', type: 'number', required: true },
    { name: 'hasMore', type: 'checkbox', required: true },
  ],
  schedule: [{ cron: '0 15 3 * * *', queue: 'lead-retention' }],
  handler: async ({ req }) => ({
    output: await runWingsGroupLeadRetentionBatch({
      enabled: process.env.LEAD_RETENTION_ENABLED === 'true',
      payload: req.payload,
      req,
    }),
  }),
}
