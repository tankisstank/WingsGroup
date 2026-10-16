'use client'

import type { DefaultCellComponentProps } from 'payload'
import { useConfig, useLocale } from '@payloadcms/ui'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { formatAdminURL } from 'payload/shared'

import {
  formatLocalizedAdminTitle,
  isMissingLocalizedTitle,
  type LocalizedAdminTitle,
} from '@/utilities/localizedAdminTitle'

type TitleCollection = 'pages' | 'posts' | 'tour-products'

type TitleResponse = {
  titles?: Record<string, LocalizedAdminTitle>
}

type Batch = {
  collection: TitleCollection
  ids: Set<string>
  listeners: Map<string, Set<(title: LocalizedAdminTitle | null) => void>>
  locale: string
}

const batches = new Map<string, Batch>()
const cache = new Map<string, LocalizedAdminTitle | null>()

const collectionName = (collectionSlug: string): TitleCollection | null =>
  collectionSlug === 'pages' || collectionSlug === 'posts' || collectionSlug === 'tour-products'
    ? collectionSlug
    : null

const cacheKey = (collection: TitleCollection, id: string, locale: string) =>
  `${collection}:${id}:${locale}`

const flushBatch = async (batchKey: string) => {
  const batch = batches.get(batchKey)
  if (!batch) return
  batches.delete(batchKey)

  const ids = [...batch.ids]
  try {
    const response = await fetch('/api/localization-titles', {
      body: JSON.stringify({ collection: batch.collection, ids, locale: batch.locale }),
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      method: 'POST',
    })
    const body = (await response.json().catch(() => null)) as TitleResponse | null
    const titles = response.ok ? body?.titles || {} : {}

    for (const id of ids) {
      const title = titles[id] || null
      cache.set(cacheKey(batch.collection, id, batch.locale), title)
      batch.listeners.get(id)?.forEach((listener) => listener(title))
    }
  } catch {
    for (const id of ids) {
      batch.listeners.get(id)?.forEach((listener) => listener(null))
    }
  }
}

const subscribeToFallbackTitle = (
  collection: TitleCollection,
  id: string,
  locale: string,
  listener: (title: LocalizedAdminTitle | null) => void,
) => {
  const key = cacheKey(collection, id, locale)
  if (cache.has(key)) {
    listener(cache.get(key) || null)
    return () => undefined
  }

  const batchKey = `${collection}:${locale}`
  const batch = batches.get(batchKey) || {
    collection,
    ids: new Set<string>(),
    listeners: new Map<string, Set<(title: LocalizedAdminTitle | null) => void>>(),
    locale,
  }
  batch.ids.add(id)
  const listeners = batch.listeners.get(id) || new Set<(title: LocalizedAdminTitle | null) => void>()
  listeners.add(listener)
  batch.listeners.set(id, listeners)
  batches.set(batchKey, batch)

  queueMicrotask(() => {
    if (batches.has(batchKey)) void flushBatch(batchKey)
  })

  return () => {
    const current = batches.get(batchKey)
    current?.listeners.get(id)?.delete(listener)
  }
}

export default function LocalizedTitleCell({
  cellData,
  collectionSlug,
  rowData,
}: DefaultCellComponentProps) {
  const { config } = useConfig()
  const { code } = useLocale()
  const currentTitle = typeof cellData === 'string' ? cellData : null
  const missing = isMissingLocalizedTitle(currentTitle)
  const collection = collectionName(collectionSlug)
  const id = rowData?.id === undefined || rowData?.id === null ? null : String(rowData.id)
  const [fallbackTitle, setFallbackTitle] = useState<LocalizedAdminTitle | null>()
  const shouldLoadFallback = missing && Boolean(collection && id)

  useEffect(() => {
    if (!shouldLoadFallback || !collection || !id) return undefined

    return subscribeToFallbackTitle(collection, id, code, setFallbackTitle)
  }, [code, collection, id, shouldLoadFallback])

  const text = !missing
    ? currentTitle || '[Chưa có tiêu đề]'
    : formatLocalizedAdminTitle({
        fallbackTitle,
        loading: shouldLoadFallback && fallbackTitle === undefined,
      })

  const cellProps = {
    className: 'wings-localized-title-cell',
    'data-locale': code,
    'data-missing': missing ? 'true' : 'false',
    title: missing && fallbackTitle ? `Nguồn ${fallbackTitle.locale}` : undefined,
  }

  if (
    (collectionSlug === 'pages' ||
      collectionSlug === 'tour-products' ||
      collectionSlug === 'posts') &&
    id
  ) {
    const labelMap: Record<string, string> = {
      pages: 'trang',
      posts: 'bài viết',
      'tour-products': 'tour',
    }
    const entityLabel = labelMap[collectionSlug] || 'mục'

    return (
      <Link
        {...cellProps}
        aria-label={`Mở chi tiết ${entityLabel}: ${text}`}
        href={formatAdminURL({
          adminRoute: config.routes.admin,
          path: `/collections/${collectionSlug}/${encodeURIComponent(id)}`,
          relative: true,
        })}
      >
        {text}
      </Link>
    )
  }

  return <span {...cellProps}>{text}</span>
}
