# Thiết kế Kỹ thuật: US-082 — Bản địa hóa Hoàn chỉnh WingsGroup English (`/en`)

## 1. Bản địa hóa Archive Block (`app/src/blocks/ArchiveBlock/Component.tsx`)

### Vấn đề hiện tại:
Lệnh `payload.find` không truyền `locale`:
```ts
const fetchedPosts = await payload.find({
  collection: 'posts',
  depth: 1,
  limit,
  ...(where ? { where } : {}),
})
```

### Thiết kế sửa đổi:
1. Lấy locale hiện tại thông qua `const currentLocale = await getCurrentLocale()` hoặc props locale truyền từ page context.
2. Truyền `locale: currentLocale` vào `payload.find`.
3. Bổ sung điều kiện bảo mật:
```ts
const where = await appendSiteWhere({
  and: [
    { _status: { equals: 'published' } },
    ...(flattenedCategories?.length ? [{ categories: { in: flattenedCategories } }] : []),
  ],
})

const fetchedPosts = await payload.find({
  collection: 'posts',
  depth: 1,
  limit,
  locale: currentLocale,
  overrideAccess: false,
  where,
})
```

## 2. Bản địa hóa Form & Lead Capture API

### 2.1. Client Component (`app/src/blocks/Form/Component.tsx`)
1. Sử dụng hook `useSitePublicLocale()` hoặc locale từ props: `const resolvedLocale = locale || 'vi'`.
2. Fetch lead config truyền tham số `locale`:
```ts
const response = await fetch(
  `${getClientSideURL()}/api/lead-submissions?locale=${encodeURIComponent(resolvedLocale)}`,
  {
    cache: 'no-store',
    method: 'GET',
    signal: controller.signal,
  },
)
```
3. Khi submit form POST:
```ts
body: JSON.stringify({
  ...submissionData,
  locale: resolvedLocale,
})
```
4. Reset consent và refetch khi `resolvedLocale` thay đổi.

### 2.2. Route Handler (`app/src/app/(payload)/api/lead-submissions/route.ts`)
1. Trong handler `GET`:
   - Đọc query param `locale = request.nextUrl.searchParams.get('locale') || (await getCurrentLocale())`.
   - Validate locale nằm trong danh sách hỗ trợ: `['vi', 'en']`.
   - Trả về config với `WINGSGROUP_CONSENT_COPY[locale]`.
2. Trong handler `POST`:
   - Đọc `locale` từ payload submit nếu hợp lệ, lưu vào `governance.locale`.
