'use client'

import { useDocumentEvents, useDocumentInfo, useField, useFormModified } from '@payloadcms/ui'
import { useLocale } from '@payloadcms/ui'
import { useState } from 'react'

import TourDepartureManager from './TourDepartureManager'
import TourAuthoringReadiness from './TourAuthoringReadiness'
import { useTourPreviewRefresh } from './useTourPreviewRefresh'
import { tourAuthoringRelationID, tourAuthoringSiteCode } from '@/utilities/tourAuthoring'

export { default as TourDepartureManager } from './TourDepartureManager'
export * from './types'

export default function TourProductAuthoring() {
  const [departureRevision, setDepartureRevision] = useState(0)
  const { reportUpdate } = useDocumentEvents()
  const { data } = useDocumentInfo()
  const { code: locale } = useLocale()
  const refreshPreview = useTourPreviewRefresh(data?.id, locale)
  const formModified = useFormModified()
  const { value: draftSlug } = useField<string>({ path: 'slug' })
  const site = data?.site as { code?: string; name?: string; id?: number | string } | number | string | undefined
  const siteCode = tourAuthoringSiteCode(site)
  const siteID = tourAuthoringRelationID(site)
  const savedSlug = typeof data?.slug === 'string' ? data.slug : null
  const currentWrapperPath = data?.wrapperPage && typeof data.wrapperPage === 'object' && 'pathname' in data.wrapperPage
    ? (data.wrapperPage as { pathname?: unknown }).pathname
    : null
  const slugChanged = formModified && typeof draftSlug === 'string' && draftSlug.trim() && savedSlug && draftSlug !== savedSlug

  return <section aria-label="Tour authoring" className="tour-authoring-workspace" id="tour-authoring">
    <div className="tour-authoring-context">
      <div>
        <span className="tour-authoring-context__eyebrow">QUẢN TRỊ TOUR</span>
        <strong>Luồng tạo, kiểm tra và xuất bản</strong>
        <p>Thực hiện lần lượt các bước bên dưới. Trạng thái và lỗi kỹ thuật sẽ hiển thị ngay trong khu vực Lịch bay & xuất bản.</p>
      </div>
      <div className="tour-authoring-context__meta">
        <span>Site: <b>{typeof site === 'object' ? site.name || site.code || `#${siteID || 'chưa chọn'}` : siteID ? `#${siteID}` : 'chưa chọn'}</b></span>
        <span>Ngôn ngữ: <b>{locale || 'vi'}</b></span>
      </div>
      <p className="tour-authoring-context__site-note">{siteCode === 'wings-go' ? 'WingsGo: trường phân loại WingSide được ẩn; dữ liệu cũ vẫn được giữ.' : siteCode === 'wing-side' ? 'WingSide: trường phân loại tour được hiển thị.' : 'Chọn site trước khi nhập nội dung để xác định website và quyền xuất bản.'}</p>
      {!siteID && <p className="tour-authoring-context__warning" role="alert">Chưa chọn site. Hãy chọn site tại trường Site trước khi lưu tour.</p>}
      {formModified && <p className="tour-authoring-context__warning" role="status">Có thay đổi chưa lưu. Lưu TourProduct trước khi dùng Preview, tạo wrapper hoặc kiểm tra readiness.</p>}
      {slugChanged && <p className="tour-authoring-context__warning" role="alert">Slug đang đổi từ <b>/tour/{savedSlug}</b> thành <b>/tour/{draftSlug}</b>. Wrapper hiện tại {typeof currentWrapperPath === 'string' ? <b>{currentWrapperPath}</b> : 'chưa có'} không tự đổi pathname. Lưu tour, sau đó tạo/gán wrapper đúng đường dẫn.</p>}
    </div>
    <TourDepartureManager onSaved={() => {
      setDepartureRevision((revision) => revision + 1)
      if (data?.id != null) {
        // Refresh the owning tour preview, including after a departure is deleted.
        reportUpdate({
          doc: { ...data, id: data.id },
          entitySlug: 'tour-products',
          id: data.id,
          operation: 'update',
          updatedAt: new Date().toISOString(),
        })
        refreshPreview()
      }
    }} />
    <TourAuthoringReadiness departureRevision={departureRevision} />
  </section>
}
