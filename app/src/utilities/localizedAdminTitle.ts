export const ADMIN_SOURCE_LOCALE = 'vi' as const

export type LocalizedAdminTitle = {
  locale: string
  title: string
}

const nativeMissingTitlePattern = /^<[^>]*(?:tiêu đề|tên tour|no title)[^>]*>$/iu

export const isMissingLocalizedTitle = (value: unknown): boolean =>
  typeof value !== 'string' || value.trim().length === 0 || nativeMissingTitlePattern.test(value.trim())

export const formatLocalizedAdminTitle = ({
  fallbackTitle,
  loading = false,
  sourceLocale = ADMIN_SOURCE_LOCALE,
}: {
  fallbackTitle?: LocalizedAdminTitle | null
  loading?: boolean
  sourceLocale?: string
}): string => {
  if (fallbackTitle?.title) {
    return `[Chưa dịch] — ${fallbackTitle.title} (${fallbackTitle.locale || sourceLocale})`
  }

  return loading ? '[Chưa dịch] — Đang tải tiêu đề gốc…' : '[Chưa dịch] — Chưa có tiêu đề'
}
