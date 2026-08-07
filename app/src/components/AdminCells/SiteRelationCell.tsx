'use client'

import { useEffect } from 'react'
import type { DefaultCellComponentProps, TypeWithID } from 'payload'
import { useListRelationships } from '@payloadcms/ui'

type SiteValue = TypeWithID & {
  code?: string | null
  name?: string | null
}

const relationTo = 'sites'

export default function SiteRelationCell({ cellData }: DefaultCellComponentProps) {
  const { documents, getRelationships } = useListRelationships()
  const populatedSite =
    cellData && typeof cellData === 'object' && !Array.isArray(cellData)
      ? (cellData as SiteValue)
      : undefined
  const siteID =
    typeof cellData === 'number' || typeof cellData === 'string' ? cellData : populatedSite?.id

  useEffect(() => {
    if (siteID === undefined || siteID === null || populatedSite) return

    getRelationships([{ relationTo, value: siteID }])
  }, [getRelationships, populatedSite, siteID])

  const resolvedSite =
    siteID === undefined || siteID === null ? undefined : documents[relationTo]?.[siteID]
  const site =
    populatedSite ||
    (resolvedSite && typeof resolvedSite === 'object' ? (resolvedSite as SiteValue) : undefined)

  if (site?.name) {
    return <span title={site.code || undefined}>{site.name}</span>
  }

  if (siteID !== undefined && siteID !== null) {
    return <span>Site #{siteID}</span>
  }

  return <span>Không có Site</span>
}
