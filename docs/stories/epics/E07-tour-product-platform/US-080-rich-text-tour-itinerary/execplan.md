# Kế hoạch Triển khai Chi tiết — US-080: Rich Text Itinerary & Editorial Formatting

## 1. Bối cảnh & Mục tiêu

- **Mục tiêu:** Cung cấp bộ soạn thảo Rich Text tinh gọn (Lexical Editor) trong từng ngày của mảng Lịch trình Tour (`itineraryDays`) trên `TourProducts`.
- **Yêu cầu biên tập:** Editor có thể format in đậm (**08h20**, **12h00**), in nghiêng, gạch chân, danh sách gạch đầu dòng (`UnorderedListFeature`), danh sách số (`OrderedListFeature`), và gắn liên kết an toàn (`LinkFeature`).
- **Nguyên tắc an toàn dữ liệu (Codex Approved P2):** 
  - Giữ nguyên `summary: textarea` (`required: true`) làm teaser và fallback 100% cho mọi locale, tránh rủi ro vỡ dữ liệu của 73 tour (51 WingsGo + 22 WingSide) trên PostgreSQL.
  - Bổ sung trường mới `content: richText` (`required: false`, Additive Schema) hỗ trợ đa ngôn ngữ (`localized: true`).
  - Frontend áp dụng cơ chế Dual-read: Ưu tiên render `content` qua component `<RichText />`, tự động fallback về `summary` kèm `whitespace-pre-line` nếu `content` chưa có.

---

## 2. Kế hoạch Chi tiết Từng Giai đoạn (Phases)

### Giai đoạn 1: Cấu hình Schema CMS & Sinh Type Payload
1. **File mục tiêu:** `app/src/collections/TourProducts.ts`
2. **Nội dung thay đổi:**
   - Trong `itineraryDays.fields`:
     - Giữ nguyên `summary` (textarea, `localized: true`, `required: true`).
     - Bổ sung trường `content`:
       ```ts
       {
         name: 'content',
         label: 'Nội dung chi tiết trong ngày',
         localized: true,
         required: false,
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
             }),
           ],
         }),
         admin: {
           description: 'Hỗ trợ định dạng in đậm mốc giờ, gạch đầu dòng danh sách hoạt động và chèn link an toàn.',
         },
       }
       ```
   - **Ranh giới an toàn (Guardrail):** Tuyệt đối không bật `BlocksFeature`, `UploadFeature`, `HeadingFeature` lặp để tránh nặng UI mảng ngày trong form Admin và tránh rủi ro vỡ layout accordion.
3. **Sinh types & Typecheck:**
   - Chạy `pnpm run generate:types` từ thư mục `app/` để cập nhật `payload-types.ts`.
   - Kiểm tra `pnpm exec tsc --noEmit` đạt 0 lỗi.

---

### Giai đoạn 2: Toàn vẹn Consumer & Frontend Dual-Read Resolver
1. **File mục tiêu:** 
   - `app/src/tours/queries.ts`
   - `app/src/tours/wingsSideTourViewModel.ts`
   - `app/src/tours/StructuredPages.tsx`
2. **Nội dung thay đổi:**
   - Cập nhật `queries.ts`: Bảo toàn trường `content` khi merge `itineraryDays` và variant overrides.
   - Cập nhật `wingsSideTourViewModel.ts`: Map `content: day.content` vào `itineraryDays` view model.
   - Nhập component `<RichText />` từ `@/components/RichText`.
   - Xây dựng hàm helper `renderItineraryContent(day: Record<string, any>)` trong `StructuredPages.tsx`:
     - Ưu tiên render `<RichText />` nếu `day.content?.root?.children` có dữ liệu hợp lệ.
     - Fallback về `<p className="mt-3 text-sm leading-7 text-muted-foreground whitespace-pre-line">{day.summary}</p>` nếu `content` rỗng.
   - Thay thế việc render `day.summary` trực tiếp tại:
     - Nhánh **Consultative Mode (WingSide)** tại dòng ~1920
     - Nhánh **Retail / Timeline Mode (WingsGo)** tại dòng ~2115
3. **Xử lý Teaser khi đóng Accordion:**
   - Khi đóng accordion, tiếp tục sử dụng `day.summary` làm teaser preview ổn định theo từng locale mà không cần tốn chi phí parse AST runtime.

---

### Giai đoạn 3: Kiểm thử Đa tầng & Xác minh Tính cô lập Đa site
1. **Unit tests:**
   - Viết test suite mới `app/tests/unit/tourItineraryRichText.unit.spec.ts`:
     - Kiểm tra schema `TourProducts` chứa trường `content` với editor config chuẩn (`UnorderedListFeature`, `OrderedListFeature`, `LinkFeature`).
     - Kiểm tra resolver dual-read: string fallback vs Lexical node structure.
     - Kiểm tra xử lý chuỗi rỗng, null, malformed JSON state.
     - Kiểm tra link security: ngăn chặn `javascript:`.
2. **Component tests:**
   - Cập nhật `app/tests/component/retailTourItineraryAndServices.component.spec.tsx` và `app/tests/component/wingsSideTourDetail.component.spec.tsx`:
     - Test render mock tour có trường `content` (kiểm tra các thẻ `<strong>`, `<ul>`, `<li>`, `<a>`).
     - Test render mock tour chỉ có `summary` (kiểm tra `whitespace-pre-line`).
3. **Multisite & Cache Revalidation Check:**
   - Xác nhận hook `revalidateTourProduct` trong `TourProducts.ts` tự động revalidate Next.js ISR cho slug tour tương ứng theo đúng tenant (`WingsGo` hoặc `WingSide`).
   - Đảm bảo tour thuộc site WingsGo không render và không rò rỉ dữ liệu sang WingSide và ngược lại.

---

### Giai đoạn 4: Kế hoạch Triển khai Staging / Production & Rollback Plan
1. **Triển khai (Deployment):**
   - Áp dụng migration additive trên SQLite local ➔ Test trên container PostgreSQL staging ➔ Đóng gói triển khai lên Oracle ARM64 production theo `docs/runbooks/oracle-vps-arm64-deployment.md`.
2. **Kế hoạch Rollback (Fail-safe):**
   - Do sử dụng kiến trúc Additive (P2), nếu phát sinh lỗi bất ngờ ở production, chỉ cần tắt cờ render trường `content` trên frontend (fallback 100% về `summary`), website sẽ lập tức trở lại trạng thái text thô hiện tại mà không cần rollback database hay làm gián đoạn dịch vụ.
