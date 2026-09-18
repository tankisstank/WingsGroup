'use client'

import { useDocumentInfo, useFormModified, useLocale } from '@payloadcms/ui'
import { useCallback, useEffect, useState } from 'react'

import type { TourAuthoringAction, TourAuthoringReadiness } from './types'

const copy = {
  actionBlocked: 'Lưu thay đổi TourProduct trước khi thực hiện / Save TourProduct changes before acting.',
  actionFailed: 'Không thực hiện được thao tác / Action failed.',
  departure: 'Lịch khởi hành / Departure',
  loadFailed: 'Không tải được readiness. Kiểm tra site và quyền truy cập rồi thử lại / Readiness could not load. Check site and permissions, then retry.',
  loading: 'Đang tải readiness / Loading readiness…',
  noWrapper: 'Chưa có wrapper / No wrapper',
  provision: 'Provision wrapper / Tạo wrapper',
  publish: 'Publish wrapper / Xuất bản wrapper',
  readiness: 'Readiness xuất bản / Publish readiness',
  reload: 'Tải lại / Reload',
  revisionConflict: 'Phiên bản đã thay đổi. Hãy tải lại rồi thử lại / Revision changed. Reload and try again.',
  status: 'Trạng thái / Status',
  wrapperPath: 'Đường dẫn wrapper / Wrapper path',
} as const

const getErrorBody = async (response: Response) => response.json().catch(() => ({})) as Promise<{ code?: string; message?: string }>

export default function TourAuthoringReadiness() {
  const { id } = useDocumentInfo()
  const { code: locale } = useLocale()
  const formModified = useFormModified()
  const [readiness, setReadiness] = useState<TourAuthoringReadiness | null>(null)
  const [selectedDepartureIDs, setSelectedDepartureIDs] = useState<Set<string>>(() => new Set())
  const [error, setError] = useState('')
  const [hidden, setHidden] = useState(false)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<TourAuthoringAction | null>(null)
  const [reloadToken, setReloadToken] = useState(0)

  const load = useCallback(async () => {
    if (id == null || id === 'create') return
    setLoading(true)
    setError('')
    setHidden(false)
    const response = await fetch(`/api/tour-authoring/${encodeURIComponent(String(id))}?locale=${encodeURIComponent(locale || 'vi')}`, { credentials: 'include' })
    const body = await getErrorBody(response)
    if (!response.ok) {
      if (response.status === 404 && body.code === 'not_wingsgo') {
        setHidden(true)
        setLoading(false)
        return
      }
      throw new Error(body.message || copy.loadFailed)
    }
    setReadiness(body as unknown as TourAuthoringReadiness)
    setLoading(false)
  }, [id, locale])

  useEffect(() => {
    if (id == null || id === 'create') {
      setLoading(false)
      return
    }
    void load().catch((reason: Error) => {
      setLoading(false)
      setError(reason.message || copy.loadFailed)
    })
  }, [id, load, reloadToken])

  const action = async (actionName: TourAuthoringAction) => {
    if (!readiness || formModified || busy) return
    const departureIDs = readiness.departures.filter(({ id: departureID }) => selectedDepartureIDs.has(String(departureID))).map(({ id: departureID }) => departureID)
    if (actionName === 'publish' && departureIDs.length === 0) return
    if (actionName === 'publish' && !window.confirm(`Xuất bản ${departureIDs.length} lịch khởi hành đã chọn? / Publish ${departureIDs.length} selected departure(s)?`)) return
    setBusy(actionName)
    setError('')
    try {
      const response = await fetch(`/api/tour-authoring/${encodeURIComponent(String(id))}`, {
        body: JSON.stringify({ action: actionName, departureIDs, locale: locale || 'vi', revision: readiness.revision }),
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      })
      const body = await getErrorBody(response)
      if (!response.ok) {
        setError(response.status === 409 ? copy.revisionConflict : body.message || copy.actionFailed)
        return
      }
      setReadiness(body as unknown as TourAuthoringReadiness)
    } catch {
      setError(copy.actionFailed)
    } finally {
      setBusy(null)
    }
  }

  if (id == null || id === 'create' || hidden) return null
  if (loading) return <section aria-label={copy.readiness}><p>{copy.loading}</p></section>
  if (error && !readiness) return <section aria-label={copy.readiness}><p role="alert">{error}</p><button type="button" onClick={() => setReloadToken((value) => value + 1)}>{copy.reload}</button></section>
  if (!readiness) return null
  const selectedDepartureCount = readiness.departures.filter(({ id }) => selectedDepartureIDs.has(String(id))).length

  return <section aria-label={copy.readiness} style={{ display: 'grid', gap: '0.6rem', padding: '0.9rem 1rem', border: '1px solid var(--theme-elevation-150)', borderRadius: 6 }}>
    <strong>{copy.readiness}</strong>
    <div><span>{copy.wrapperPath}: </span><b>{readiness.wrapper?.path || copy.noWrapper}</b> · <span>{copy.status}: </span><b>{readiness.wrapper?.status || '—'}</b></div>
    {readiness.issues.length > 0 && <ul>{readiness.issues.map((issue) => <li key={`${issue.code}-${issue.message}`}><b>{issue.severity}</b>: {issue.message}</li>)}</ul>}
    <fieldset disabled={busy !== null} style={{ display: 'grid', gap: '0.35rem', border: 0, padding: 0 }}>
      <legend>{copy.departure}</legend>
      {readiness.departures.map((departure) => <label key={departure.id}><input aria-label={`${copy.departure} #${departure.id}`} checked={selectedDepartureIDs.has(String(departure.id))} onChange={() => setSelectedDepartureIDs((current) => { const next = new Set(current); const key = String(departure.id); if (next.has(key)) next.delete(key); else next.add(key); return next })} type="checkbox" /> #{departure.id} · {departure.status || '—'}</label>)}
      {!readiness.departures.length && <span>Không có lịch khởi hành / No departures.</span>}
    </fieldset>
    {formModified && <p role="status">{copy.actionBlocked}</p>}
    {error && <p role="alert">{error}</p>}
    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
      <button disabled={formModified || busy !== null} type="button" onClick={() => void action('provision')}>{busy === 'provision' ? `${copy.provision}…` : copy.provision}</button>
      <button disabled={formModified || busy !== null || !readiness.canPublish || selectedDepartureCount === 0} type="button" onClick={() => void action('publish')}>{busy === 'publish' ? `${copy.publish}…` : copy.publish}</button>
    </div>
  </section>
}
