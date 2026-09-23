import type { Where, WidgetServerProps } from 'payload'
import React from 'react'

import type { RequestState } from '@/components/AdminMetrics/contract'
import { adminMetricDescriptors } from '@/components/AdminMetrics/contract'
import type {
  DashboardMetricResult,
  DashboardRecentDoc,
  DashboardSiteDoc,
  DashboardSubmissionDoc,
} from '@/components/AdminDashboard/WingsGroupMetricsClient'
import { WingsGroupMetricsClient } from '@/components/AdminDashboard/WingsGroupMetricsClient'
import type { AppUser } from '@/types/auth'
import { getUserSiteIDs, isSuperAdmin } from '@/access/roles'
import { getAdminSiteContextID } from '@/utilities/adminSiteContext'

import './index.scss'

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

const isID = (value: unknown): value is number | string =>
  (typeof value === 'number' && Number.isFinite(value)) ||
  (typeof value === 'string' && value.length > 0)

const isOptionalString = (value: unknown): value is null | string | undefined =>
  value === null || value === undefined || typeof value === 'string'

const isOptionalDateString = (value: unknown): value is null | string | undefined =>
  value === null ||
  value === undefined ||
  (typeof value === 'string' && Number.isFinite(Date.parse(value)))

const isRecentDoc = (value: unknown): value is DashboardRecentDoc =>
  isRecord(value) &&
  isID(value.id) &&
  isOptionalString(value.title) &&
  isOptionalDateString(value.updatedAt)

const isSiteDoc = (value: unknown): value is DashboardSiteDoc =>
  isRecord(value) && isID(value.id) && isOptionalString(value.name)

const isSubmissionDoc = (value: unknown): value is DashboardSubmissionDoc => {
  if (!isRecord(value) || !isID(value.id) || !isOptionalDateString(value.createdAt)) {
    return false
  }

  const { form } = value

  return (
    form === null ||
    form === undefined ||
    isID(form) ||
    (isRecord(form) && isOptionalString(form.title))
  )
}

const parseCollection = <T,>(
  value: unknown,
  isDocument: (document: unknown) => document is T,
): RequestState<T[]> => {
  if (!isRecord(value) || !Array.isArray(value.docs) || !value.docs.every(isDocument)) {
    return { state: 'unavailable' }
  }

  if (value.docs.length === 0) {
    return { state: 'empty' }
  }

  return { state: 'ready', value: value.docs }
}

const parseCount = (value: unknown): RequestState<number> => {
  if (
    !isRecord(value) ||
    typeof value.totalDocs !== 'number' ||
    !Number.isInteger(value.totalDocs) ||
    value.totalDocs < 0
  ) {
    return { state: 'unavailable' }
  }

  return { state: 'ready', value: value.totalDocs }
}

const errorStatus = (error: unknown): number | undefined => {
  if (!isRecord(error)) {
    return undefined
  }

  if (typeof error.status === 'number') {
    return error.status
  }

  if (typeof error.statusCode === 'number') {
    return error.statusCode
  }

  if (isRecord(error.response) && typeof error.response.status === 'number') {
    return error.response.status
  }

  return undefined
}

const safeResult = async <T,>(
  request: () => Promise<unknown>,
  parse: (value: unknown) => RequestState<T>,
): Promise<RequestState<T>> => {
  try {
    return parse(await request())
  } catch (error) {
    const status = errorStatus(error)

    return status === 401 || status === 403 ? { state: 'no-access' } : { state: 'error' }
  }
}

const getSitesWhere = (user: AppUser) => {
  if (isSuperAdmin(user)) {
    return undefined
  }

  const siteIDs = getUserSiteIDs(user)

  return {
    id: {
      in: siteIDs,
    },
  }
}

const getSiteContextID = (url: string | undefined): string => {
  if (!url) return ''

  try {
    return getAdminSiteContextID(new URL(url, 'http://wingsgroup-admin.local').search)
  } catch {
    return ''
  }
}

const withSiteWhere = (where: Where | undefined, siteID: string): Where | undefined => {
  if (!siteID) return where
  return where ? { and: [where, { site: { equals: siteID } }] } : { site: { equals: siteID } }
}

export async function WingsGroupMetrics({ req }: WidgetServerProps) {
  const user = req.user as AppUser | undefined

  if (!user) {
    return null
  }

  const siteContextID = getSiteContextID(req.url)

  const siteResultPromise = safeResult(
    () =>
      req.payload.find({
        collection: 'sites',
        depth: 0,
        limit: 20,
        overrideAccess: false,
        req,
        sort: 'name',
        where: getSitesWhere(user),
      }),
    (value) => parseCollection(value, isSiteDoc),
  )

  const metricResultPromises = adminMetricDescriptors.map(
    async (descriptor): Promise<DashboardMetricResult> => ({
      ...descriptor,
      result: await safeResult(
        () =>
          req.payload.count({
            collection: descriptor.payloadCollection,
            overrideAccess: false,
            req,
            where: withSiteWhere(descriptor.payloadFilter, siteContextID),
          }),
        parseCount,
      ),
    }),
  )

  const recentPagesPromise = safeResult(
    () =>
      req.payload.find({
        collection: 'pages',
        depth: 0,
        limit: 4,
        overrideAccess: false,
        req,
        sort: '-updatedAt',
        where: siteContextID ? { site: { equals: siteContextID } } : undefined,
      }),
    (value) => parseCollection(value, isRecentDoc),
  )
  const recentPostsPromise = safeResult(
    () =>
      req.payload.find({
        collection: 'posts',
        depth: 0,
        limit: 4,
        overrideAccess: false,
        req,
        sort: '-updatedAt',
        where: siteContextID ? { site: { equals: siteContextID } } : undefined,
      }),
    (value) => parseCollection(value, isRecentDoc),
  )
  const recentSubmissionsPromise = safeResult(
    () =>
      req.payload.find({
        collection: 'form-submissions',
        depth: 1,
        limit: 4,
        overrideAccess: false,
        req,
        sort: '-createdAt',
        where: siteContextID ? { site: { equals: siteContextID } } : undefined,
      }),
    (value) => parseCollection(value, isSubmissionDoc),
  )

  const [sites, counts, recentPages, recentPosts, recentSubmissions] = await Promise.all([
    siteResultPromise,
    Promise.all(metricResultPromises),
    recentPagesPromise,
    recentPostsPromise,
    recentSubmissionsPromise,
  ])

  return (
    <WingsGroupMetricsClient
      initialState={{ counts, recentPages, recentPosts, recentSubmissions, siteContextID, sites }}
      role={user.role}
    />
  )
}
