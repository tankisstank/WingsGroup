# Thiết kế Kỹ thuật — US-080: Rich Text Itinerary & Editorial Formatting

## 1. Kiến trúc Schema (Payload CMS 3)

### Cập nhật `TourProducts.ts` (`itineraryDays` array fields)
Trong `app/src/collections/TourProducts.ts`, trong mảng `itineraryDays.fields`:
- **Giữ nguyên `summary` (Pha 1 an toàn):**
  ```ts
  {
    name: 'summary',
    label: 'Mô tả tóm tắt (Teaser / Fallback)',
    localized: true,
    required: true, // Giữ required để đảm bảo tính hợp lệ theo từng locale và làm teaser chuẩn
    type: 'textarea',
  }
  ```
- **Bổ sung trường `content` (Additive field):**
  ```ts
  {
    name: 'content',
    label: 'Nội dung chi tiết lịch trình',
    localized: true,
    required: false, // Optional additive field, không ép chuyển đổi dữ liệu cũ
    type: 'richText',
    editor: lexicalEditor({
      features: ({ defaultFeatures }) => [
        ParagraphFeature(),
        BoldFeature(),
        ItalicFeature(),
        UnderlineFeature(),
        UnorderedListFeature(),
        OrderedListFeature(),
        LinkFeature({
          enabledCollections: ['pages', 'posts'],
          // Không bật internal relation tới tour-products khi chưa có resolver chuyên biệt
        }),
      ],
    }),
    admin: {
      description: 'Hỗ trợ định dạng in đậm mốc giờ, gạch đầu dòng danh sách hoạt động và chèn link an toàn.',
    },
  }
  ```
- **Ranh giới an toàn (Guardrail):** Tuyệt đối không bật `BlocksFeature`, `UploadFeature`, `HeadingFeature` cấp cao trong mảng `itineraryDays`.

---

## 2. Toàn vẹn Consumer & Mapper (Audit kết luận P2 từ Codex)

### A. Hàm Merge Variant Overrides (`app/src/tours/queries.ts`)
Khi một tour có biến thể khởi hành (`variant`), hàm resolve cần bảo toàn trường `content`:
```ts
if (index >= 0) {
  itineraryDays[index] = {
    ...itineraryDays[index],
    ...Object.fromEntries(
      Object.entries(override).filter(
        ([, value]) => value !== null && value !== undefined && value !== '',
      ),
    ),
  }
}
```
Đảm bảo nếu override có `contentOverride` hoặc giữ nguyên `content` của base day thì không bị mất hoặc bị ghi đè bởi empty string.

### B. View Model WingSide (`app/src/tours/wingsSideTourViewModel.ts`)
Bổ sung `content: day.content` vào `itineraryDays` mapping để mọi consumer qua WingSide view model đều tiếp nhận được dữ liệu Rich Text.

---

## 3. Kiến trúc Frontend Resolver & Dual-Read Component

### Component Dual-Read Helper (`renderItineraryDayContent`)
Trong `app/src/tours/StructuredPages.tsx`:
```tsx
const renderItineraryContent = (day: Record<string, any>) => {
  // 1. Kiểm tra nếu có Lexical Content hợp lệ
  const hasRichText =
    day.content &&
    typeof day.content === 'object' &&
    Array.isArray(day.content.root?.children) &&
    day.content.root.children.length > 0

  if (hasRichText) {
    return (
      <div className="mt-3 text-sm leading-7 text-muted-foreground prose prose-sm max-w-none [&_p]:my-2 [&_ul]:my-2 [&_li]:my-0.5">
        <RichText data={day.content} enableGutter={false} />
      </div>
    )
  }

  // 2. Fallback về summary văn bản thô kèm whitespace-pre-line
  if (isUsableText(day.summary)) {
    return (
      <p className="mt-3 text-sm leading-7 text-muted-foreground whitespace-pre-line">
        {day.summary}
      </p>
    )
  }

  return null
}
```

### An toàn Liên kết (Link Security):
Component `<RichText />` áp dụng bộ lọc liên kết an toàn: chỉ cho phép các giao thức `http:`, `https:`, `mailto:`, `tel:` và đường dẫn tương đối `/...`. Ngăn chặn hoàn toàn `javascript:`.

---

## 4. Quản lý Cache & Revalidation

- Hook `revalidateTourProduct` tiếp tục kích hoạt revalidation Next.js paths (`/tour/${slug}`, `/tour`, trang chủ) theo đúng locale và tenant site.
- Tách bạch rõ: Dự án hiện tại quản lý revalidate cache tầng Next.js ISR; nếu sau này kích hoạt thêm bộ nhớ đệm Redis cho tour detail API, key cache sẽ được đặt tên phân lập theo định dạng `tour:${site}:${slug}:${locale}`.
