import React from 'react'
import type { PreviewCollection } from '../../utilities/previewHandoff'

type Props = {
  collection: PreviewCollection
  hasPublishedVersion: boolean
  locale: string
  mode: 'draft' | 'published'
}

export const PreviewStatusBanner: React.FC<Props> = ({
  collection,
  hasPublishedVersion,
  locale,
  mode,
}) => {
  const isVietnamese = locale === 'vi'
  const isNewDocument = mode === 'draft' && !hasPublishedVersion
  const subject =
    collection === 'tour-products'
      ? isVietnamese
        ? 'Tour'
        : 'tour'
      : collection === 'tour-campaigns'
        ? isVietnamese
          ? 'Campaign'
          : 'campaign'
        : isVietnamese
          ? 'Nội dung'
          : 'content'
  const title = isVietnamese
    ? mode === 'published'
      ? 'Đang xem bản đã xuất bản'
      : isNewDocument
        ? collection === 'tour-products'
          ? 'Tour mới — bản nháp chưa xuất bản'
          : collection === 'tour-campaigns'
            ? 'Campaign mới — bản nháp chưa xuất bản'
            : 'Bản nháp mới — chưa xuất bản'
        : 'Đang xem bản nháp đã lưu'
    : mode === 'published'
      ? 'Viewing the published version'
      : isNewDocument
        ? collection === 'tour-products'
          ? 'New tour — unpublished draft'
          : collection === 'tour-campaigns'
            ? 'New campaign — unpublished draft'
            : 'New draft — unpublished'
        : 'Viewing the saved draft'
  const body = isVietnamese
    ? mode === 'published'
      ? 'Preview này đang hiển thị nội dung public hiện tại.'
      : isNewDocument
        ? `${subject} này chưa có bản xuất bản. Nội dung chỉ hiển thị trong preview được cấp quyền.`
        : 'Các thay đổi đã lưu đang được hiển thị. Bản public vẫn giữ nguyên cho tới khi publish.'
    : mode === 'published'
      ? 'This preview shows the current public content.'
      : isNewDocument
        ? `This ${subject} has no published version. It is visible only in this authorized preview.`
        : 'Saved changes are shown here. The public version remains unchanged until publish.'

  return (
    <aside
      aria-live="polite"
      aria-label={isVietnamese ? 'Trạng thái preview' : 'Preview status'}
      className="mx-auto mb-4 mt-4 flex max-w-5xl items-start gap-3 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950 shadow-sm"
      data-preview-status={isNewDocument ? 'new-draft' : mode}
      role="status"
    >
      <span aria-hidden="true" className="mt-0.5" role="img">
        {mode === 'published' ? '●' : '◆'}
      </span>
      <span>
        <strong className="block font-semibold">{title}</strong>
        <span>{body}</span>
      </span>
    </aside>
  )
}
