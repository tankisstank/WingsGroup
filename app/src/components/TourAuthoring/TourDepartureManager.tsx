'use client'

import { useLocale, useDocumentInfo } from '@payloadcms/ui'
import { useCallback, useEffect, useRef, useState } from 'react'

import { formatAdminDate } from '@/utilities/formatAdminDate'
import {
  buildTourAuthoringDepartureQuery,
  getTourAuthoringFreshness,
  tourAuthoringRelationID,
} from '@/utilities/tourAuthoring'

import { availabilityLabels, TourDepartureForm, type DepartureFormValue } from './TourDepartureForm'

export { TourDepartureForm, type DepartureFormValue } from './TourDepartureForm'

type Departure = Omit<DepartureFormValue, 'originalPrice' | 'priceFrom'> & {
  _status?: string | null
  id: number | string
  originalPrice?: number | null
  priceFrom: number
  updatedAt: string
  verifiedAt?: string | null
}

const blankDeparture = (): DepartureFormValue => ({
  airline: '',
  availabilityStatus: 'open',
  currency: 'VND',
  departureCity: '',
  departureDate: '',
  expiresAt: '',
  originalPrice: '',
  priceFrom: '',
  promoLabel: '',
  promotionEnabled: false,
  verified: false,
})

const freshnessLabel = {
  current: 'Xác minh còn hiệu lực',
  expired: 'Đã hết hạn · public có thể hiển thị Liên hệ tư vấn',
  'needs-verification': 'Cần xác minh',
} as const

const localDateTime = (value?: string | null) => {
  if (!value) return ''
  const date = new Date(value)
  if (!Number.isFinite(date.getTime())) return ''
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16)
}

export default function TourDepartureManager({ onSaved }: { onSaved?: () => void }) {
  const { data, id: productID } = useDocumentInfo()
  const { code: locale } = useLocale()
  const [departures, setDepartures] = useState<Departure[]>([])
  const [form, setForm] = useState<DepartureFormValue | null>(null)
  const [editingID, setEditingID] = useState<number | string | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [saved, setSaved] = useState(false)
  const siteID = tourAuthoringRelationID(data?.site)
  const context = `${productID}:${siteID}:${locale}`
  const currentContext = useRef(context)
  const contextVersion = useRef(0)
  if (currentContext.current !== context) {
    currentContext.current = context
    contextVersion.current += 1
  }
  const generation = contextVersion.current
  const loadVersion = useRef(0)

  const load = useCallback(async (signal?: AbortSignal) => {
    if (productID == null || siteID == null) return
    const version = ++loadVersion.current
    const response = await fetch(`${buildTourAuthoringDepartureQuery(productID, siteID)}&locale=${encodeURIComponent(locale || 'vi')}&fallback-locale=none&draft=true`, {
      credentials: 'include',
      headers: { 'Accept-Language': locale || 'vi' },
      signal,
    })
    if (!response.ok) throw new Error(`Không tải được lịch khởi hành (${response.status}).`)
    const result = await response.json() as { docs?: Departure[] }
    if (!signal?.aborted && contextVersion.current === generation && version === loadVersion.current) {
      setDepartures(result.docs || [])
    }
  }, [generation, locale, productID, siteID])

  useEffect(() => {
    const controller = new AbortController()
    setDepartures([])
    setForm(null)
    setEditingID(null)
    setError('')
    setSaved(false)
    setBusy(false)
    void load(controller.signal).catch((reason: Error) => {
      if (!controller.signal.aborted) setError(reason.message)
    })
    return () => controller.abort()
  }, [load])

  const save = async (value: DepartureFormValue, saveAndNext = false) => {
    if (productID == null || siteID == null || busy) return
    const requestContext = generation
    setBusy(true)
    setSaved(false)
    try {
      const payload = {
        availabilityStatus: value.availabilityStatus,
        currency: value.currency,
        departureCity: value.departureCity || null,
        departureDate: value.departureDate,
        airline: value.airline || null,
        originalPrice: value.promotionEnabled && value.originalPrice ? Number(value.originalPrice) : null,
        priceFrom: Number(value.priceFrom),
        promoLabel: value.promotionEnabled ? value.promoLabel?.trim() || null : null,
        site: siteID,
        tourProduct: productID,
        verifiedAt: value.verified ? new Date().toISOString() : null,
        expiresAt: value.verified ? new Date(value.expiresAt).toISOString() : null,
        _status: 'draft',
      }
      const endpoint = editingID == null ? '/api/tour-departures' : `/api/tour-departures/${encodeURIComponent(String(editingID))}`
      const response = await fetch(`${endpoint}?locale=${encodeURIComponent(locale || 'vi')}&draft=true`, {
        body: JSON.stringify(payload),
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', 'Accept-Language': locale || 'vi' },
        method: editingID == null ? 'POST' : 'PATCH',
      })
      if (!response.ok) {
        const body = await response.json().catch(() => ({})) as { errors?: Array<{ message?: string }>; message?: string }
        if (response.status === 409) throw new Error('Đã có lịch khởi hành trùng inventoryIdentity. Dòng hiện có không bị ghi đè.')
        throw new Error(body.errors?.[0]?.message || body.message || `Không lưu được lịch khởi hành (${response.status}).`)
      }
      if (contextVersion.current !== requestContext) return
      await load()
      if (contextVersion.current !== requestContext) return
      setError('')
      setEditingID(null)
      setForm(saveAndNext ? { ...value, departureDate: '', verified: false, expiresAt: '' } : null)
      setSaved(true)
      onSaved?.()
    } catch (reason) {
      if (contextVersion.current === requestContext) {
        setError(reason instanceof Error ? reason.message : 'Không lưu được lịch khởi hành.')
      }
    } finally {
      if (contextVersion.current === requestContext) setBusy(false)
    }
  }

  const deleteDeparture = async (departureID: number | string) => {
    if (busy || !window.confirm('Xóa lịch khởi hành này? Chỉ quan hệ inventory này bị xóa.')) return
    setBusy(true)
    try {
      const response = await fetch(`/api/tour-departures/${encodeURIComponent(String(departureID))}`, { credentials: 'include', method: 'DELETE' })
      if (!response.ok) throw new Error(response.status === 403 ? 'Bạn không có quyền xóa lịch này.' : `Không xóa được lịch khởi hành (${response.status}).`)
      if (contextVersion.current !== generation) return
      await load()
      if (contextVersion.current !== generation) return
      onSaved?.()
    } catch (reason) {
      if (contextVersion.current === generation) setError(reason instanceof Error ? reason.message : 'Không xóa được lịch khởi hành.')
    } finally {
      if (contextVersion.current === generation) setBusy(false)
    }
  }

  const edit = (departure: Departure) => {
    setEditingID(departure.id)
    setError('')
    setSaved(false)
    setForm({
      airline: departure.airline || '',
      availabilityStatus: departure.availabilityStatus,
      currency: departure.currency,
      departureCity: departure.departureCity || '',
      departureDate: departure.departureDate.slice(0, 10),
      expiresAt: localDateTime(departure.expiresAt),
      originalPrice: departure.originalPrice == null ? '' : String(departure.originalPrice),
      priceFrom: String(departure.priceFrom),
      promoLabel: departure.promoLabel || '',
      promotionEnabled: Boolean(departure.originalPrice || departure.promoLabel),
      verified: getTourAuthoringFreshness(departure) === 'current',
    })
  }

  if (productID == null || productID === 'create') {
    return <section id="tour-departures"><strong>Ngày khởi hành & giá</strong><p>Lưu TourProduct trước khi thêm lịch khởi hành.</p></section>
  }

  return (
    <section aria-label="Quản lý ngày khởi hành" aria-busy={busy} id="tour-departures" style={{ boxSizing: 'border-box', marginTop: '1rem', maxWidth: '100%', minWidth: 0, padding: '1rem', border: '1px solid var(--theme-elevation-150)', borderRadius: 6 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
        <div>
          <h3 style={{ margin: 0 }}>Ngày khởi hành & giá</h3>
          <p style={{ margin: '0.35rem 0', color: 'var(--theme-elevation-600)' }}>Sửa giá và ưu đãi riêng từng đợt ngay tại đây. Lưu lịch tạo bản nháp; chọn lịch trong phần Lịch bay & xuất bản để đưa thay đổi lên website.</p>
        </div>
        <button disabled={busy} type="button" onClick={() => { setEditingID(null); setForm(blankDeparture()); setError(''); setSaved(false) }}>Thêm lịch</button>
      </div>
      {error && <p role="alert" style={{ color: 'var(--theme-error-500)' }}>{error}</p>}
      {saved && <p role="status">Đã lưu bản nháp lịch khởi hành. Hãy chọn lịch và xuất bản để cập nhật website.</p>}
      {form && <TourDepartureForm busy={busy} createActions={editingID == null} initial={form} onCancel={() => { setForm(null); setEditingID(null) }} onSubmit={(value, mode) => save(value, editingID == null && mode === 'next')} />}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', minWidth: 850, marginTop: '0.75rem' }}>
          <thead><tr><th>Ngày</th><th>Điểm đi</th><th>Hãng bay</th><th>Giá</th><th>Giá gốc</th><th>Promotion</th><th>Tiền tệ</th><th>Availability</th><th>Publish</th><th>Freshness</th><th>Thao tác</th></tr></thead>
          <tbody>
            {departures.map((departure) => (
              <tr key={departure.id}>
                <td>{formatAdminDate(departure.departureDate)}</td>
                <td>{departure.departureCity || '—'}</td>
                <td>{departure.airline || '—'}</td>
                <td>{Number(departure.priceFrom).toLocaleString('vi-VN')}</td>
                <td>{departure.originalPrice == null ? '—' : Number(departure.originalPrice).toLocaleString('vi-VN')}</td>
                <td>{departure.promoLabel || '—'}</td>
                <td>{departure.currency}</td>
                <td>{availabilityLabels[departure.availabilityStatus]}</td>
                <td>{departure._status === 'published' ? 'Đã xuất bản' : 'Bản nháp'}</td>
                <td>{freshnessLabel[getTourAuthoringFreshness(departure)]}</td>
                <td>
                  <button disabled={busy} type="button" onClick={() => edit(departure)}>Sửa</button>{' '}
                  <a href={`/admin/collections/tour-departures/${encodeURIComponent(String(departure.id))}?locale=${encodeURIComponent(locale || 'vi')}`}>Mở đầy đủ</a>{' '}
                  <button disabled={busy} type="button" onClick={() => void deleteDeparture(departure.id)}>Xóa</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!departures.length && <p>Chưa có lịch khởi hành.</p>}
      </div>
    </section>
  )
}
