# Thiết kế Kỹ thuật: US-083 — Hiển thị Discount & Promotion trên Card Tour WingsGo

## 1. Mở rộng DTO & Mapper

### 1.1. Bổ sung `originalPrice` vào DTO Card Tour
Cập nhật `app/src/tours/types.ts` và `app/src/tours/wingsGoCatalog.ts`:

```ts
export interface WingsGoCatalogPriceVerified {
  kind: 'verified'
  value: number
  originalPrice?: number | null
  currency: string
}
```

Trong mapper `toWingsGoCatalogCard` và `toDepartureCardViewModel`:
```ts
const originalPrice =
  departure.originalPrice &&
  departure.priceFrom &&
  departure.originalPrice > departure.priceFrom
    ? departure.originalPrice
    : null
```

## 2. Giao diện Card Tour

### 2.1. Homepage Departure Spotlight (`app/src/tours/WingsGoHomepageSections.tsx`)
1. Bổ sung render badge ưu đãi trên đầu card nếu `departure.promoLabel` tồn tại:
```tsx
{departure.promoLabel ? (
  <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-orange-500 to-amber-500 px-2.5 py-0.5 text-xs font-bold text-white shadow-sm">
    🔥 {departure.promoLabel}
  </span>
) : null}
```
2. Trong phần hiển thị giá:
```tsx
<div>
  <dt className="text-muted-foreground">{isEn ? 'Tour price' : 'Giá tour'}</dt>
  <dd className="flex items-baseline gap-2">
    <span className="text-lg font-bold text-[var(--site-brand)]">
      {formatTourPrice(departure.priceFrom, departure.currency)}
    </span>
    {departure.originalPrice && departure.originalPrice > departure.priceFrom ? (
      <del className="text-xs text-muted-foreground line-through">
        {formatTourPrice(departure.originalPrice, departure.currency)}
      </del>
    ) : null}
  </dd>
</div>
```

### 2.2. Catalog Card (`app/src/tours/WingsGoTourCard.tsx`)
Đồng bộ phần hiển thị giá: nếu `card.price.originalPrice` tồn tại, hiển thị gạch ngang bên cạnh giá bán chính.

## 3. Cache Invalidation Hook (`app/src/collections/Tours/hooks/revalidateTourContent.ts`)
Bổ sung revalidate cho path `/` (Homepage) khi một đợt khởi hành (`TourDepartures`) được thêm/sửa/xóa:
```ts
revalidatePath('/')
revalidatePath('/lich-khoi-hanh')
revalidatePath('/tour')
```
Đồng thời xóa cache key pattern `*wingsgo-curation:*` trong Redis.
