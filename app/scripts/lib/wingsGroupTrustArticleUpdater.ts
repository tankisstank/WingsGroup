import type { Post } from '../../src/payload-types'
import {
  getWingsGroupTrustArticleLocalizedUpdate,
  WINGSGROUP_TRUST_ARTICLE_SLUG,
} from '../../src/utilities/wingsGroupEditorial'

export const WINGSGROUP_TRUST_UPDATE_CONFIRMATION =
  'CONFIRM_UPDATE_WINGSGROUP_TRUST_ARTICLE_VI_EN' as const

export type WingsGroupTrustUpdateMode = 'apply' | 'dry-run'
export type WingsGroupTrustLocale = 'en' | 'vi'

type UnknownRecord = Record<string, unknown>

export type WingsGroupTrustUpdaterPayload = {
  find: (args: unknown) => Promise<{ docs: UnknownRecord[] }>
  update: (args: unknown) => Promise<unknown>
}

export type WingsGroupTrustUpdateArgs = {
  confirm?: string
  mode: WingsGroupTrustUpdateMode
}

export type WingsGroupTrustUpdatePlanItem = {
  action: 'noop' | 'update'
  changedFields: string[]
  id: number | string
  locale: WingsGroupTrustLocale
}

export type WingsGroupTrustUpdateReport = {
  applied: Array<{ id: number | string; locale: WingsGroupTrustLocale }>
  mode: WingsGroupTrustUpdateMode
  plan: WingsGroupTrustUpdatePlanItem[]
  siteCode: 'wings-group'
  slug: typeof WINGSGROUP_TRUST_ARTICLE_SLUG
}

const asRecord = (value: unknown): UnknownRecord =>
  value && typeof value === 'object' && !Array.isArray(value) ? (value as UnknownRecord) : {}

const relationID = (value: unknown): number | string | null => {
  if (typeof value === 'number' || typeof value === 'string') return value
  const id = asRecord(value).id
  return typeof id === 'number' || typeof id === 'string' ? id : null
}

const canonicalize = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(canonicalize)
  if (!value || typeof value !== 'object') return value
  return Object.fromEntries(
    Object.entries(value as UnknownRecord)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, child]) => [key, canonicalize(child)]),
  )
}

const sameValue = (left: unknown, right: unknown): boolean =>
  JSON.stringify(canonicalize(left)) === JSON.stringify(canonicalize(right))

const argumentValue = (argv: string[], name: string): string | undefined => {
  const inline = argv.find((argument) => argument.startsWith(`${name}=`))
  if (inline) return inline.slice(name.length + 1)
  const index = argv.indexOf(name)
  return index >= 0 ? argv[index + 1] : undefined
}

export const parseWingsGroupTrustUpdateArgs = (argv: string[]): WingsGroupTrustUpdateArgs => {
  const apply = argv.includes('--apply')
  const dryRun = argv.includes('--dry-run')
  if (apply && dryRun) throw new Error('Choose only one of --apply or --dry-run.')

  const args: WingsGroupTrustUpdateArgs = {
    confirm: argumentValue(argv, '--confirm'),
    mode: apply ? 'apply' : 'dry-run',
  }

  if (args.mode === 'apply' && args.confirm !== WINGSGROUP_TRUST_UPDATE_CONFIRMATION) {
    throw new Error(
      `Apply requires --confirm ${WINGSGROUP_TRUST_UPDATE_CONFIRMATION}. Run dry-run first and retain its report.`,
    )
  }

  return args
}

const changedFields = (record: UnknownRecord, target: ReturnType<typeof updateData>) => {
  const currentMeta = asRecord(record.meta)
  const targetMeta = asRecord(target.meta)
  const fields: string[] = []
  if (!sameValue(record.title, target.title)) fields.push('title')
  if (!sameValue(record.content, target.content)) fields.push('content')
  for (const key of ['breadcrumbLabel', 'description', 'title'] as const) {
    if (!sameValue(currentMeta[key], targetMeta[key])) fields.push(`meta.${key}`)
  }
  return fields
}

const updateData = (record: UnknownRecord, locale: WingsGroupTrustLocale): Partial<Post> => {
  const approved = getWingsGroupTrustArticleLocalizedUpdate(locale)
  return {
    content: approved.content,
    meta: {
      ...asRecord(record.meta),
      ...approved.meta,
    } as Post['meta'],
    title: approved.title,
  }
}

const resolveSingleSite = async (payload: WingsGroupTrustUpdaterPayload) => {
  const result = await payload.find({
    collection: 'sites',
    depth: 0,
    limit: 2,
    overrideAccess: true,
    pagination: false,
    where: {
      and: [{ code: { equals: 'wings-group' } }, { isActive: { equals: true } }],
    },
  })
  if (result.docs.length !== 1 || relationID(result.docs[0]?.id) === null) {
    throw new Error(`Expected exactly one active wings-group site; found ${result.docs.length}.`)
  }
  return result.docs[0]
}

const resolvePublishedPost = async ({
  locale,
  payload,
  siteID,
}: {
  locale: WingsGroupTrustLocale
  payload: WingsGroupTrustUpdaterPayload
  siteID: number | string
}) => {
  const result = await payload.find({
    collection: 'posts',
    depth: 0,
    fallbackLocale: false,
    limit: 2,
    locale,
    overrideAccess: true,
    pagination: false,
    where: {
      and: [
        { site: { equals: siteID } },
        { slug: { equals: WINGSGROUP_TRUST_ARTICLE_SLUG } },
        { _status: { equals: 'published' } },
      ],
    },
  })

  if (result.docs.length !== 1) {
    throw new Error(
      `Expected exactly one published ${locale} WingsGroup trust post; found ${result.docs.length}.`,
    )
  }
  const record = result.docs[0]
  const id = relationID(record?.id)
  if (id === null || String(relationID(record?.site)) !== String(siteID)) {
    throw new Error(`Resolved ${locale} trust post is not safely bound to the WingsGroup site.`)
  }
  return { id, record }
}

export const runWingsGroupTrustArticleUpdate = async ({
  args,
  payload,
}: {
  args: WingsGroupTrustUpdateArgs
  payload: WingsGroupTrustUpdaterPayload
}): Promise<WingsGroupTrustUpdateReport> => {
  if (args.mode === 'apply' && args.confirm !== WINGSGROUP_TRUST_UPDATE_CONFIRMATION) {
    throw new Error('Apply confirmation is missing or invalid.')
  }

  const site = await resolveSingleSite(payload)
  const siteID = relationID(site.id)!
  const records = await Promise.all(
    (['vi', 'en'] as const).map(async (locale) => ({
      locale,
      ...(await resolvePublishedPost({ locale, payload, siteID })),
    })),
  )
  if (new Set(records.map(({ id }) => String(id))).size !== 1) {
    throw new Error('VI and EN trust copy must resolve to the same localized Post record.')
  }

  const prepared = records.map(({ id, locale, record }) => {
    const data = updateData(record, locale)
    const fields = changedFields(record, data)
    return {
      data,
      plan: {
        action: fields.length ? ('update' as const) : ('noop' as const),
        changedFields: fields,
        id,
        locale,
      },
    }
  })

  const applied: WingsGroupTrustUpdateReport['applied'] = []
  if (args.mode === 'apply') {
    for (const item of prepared) {
      if (item.plan.action === 'noop') continue
      await payload.update({
        collection: 'posts',
        data: item.data,
        draft: false,
        id: item.plan.id,
        locale: item.plan.locale,
        overrideAccess: true,
      })
      applied.push({ id: item.plan.id, locale: item.plan.locale })
    }
  }

  return {
    applied,
    mode: args.mode,
    plan: prepared.map(({ plan }) => plan),
    siteCode: 'wings-group',
    slug: WINGSGROUP_TRUST_ARTICLE_SLUG,
  }
}
