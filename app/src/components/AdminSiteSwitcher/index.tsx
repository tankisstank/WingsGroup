'use client'

import { usePathname } from 'next/navigation'
import React, { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { useFormModified } from '@payloadcms/ui'

import {
  getAdminSiteContextID,
  getAdminSiteScopedCollection,
  isAdminSiteContextPath,
} from '@/utilities/adminSiteContext'

import './index.scss'

type SiteOption = {
  code?: string
  id: number | string
  name?: string
}

export default function AdminSiteSwitcher() {
  const pathname = usePathname() || ''
  const collection = getAdminSiteScopedCollection(pathname)
  const isSiteScoped = isAdminSiteContextPath(pathname)
  const formModified = useFormModified()
  const [sites, setSites] = useState<SiteOption[]>([])
  const [selectedSiteID, setSelectedSiteID] = useState('')
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null)

  useEffect(() => {
    const syncPortalTarget = () => {
      const nextTarget = document.querySelector<HTMLElement>('.app-header__actions')
      setPortalTarget((currentTarget) =>
        currentTarget === nextTarget ? currentTarget : nextTarget,
      )
    }

    syncPortalTarget()
    const observer = new MutationObserver(syncPortalTarget)
    observer.observe(document.body, { childList: true, subtree: true })

    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      try {
        const response = await fetch('/api/sites?depth=0&limit=100&sort=name', {
          credentials: 'include',
        })
        if (!response.ok || cancelled) return
        const data = (await response.json()) as { docs?: SiteOption[] }
        if (!cancelled) setSites(data.docs || [])
      } catch {
        // The native collection access rules remain the source of truth when
        // this contextual affordance is unavailable.
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!isSiteScoped) {
      setSelectedSiteID('')
      return
    }

    setSelectedSiteID(getAdminSiteContextID(window.location.search))
  }, [isSiteScoped, pathname])

  const label = useMemo(() => {
    if (!isSiteScoped) return 'Toàn hệ'
    return selectedSiteID ? 'Site đang lọc' : 'Tất cả site được phân quyền'
  }, [isSiteScoped, selectedSiteID])

  const changeSite = (value: string) => {
    if (!isSiteScoped) return

    if (formModified && !window.confirm('Bạn có thay đổi chưa lưu. Chuyển site sẽ bỏ các thay đổi này?')) {
      return
    }

    const url = new URL(window.location.href)
    if (value) {
      url.searchParams.set('site', value)
      if (collection) url.searchParams.set('where[site][equals]', value)
    } else {
      url.searchParams.delete('site')
      url.searchParams.delete('where[site][equals]')
    }
    url.searchParams.delete('page')
    window.location.assign(url.toString())
  }

  const content = (
    <div className="wings-admin-site-switcher" data-site-scope={isSiteScoped ? 'scoped' : 'global'}>
      <label htmlFor="wings-admin-site-switcher-select">Phạm vi site</label>
      <select
        aria-label={label}
        disabled={!isSiteScoped}
        id="wings-admin-site-switcher-select"
        onChange={(event) => changeSite(event.target.value)}
        value={selectedSiteID}
      >
        <option value="">{isSiteScoped ? 'Tất cả site được phân quyền' : 'Toàn hệ'}</option>
        {sites.map((site) => (
          <option key={site.id} value={site.id}>
            {site.name || site.code || `Site ${site.id}`}
          </option>
        ))}
      </select>
    </div>
  )

  return portalTarget ? createPortal(content, portalTarget) : null
}
