'use client'

import { useField } from '@payloadcms/ui'
import { useEffect, useState } from 'react'

import { normalizeTourAuthoringRelations } from '@/utilities/tourAuthoring'

type Media = {
  alt?: string | null
  filename?: string | null
  id: number | string
  thumbnailURL?: string | null
  url?: string | null
}

type MediaRelationship = Media | false | null

const loadState = (IDs: Array<number | string>, value: MediaRelationship) =>
  Object.fromEntries(IDs.map((id) => [String(id), value])) as Record<string, MediaRelationship>

function TourGalleryFieldContent({ path = 'gallery' }: { path?: string }) {
  const { setValue, value } = useField<unknown[]>({ path })
  const IDs = normalizeTourAuthoringRelations(value)
  const relationshipKey = IDs.join('|')
  const [documents, setDocuments] = useState<Record<string, MediaRelationship>>({})

  useEffect(() => {
    let cancelled = false
    const relationshipIDs = relationshipKey ? relationshipKey.split('|') : []
    if (!relationshipIDs.length) {
      setDocuments({})
      return () => {
        cancelled = true
      }
    }

    setDocuments(loadState(relationshipIDs, null))
    const params = new URLSearchParams({ depth: '0', limit: String(relationshipIDs.length) })
    params.set('where[id][in]', relationshipIDs.join(','))

    void fetch(`/api/media?${params.toString()}`, { credentials: 'include' })
      .then(async (response) => {
        if (!response.ok) throw new Error(`Media request failed: ${response.status}`)
        return response.json() as Promise<{ docs?: Media[] }>
      })
      .then((result) => {
        if (cancelled) return
        const byID = new Map((result.docs || []).map((media) => [String(media.id), media]))
        setDocuments(Object.fromEntries(relationshipIDs.map((id) => [String(id), byID.get(String(id)) || false])))
      })
      .catch(() => {
        if (!cancelled) setDocuments(loadState(relationshipIDs, false))
      })

    return () => {
      cancelled = true
    }
  }, [relationshipKey])

  if (!IDs.length) {
    return <p role="status" style={{ margin: '0.5rem 0', color: 'var(--theme-elevation-600)' }}>Chưa có ảnh gallery · 0 ảnh. Dùng nút thêm ảnh ở trên để chọn từ Media.</p>
  }

  return (
    <div aria-label="Ảnh gallery đã chọn" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '0.75rem', marginTop: '0.75rem' }}>
      {IDs.map((id) => {
        const relation = documents[String(id)]
        const remove = () => setValue(IDs.filter((currentID) => String(currentID) !== String(id)))
        if (relation === null) return <div key={id} role="status" style={{ minHeight: 80, padding: '0.5rem', border: '1px dashed var(--theme-elevation-300)' }}>Đang tải ảnh #{id}…<button aria-label={`Gỡ ảnh #${id}`} type="button" onClick={remove}>Gỡ ảnh</button></div>
        if (relation === false) return <div key={id} role="alert" style={{ minHeight: 80, padding: '0.5rem', border: '1px dashed var(--theme-error-500)' }}>Không thể đọc ảnh #{id}.<button aria-label={`Gỡ ảnh #${id}`} type="button" onClick={remove}>Gỡ ảnh</button></div>
        const media = relation as Media | undefined
        if (!media) return <div key={id} role="status" style={{ minHeight: 80, padding: '0.5rem', border: '1px dashed var(--theme-elevation-300)' }}>Đang tải metadata ảnh #{id}…<button aria-label={`Gỡ ảnh #${id}`} type="button" onClick={remove}>Gỡ ảnh</button></div>
        const label = media.filename || media.alt || `Media #${id}`
        return (
          <article key={id} style={{ display: 'grid', gridTemplateColumns: '80px 1fr', gap: '0.6rem', alignItems: 'center', minWidth: 0 }}>
            {media.url || media.thumbnailURL ? <a href={media.url || media.thumbnailURL || undefined} target="_blank" rel="noreferrer" aria-label={`Mở ảnh ${label}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img alt={media.alt || label} src={media.thumbnailURL || media.url || undefined} style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 4 }} />
            </a> : <div role="img" aria-label={`Thiếu ảnh ${label}`} style={{ width: 80, height: 80, display: 'grid', placeItems: 'center', background: 'var(--theme-elevation-100)', borderRadius: 4 }}>?</div>}
            <div style={{ minWidth: 0 }}><strong style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</strong><small>#{id}</small><button aria-label={`Gỡ ảnh ${label}`} type="button" onClick={remove} style={{ display: 'block', marginTop: '0.35rem' }}>Gỡ ảnh</button></div>
          </article>
        )
      })}
    </div>
  )
}

export default function TourGalleryField(props: { path?: string }) {
  return <TourGalleryFieldContent {...props} />
}
