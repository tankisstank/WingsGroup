import 'dotenv/config'

import fs from 'node:fs/promises'
import path from 'node:path'

import { createLocalReq, getPayload } from 'payload'

import config from '../src/payload.config'
import { parseArgs } from './lib/doicanhviet'

type CreatedRecord = {
  status: string
  sourceId: string
  productId?: number | string
  createdPageId?: number | string | null
  departureIds?: Array<number | string>
  mediaIds?: Array<number | string>
}

type ImportResult = {
  dryRun: boolean
  siteCode: string
  siteId: number | string
  batchId: string
  report: CreatedRecord[]
}

const context = { disableRevalidate: true, import: true, rollback: true }

const main = async () => {
  const args = parseArgs(process.argv.slice(2))
  const resultPath = path.resolve(String(args.file || ''))
  if (!args.file) throw new Error('Missing --file <import-result.json>')
  const result = JSON.parse(await fs.readFile(resultPath, 'utf8')) as ImportResult
  const expectedBatch = String(args['batch-id'] || '')
  if (!expectedBatch || expectedBatch !== result.batchId) {
    throw new Error('--batch-id must exactly match the import result batchId')
  }
  if (result.dryRun) throw new Error('Cannot rollback a dry-run report')

  const apply = Boolean(args.apply)
  const created = result.report.filter((item) => item.status === 'created' && item.productId)
  if (!created.length) throw new Error('No created records found in import result')
  if (!apply) {
    console.log(
      JSON.stringify(
        {
          apply: false,
          batchId: result.batchId,
          siteCode: result.siteCode,
          tours: created.map((item) => ({
            sourceId: item.sourceId,
            productId: item.productId,
            departures: item.departureIds?.length || 0,
            page: item.createdPageId || null,
            media: item.mediaIds?.length || 0,
          })),
        },
        null,
        2,
      ),
    )
    return
  }

  const adminEmail = String(args['admin-email'] || process.env.IMPORT_ADMIN_EMAIL || '').trim()
  if (!adminEmail) throw new Error('Missing --admin-email or IMPORT_ADMIN_EMAIL')
  const payload = await getPayload({ config })
  try {
    const users = await payload.find({
      collection: 'users',
      depth: 0,
      limit: 1,
      overrideAccess: true,
      where: { email: { equals: adminEmail } },
    })
    const user = users.docs[0] as any
    if (!user || user.role !== 'super-admin') throw new Error('Rollback requires a super-admin')
    const req = await createLocalReq({ user }, payload)

    for (const item of created) {
      const product = (await payload.findByID({
        collection: 'tour-products',
        id: item.productId!,
        depth: 0,
        overrideAccess: true,
        req,
      })) as any
      if (String(product.site) !== String(result.siteId))
        throw new Error(`Site mismatch: ${item.sourceId}`)
      if (product.sourceProvenance?.importBatchId !== result.batchId) {
        throw new Error(`Batch provenance mismatch: ${item.sourceId}`)
      }
    }

    for (const item of [...created].reverse()) {
      for (const id of [...(item.departureIds || [])].reverse()) {
        await payload.delete({
          collection: 'tour-departures',
          id,
          context,
          overrideAccess: true,
          req,
        })
      }
      await payload.delete({
        collection: 'tour-products',
        id: item.productId!,
        context,
        overrideAccess: true,
        req,
      })
      if (item.createdPageId) {
        await payload.delete({
          collection: 'pages',
          id: item.createdPageId,
          context,
          overrideAccess: true,
          req,
        })
      }
      for (const id of [...(item.mediaIds || [])].reverse()) {
        await payload.delete({ collection: 'media', id, context, overrideAccess: true, req })
      }
    }
    console.log(
      JSON.stringify(
        { apply: true, batchId: result.batchId, deletedTours: created.length },
        null,
        2,
      ),
    )
  } finally {
    await payload.destroy()
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
