# Codex Consultation Gate — Đánh giá Kiến trúc & Kế hoạch Hỗ trợ Tiếng Anh Toàn diện cho WingsGroup News (/tin-tuc & /en/tin-tuc)

- **Ngày:** 2026-10-16
- **Chủ đề:** Hỗ trợ đầy đủ tiếng Anh (English) cho phân hệ Tin tức WingsGroup (`/tin-tuc` và `/en/tin-tuc`)
- **Đối tượng:** Tham vấn Codex Agent độc lập theo `AGENTS.md` (Điểm chốt kế hoạch & Pre-implementation Review)

---

## 1. Bối cảnh & Hiện trạng Kỹ thuật

Người dùng yêu cầu kiểm tra xem trang `https://wingsgroup.vn/tin-tuc` hiện tại có đang bị "fix cứng" tiếng Việt hay không, và cần thực hiện những gì để hỗ trợ đầy đủ tiếng Anh (English).

### 1.1. Hiện trạng thực tế trên Production DB (PostgreSQL) và mã nguồn
- **Cơ sở dữ liệu (Database):**
  - Collection `posts` trong Payload CMS (`app/src/collections/Posts/index.ts`) đã bật `localized: true` trên các trường nội dung cốt lõi: `title`, `content` (Rich Text Lexical), `meta` (title, description, image, breadcrumbLabel).
  - Kiểm tra bảng `posts_locales` trên PostgreSQL production: **Toàn bộ 11 bài viết của site wings-group (ID 57 - 67) đều đã có đầy đủ bản dịch tiếng Anh (`_locale = 'en'`)**.
- **Trang bài viết chi tiết (`/en/tin-tuc/[slug]`):**
  - Đã có mã nguồn chuyên biệt tại `app/src/app/(frontend)/tin-tuc/[slug]/page.tsx` và `app/src/components/WingsGroupV3/EditorialArticle.tsx`.
  - Khi truy cập trực tiếp bằng URL tiếng Anh (ví dụ: `https://wingsgroup.vn/en/tin-tuc/5-site-trong-he-wingsgroup-khac-nhau-ra-sao`), trang hiển thị **100% tiếng Anh chuẩn** (từ H1, nội dung Rich Text, hình ảnh, bài viết đọc tiếp "Continue reading", tác giả "By: Editorial team", nguồn "Source: WingsGroup").
- **Header, Navigation & SEO Metadata:**
  - Header đã có bộ chuyển đổi ngôn ngữ (Language Switcher) hỗ trợ chuyển đổi giữa `Tiếng Việt (vi)` và `ENGLISH (en)`.
  - Khi truy cập URL có prefix `/en`, Header hiển thị các nhãn tiếng Anh (*Home, Services, Our ecosystem, About WingsGroup, Journal, Contact*).
  - Thẻ SEO Meta (`<title>`, `<meta description>`, `hreflang`) trên `/en/tin-tuc` đã tự động sinh tiếng Anh.

---

## 2. Phát hiện Bug cốt lõi (Render Bug tại Trang Danh mục)

Mặc dù kiến trúc, dữ liệu DB và trang chi tiết đã có tiếng Anh, **trang danh sách bài viết `https://wingsgroup.vn/en/tin-tuc` lại bị hiển thị hoàn toàn bằng tiếng Việt** (tiêu đề "Tin tức và góc nhìn", eyebrow "Biên tập", danh sách 11 bài viết hiển thị tiêu đề tiếng Việt và nút "Đọc bài viết ↗").

### Nguyên nhân mã nguồn:
Tại file `app/src/blocks/RenderBlocks.tsx` (dòng 188–192):
```tsx
: block.blockType === 'credentialsCarousel' ||
    block.blockType === 'wingsGroupProofArchive' ||
    (wingsGroupV3Home && block.blockType === 'archive')
  ? { ...block, allowWingsGroupDevelopmentMedia, locale }
  : block
```
- Khối danh sách bài viết sử dụng `block.blockType === 'archive'` (`WingsGroupEditorialArchive`).
- Tuy nhiên, biến `locale` chỉ được đưa vào props khi `wingsGroupV3Home === true` (tức chỉ khi ở Trang chủ).
- Tại trang chuyên mục `/tin-tuc`, biến `wingsGroupV3Route === 'editorial'`, do đó `wingsGroupV3Home === false`.
- Hậu quả: `props.locale` bị bỏ qua (`undefined`). Component `WingsGroupEditorialArchive.tsx` bị fallback:
  ```tsx
  const resolvedLocale = locale === 'en' ? 'en' : 'vi' // locale undefined -> 'vi'
  const [posts] = await queryWingsGroupEditorialPosts({ locale: resolvedLocale })
  ```
  Component truy vấn database với `locale = 'vi'` và hiển thị toàn bộ UI tiếng Việt.

---

## 3. Đề xuất Kiến trúc & Kế hoạch Thực hiện

### Hạng mục 1: Sửa lỗi Render Block
- Cập nhật `app/src/blocks/RenderBlocks.tsx`: Cho phép truyền `{ ...block, allowWingsGroupDevelopmentMedia, locale }` cho mọi khối `block.blockType === 'archive'`.

### Hạng mục 2: Chiến lược Định tuyến & Slug (Routing & Slug Strategy)
- **Hiện trạng:**
  - Tiếng Việt: `https://wingsgroup.vn/tin-tuc` và `/tin-tuc/[slug]`
  - Tiếng Anh: `https://wingsgroup.vn/en/tin-tuc` và `/en/tin-tuc/[slug]`
  - Trường `slug` của Collection `posts` đang để `localized: false` (dùng chung một slug tiếng Việt không dấu cho cả 2 ngôn ngữ).
- **So sánh 2 phương án:**
  - **Phương án A (Khuyến nghị):** Giữ nguyên URL `/en/tin-tuc/[slug]`. Khi user bấm đổi ngôn ngữ trên Language Switcher, Next.js chuyển mượt giữa `/tin-tuc/[slug]` và `/en/tin-tuc/[slug]` mà không bao giờ bị 404 (ánh xạ 1-1).
  - **Phương án B (Bổ sung Alias `/en/news`):** Rewrite `/en/news` -> `/en/tin-tuc` trong `next.config.mjs` hoặc middleware.
  - **Phương án C (Slug riêng cho tiếng Anh):** Đổi trường `slug` thành `localized: true`. Cần thêm bảng ánh xạ slug giữa các ngôn ngữ để Language Switcher không bị 404.

### Hạng mục 3: Chính sách Dữ liệu Thiếu Bản dịch (`fallbackLocale: false`)
- Hệ thống đang dùng `fallbackLocale: false` kết hợp kiểm tra `isGovernedWingsGroupEditorialPost` (bài viết phải có `title` và `content` ở ngôn ngữ đó mới được xem là hợp lệ).
- Khi bài viết mới chỉ có tiếng Việt, nó sẽ tự động ẩn khỏi trang tiếng Anh.

---

## 4. Câu hỏi Yêu cầu Codex Phản biện & Đánh giá (Consultation Questions)

Xin mời Codex phản biện sâu các khía cạnh kỹ thuật sau:
1. **Tính tương thích & Rủi ro hồi quy (Regression Risk):**
   - Việc mở truyền `locale` cho mọi khối `block.blockType === 'archive'` trong `RenderBlocks.tsx` có gây ảnh hưởng tiêu cực nào đến các site khác trong hệ thống đa site (`wings-go`, `wing-side`) không? Cần thêm điều kiện kiểm tra nào (ví dụ: `siteCode === 'wings-group'` hoặc `wingsGroupV3Route === 'editorial'`)?
2. **Đánh giá Chiến lược URL / Slug (URL & SEO Architecture):**
   - Giữa Phương án A (`/en/tin-tuc/[slug]`) và Phương án B/C (`/en/news` hoặc slug tiếng Anh riêng), phương án nào tối ưu hơn về mặt chi phí vận hành, tính ổn định của Next.js SSR cache, độ tin cậy của Language Switcher và SEO Google (canonical, hreflang)?
3. **Edge cases & Content Governance:**
   - Cơ chế `fallbackLocale: false` có nguy cơ gây ra trang rỗng (empty archive) nếu toàn bộ bài viết chưa kịp dịch sang tiếng Anh không? Cần xử lý UI fallback hay thông báo như thế nào?
   - Cache invalidation (Next.js tag / path revalidation & Redis cache) khi biên tập viên cập nhật một locale có làm mới đúng cả 2 URL `tin-tuc` và `en/tin-tuc` không?
4. **Khuyến nghị xếp hạng rủi ro (P1/P2/P3) và Điều kiện Tiên quyết (Pre-conditions)** trước khi triển khai release lên Production VPS Oracle ARM64.
