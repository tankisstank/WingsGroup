'use client'

import { FieldError, FieldLabel, useAuth, useDocumentInfo, useField } from '@payloadcms/ui'
import { useEffect, useMemo, useState } from 'react'

import {
  getTourAuthoringSiteState,
  tourAuthoringRelationID,
  type TourAuthoringSite,
} from '@/utilities/tourAuthoring'

type UserSite = number | string | { id?: number | string | null }
type SiteUser = { role?: string; sites?: UserSite[] }
type Props = {
  field?: { label?: string; required?: boolean }
  path: string
  readOnly?: boolean
}

export default function TourProductSiteField({ field, path, readOnly }: Props) {
  const { user } = useAuth<SiteUser>()
  const { data, isEditing } = useDocumentInfo()
  const { errorMessage, setValue, showError, value } = useField<number | string | null>({ path })
  const [sites, setSites] = useState<TourAuthoringSite[]>([])
  const currentSite = data?.site as TourAuthoringSite | number | string | undefined
  const userSiteIDs = useMemo(
    () => (user?.sites || []).map((site) => tourAuthoringRelationID(site)).filter((site): site is number | string => site !== undefined),
    [user?.sites],
  )
  const state = getTourAuthoringSiteState({
    currentSite: value ?? currentSite,
    isNew: !isEditing,
    userSiteIDs,
  })
  const currentSiteID = tourAuthoringRelationID(value ?? currentSite)
  const isSuperAdmin = user?.role === 'super-admin'

  useEffect(() => {
    if (!isEditing && currentSiteID === undefined && userSiteIDs.length === 1) setValue(userSiteIDs[0])
  }, [currentSiteID, isEditing, setValue, userSiteIDs])

  useEffect(() => {
    let cancelled = false
    void fetch('/api/sites?depth=0&limit=100&sort=name', { credentials: 'include' })
      .then((response) => (response.ok ? response.json() : { docs: [] }))
      .then((result: { docs?: TourAuthoringSite[] }) => {
        if (!cancelled) setSites(result.docs || [])
      })
      .catch(() => undefined)
    return () => {
      cancelled = true
    }
  }, [])

  const visibleSites = isSuperAdmin ? sites : sites.filter((site) => userSiteIDs.some((id) => String(id) === String(site.id)))
  const selected = sites.find((site) => String(site.id) === String(currentSiteID)) ||
    (typeof currentSite === 'object' ? currentSite : undefined)
  const label = field?.label || 'Site'

  return (
    <div>
      <FieldLabel label={label} path={path} required={field?.required} />
      {!isEditing && state.kind === 'choose' && !readOnly ? (
        <select
          aria-label={label}
          onChange={(event) => {
            const selectedSite = sites.find((site) => String(site.id) === event.target.value)
            setValue(selectedSite?.id ?? (event.target.value || null))
          }}
          value={currentSiteID == null ? '' : String(currentSiteID)}
        >
          <option value="">Chọn site cho tour mới</option>
          {visibleSites.map((site) => <option key={site.id} value={site.id}>{site.name || site.code || `Site ${site.id}`}</option>)}
        </select>
      ) : (
        <output aria-label={`${label} đã cố định`} style={{ display: 'block', padding: '0.65rem 0.75rem', border: '1px solid var(--theme-elevation-150)', borderRadius: 4 }}>
          {selected?.name || selected?.code || (currentSiteID == null ? state.kind === 'none' ? state.message : 'Đang chọn site…' : `Site #${currentSiteID}`)}
        </output>
      )}
      <p style={{ margin: '0.35rem 0 0', color: 'var(--theme-elevation-600)', fontSize: '0.8rem' }}>
        {isEditing ? 'Site của tour hiện hữu không thể đổi trong màn hình này.' : state.kind === 'fixed' ? 'Site được cố định theo quyền tài khoản.' : 'Chọn rõ site trước khi nhập nội dung tour.'}
      </p>
      <FieldError message={errorMessage} path={path} showError={showError} />
    </div>
  )
}
