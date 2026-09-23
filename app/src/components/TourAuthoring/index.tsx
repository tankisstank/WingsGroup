'use client'

import { useDocumentInfo, useFormModified } from '@payloadcms/ui'
import { useLocale } from '@payloadcms/ui'

import TourDepartureManager from './TourDepartureManager'
import TourAuthoringReadiness from './TourAuthoringReadiness'
import { tourAuthoringRelationID, tourAuthoringSiteCode } from '@/utilities/tourAuthoring'

export { default as TourDepartureManager } from './TourDepartureManager'
export * from './types'

export default function TourProductAuthoring() {
  const { data } = useDocumentInfo()
  const { code: locale } = useLocale()
  const formModified = useFormModified()
  const site = data?.site as { code?: string; name?: string; id?: number | string } | number | string | undefined
  const siteCode = tourAuthoringSiteCode(site)
  const siteID = tourAuthoringRelationID(site)

  return <section aria-label="Tour authoring" style={{ boxSizing: 'border-box', display: 'grid', gap: '0.75rem', marginBottom: '1rem', maxWidth: '100%', minWidth: 0 }}>
    <div style={{ padding: '0.9rem 1rem', border: '1px solid var(--theme-elevation-150)', borderRadius: 6 }}>
      <strong>Luồng tạo tour</strong>
      <p style={{ margin: '0.35rem 0' }}>Site: <b>{typeof site === 'object' ? site.name || site.code || `#${siteID || 'chưa chọn'}` : siteID ? `#${siteID}` : 'chưa chọn'}</b> · Ngôn ngữ: <b>{locale || 'vi'}</b></p>
      <p style={{ margin: 0, color: 'var(--theme-elevation-600)' }}>{siteCode === 'wings-go' ? 'WingsGo: phân loại WingSide được ẩn; dữ liệu tourType cũ vẫn được giữ.' : siteCode === 'wing-side' ? 'WingSide: hiển thị phân loại tour WingSide.' : 'Các trường tour dùng nhãn nghiệp vụ trung tính cho site chưa xác định.'}</p>
      {formModified && <p role="status" style={{ margin: '0.5rem 0 0' }}>Form TourProduct đang có thay đổi chưa lưu. Lưu tour trước khi dùng Preview hoặc readiness server.</p>}
    </div>
    <TourDepartureManager />
    <TourAuthoringReadiness />
  </section>
}
