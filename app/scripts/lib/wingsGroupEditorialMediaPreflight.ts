import { WINGSGROUP_TRUST_ARTICLE_SLUG } from '../../src/utilities/wingsGroupEditorial'

export type WingsGroupEditorialPreflightRoute = {
  kind: 'archive' | 'article'
  locale: 'en' | 'vi'
  path: string
}

export type WingsGroupEditorialMediaPreflightResult = {
  checkedAssets: Array<{
    contentType: string
    url: string
  }>
  origin: string
  routes: Array<{
    editorialImages: string[]
    ogImages: string[]
    path: string
  }>
}

export const WINGSGROUP_EDITORIAL_PREFLIGHT_ROUTES: readonly WingsGroupEditorialPreflightRoute[] = [
  { kind: 'archive', locale: 'vi', path: '/tin-tuc' },
  { kind: 'archive', locale: 'en', path: '/en/tin-tuc' },
  {
    kind: 'article',
    locale: 'vi',
    path: `/tin-tuc/${WINGSGROUP_TRUST_ARTICLE_SLUG}`,
  },
  {
    kind: 'article',
    locale: 'en',
    path: `/en/tin-tuc/${WINGSGROUP_TRUST_ARTICLE_SLUG}`,
  },
] as const

const decodeHTML = (value: string): string =>
  value
    .replaceAll('&amp;', '&')
    .replaceAll('&quot;', '"')
    .replaceAll('&#39;', "'")
    .replace(/&#x([0-9a-f]+);/giu, (_match, hex: string) =>
      String.fromCodePoint(Number.parseInt(hex, 16)),
    )
    .replace(/&#([0-9]+);/gu, (_match, decimal: string) =>
      String.fromCodePoint(Number.parseInt(decimal, 10)),
    )

const attribute = (tag: string, name: string): string | null => {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const match = tag.match(
    new RegExp(`(?:^|\\s)${escaped}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, 'iu'),
  )
  return match ? decodeHTML(match[1] ?? match[2] ?? match[3] ?? '') : null
}

const srcSetURLs = (value: string): string[] =>
  value
    .split(',')
    .map((candidate) => candidate.trim().split(/\s+/u)[0] || '')
    .filter(Boolean)

const absoluteHTTPURL = (value: string, origin: string): string | null => {
  if (!value || value.startsWith('data:') || value.startsWith('blob:')) return null
  const url = new URL(value, origin)
  return url.protocol === 'http:' || url.protocol === 'https:' ? url.href : null
}

export const normalizeWingsGroupEditorialPreflightOrigin = (value: string): string => {
  let url: URL
  try {
    url = new URL(value)
  } catch {
    throw new Error('--origin must be an absolute HTTP(S) origin.')
  }
  if (
    !['http:', 'https:'].includes(url.protocol) ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    (url.pathname !== '/' && url.pathname !== '')
  ) {
    throw new Error('--origin must contain only scheme, host, and optional port.')
  }
  return url.origin
}

export const parseWingsGroupEditorialPageMedia = ({
  html,
  origin,
}: {
  html: string
  origin: string
}) => {
  const ogImages = [...html.matchAll(/<meta\b[^>]*>/giu)]
    .filter((match) => attribute(match[0], 'property')?.toLowerCase() === 'og:image')
    .map((match) => absoluteHTTPURL(attribute(match[0], 'content') || '', origin))
    .filter((value): value is string => Boolean(value))

  const editorialImages = [
    ...html.matchAll(
      /<(?:div|figure)\b[^>]*data-wingsgroup-editorial-media=(?:"true"|'true'|true)[^>]*>([\s\S]*?)<\/(?:div|figure)>/giu,
    ),
  ].flatMap((container) =>
    [...container[1].matchAll(/<(?:img|source)\b[^>]*>/giu)].flatMap((match) => {
      const src = attribute(match[0], 'src')
      const srcSet = attribute(match[0], 'srcset')
      return [...(src ? [src] : []), ...(srcSet ? srcSetURLs(srcSet) : [])]
        .map((value) => absoluteHTTPURL(value, origin))
        .filter((value): value is string => Boolean(value))
    }),
  )

  return {
    editorialImages: [...new Set(editorialImages)],
    ogImages: [...new Set(ogImages)],
  }
}

const require200 = async ({
  accept,
  fetchImpl,
  url,
}: {
  accept: string
  fetchImpl: typeof fetch
  url: string
}) => {
  const response = await fetchImpl(url, {
    headers: { accept },
    redirect: 'manual',
  })
  if (response.status !== 200) {
    throw new Error(
      `Anonymous request failed for ${url}: expected HTTP 200, got ${response.status}.`,
    )
  }
  return response
}

export const runWingsGroupEditorialMediaPreflight = async ({
  fetchImpl = fetch,
  origin: configuredOrigin,
  routes = WINGSGROUP_EDITORIAL_PREFLIGHT_ROUTES,
}: {
  fetchImpl?: typeof fetch
  origin: string
  routes?: readonly WingsGroupEditorialPreflightRoute[]
}): Promise<WingsGroupEditorialMediaPreflightResult> => {
  const origin = normalizeWingsGroupEditorialPreflightOrigin(configuredOrigin)
  const routeResults: WingsGroupEditorialMediaPreflightResult['routes'] = []

  for (const route of routes) {
    const pageURL = new URL(route.path, origin).href
    const page = await require200({ accept: 'text/html', fetchImpl, url: pageURL })
    const contentType = page.headers.get('content-type') || ''
    if (!contentType.toLowerCase().startsWith('text/html')) {
      throw new Error(`Expected HTML for ${pageURL}, got ${contentType || 'no content type'}.`)
    }
    const parsed = parseWingsGroupEditorialPageMedia({ html: await page.text(), origin })
    if (!parsed.editorialImages.length) {
      throw new Error(`No governed editorial image URLs were rendered by ${pageURL}.`)
    }
    if (!parsed.ogImages.length) {
      throw new Error(`No og:image URL was rendered by ${pageURL}.`)
    }
    routeResults.push({ path: route.path, ...parsed })
  }

  const assetURLs = [
    ...new Set(
      routeResults.flatMap(({ editorialImages, ogImages }) => [...editorialImages, ...ogImages]),
    ),
  ]
  const checkedAssets: WingsGroupEditorialMediaPreflightResult['checkedAssets'] = []
  for (const url of assetURLs) {
    const response = await require200({ accept: 'image/*', fetchImpl, url })
    const contentType = response.headers.get('content-type') || ''
    if (!contentType.toLowerCase().startsWith('image/')) {
      throw new Error(`Expected image content type for ${url}, got ${contentType || 'none'}.`)
    }
    checkedAssets.push({ contentType, url })
  }

  return { checkedAssets, origin, routes: routeResults }
}
