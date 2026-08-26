/**
 * Narrow updater for the already-published WingsGroup trust article.
 *
 * Default mode is read-only dry-run. Apply is intentionally guarded by an
 * exact confirmation token. This operation never creates or deletes records.
 */
import 'dotenv/config'

import configPromise from '@payload-config'
import { getPayload } from 'payload'

import {
  parseWingsGroupTrustUpdateArgs,
  runWingsGroupTrustArticleUpdate,
  type WingsGroupTrustUpdaterPayload,
} from './lib/wingsGroupTrustArticleUpdater'

const args = parseWingsGroupTrustUpdateArgs(process.argv.slice(2))
const payload = await getPayload({ config: configPromise })
const report = await runWingsGroupTrustArticleUpdate({
  args,
  payload: payload as unknown as WingsGroupTrustUpdaterPayload,
})

console.log(JSON.stringify(report, null, 2))
