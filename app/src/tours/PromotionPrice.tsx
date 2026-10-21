import { formatTourPrice } from './utils'

export const isDisplayablePromoLabel = (value: unknown): value is string => {
  if (typeof value !== 'string') return false
  const label = value.trim()
  return Boolean(label) && !/^\d[\d\s.,-]*$/.test(label)
}

export function PromotionBadge({ label }: { label?: null | string }) {
  if (!isDisplayablePromoLabel(label)) return null

  return (
    <span className="inline-flex max-w-full w-fit truncate rounded-full bg-gradient-to-r from-orange-500 to-amber-500 px-3 py-1 text-xs font-bold text-white shadow-md">
      {label.trim()}
    </span>
  )
}

export function PromotionPrice({
  currency,
  contactLabel = 'Liên hệ',
  originalPrice,
  price,
}: {
  currency?: null | string
  contactLabel?: string
  originalPrice?: null | number
  price?: null | number
}) {
  const salePrice = Number.isFinite(price) && Number(price) > 0 ? Number(price) : 0
  const saleLabel = formatTourPrice(salePrice, currency)
  const originalLabel = formatTourPrice(originalPrice, currency)
  const hasDiscount = Boolean(saleLabel && originalLabel && Number(originalPrice) > salePrice)

  return (
    <span className="inline-flex flex-wrap items-baseline gap-x-2 gap-y-1">
      {hasDiscount ? (
        <del className="text-sm font-normal text-muted-foreground">{originalLabel}</del>
      ) : null}
      <span className={hasDiscount ? 'font-extrabold text-red-600 dark:text-red-400' : undefined}>
        {saleLabel || contactLabel}
      </span>
    </span>
  )
}
