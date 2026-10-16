# Codex Consultation Gate — Đánh giá Phản biện Hỗ trợ Tiếng Anh Toàn diện cho WingsGroup News (/tin-tuc & /en/tin-tuc)

- **Ngày thực hiện:** 2026-10-16
- **Công cụ thực hiện:** Codex CLI via Herdr (`codex --dangerously-bypass-approvals-and-sandbox`) trong pane `wP:pF`
- **Quyết định:** **APPROVE WITH CONDITIONS (Chấp thuận có điều kiện)**

---

## 1. Kết luận Tổng quan

Kiến trúc đa ngôn ngữ của hệ thống Payload CMS và Next.js App Router cho `WingsGroup News` đã được xây dựng rất bài bản:
- Cơ sở dữ liệu PostgreSQL (`posts_locales`) đã có sẵn 100% bản dịch tiếng Anh cho cả 11 bài viết.
- Trang bài viết chi tiết `/en/tin-tuc/[slug]` và Header/Metadata đều đã hỗ trợ tiếng Anh trọn vẹn.
- Nguyên nhân khiến trang danh mục `https://wingsgroup.vn/en/tin-tuc` hiển thị tiếng Việt là do **lỗi logic truyền biến `locale` trong `RenderBlocks.tsx`**.

Tuy nhiên, việc sửa đổi **KHÔNG THỂ CHỈ DỪNG LẠI Ở VIỆC TRUYỀN LOCALE**. Phiên audit của Codex đã bóc tách toàn bộ Blast Radius và phát hiện ra một lỗ hổng nghiêm trọng về Cache Revalidation (Finding P1) cùng các điều kiện an toàn khi mở rộng code (Finding P2).

---

## 2. Các Phát hiện Trọng yếu (Findings)

### P1 — Lỗ hổng Cache Invalidation: `revalidatePost` không làm mới route `/tin-tuc`
- **Hiện trạng:** Trong `app/src/collections/Posts/hooks/revalidatePost.ts`, hàm `revalidatePostPaths` sử dụng `getPostCanonicalPath(slug)`. Helper này trong `siteURLs.ts` được hardcode trỏ về `/posts` và `/posts/${slug}` (cùng các prefix locale `/vi/posts/...`, `/en/posts/...`).
- **Rủi ro:** WingsGroup không dùng route `/posts`, mà dùng route chuyên mục thương hiệu `/tin-tuc` và `/tin-tuc/[slug]` (cũng như `/en/tin-tuc` và `/en/tin-tuc/[slug]`). Khi biên tập viên cập nhật hoặc thêm bài viết mới trong Payload CMS, Next.js cache của `/tin-tuc` và `/en/tin-tuc` **hoàn toàn không được revalidate**, dẫn đến dữ liệu mới không cập nhật trên giao diện công khai (stale reads).
- **Điều kiện khắc phục:**
  Trong `revalidatePost.ts`, bổ sung logic nhận diện nếu bài viết thuộc site `wings-group`:
  - Revalidate `/tin-tuc` và `/en/tin-tuc`.
  - Revalidate `/tin-tuc/${slug}` và `/en/tin-tuc/${slug}`.

---

### P2 — Kiểm soát Blast Radius tại `RenderBlocks.tsx` tránh ảnh hưởng đa site
- **Hiện trạng:** Điều kiện hiện tại tại dòng 190:
  ```tsx
  (wingsGroupV3Home && block.blockType === 'archive')
  ```
  bị thiếu phạm vi cho trang `/tin-tuc` (`wingsGroupV3Route === 'editorial'`).
- **Rủi ro:** Nếu mở rộng vô điều kiện thành `block.blockType === 'archive'` cho mọi nơi, có nguy cơ truyền props không tương thích vào các khối archive của các site khác trong hệ thống đa site (`wings-go`, `wing-side`).
- **Điều kiện khắc phục:** Mở rộng có chủ đích và có phạm vi cô lập an toàn:
  ```tsx
  : block.blockType === 'credentialsCarousel' ||
      block.blockType === 'wingsGroupProofArchive' ||
      ((wingsGroupV3 || wingsGroupV3Home) && block.blockType === 'archive')
    ? { ...block, allowWingsGroupDevelopmentMedia, locale }
    : block
  ```
  Điều này đảm bảo mọi trang thuộc WingsGroup V3 (cả trang chủ lẫn trang chuyên mục editorial `/tin-tuc`) đều nhận đủ `locale`, đồng thời không làm thay đổi hành vi của các tenant site khác.

---

### P2 — Khóa Quyết định Chiến lược URL & Language Switcher (Phương án A)
- **Đánh giá:** Giữa việc giữ `/en/tin-tuc/[slug]` (Phương án A) và đổi sang `/en/news/[slug]` (Phương án B/C):
  - **Khuyến nghị dứt khoát chọn Phương án A:**
    1. Giữ ánh xạ 1-1 trực tiếp giữa VI và EN trên Header Language Switcher mà không cần bảng phụ mapping slug.
    2. Không phát sinh rủi ro vỡ link hay 404 khi người dùng bấm chuyển đổi qua lại giữa tiếng Việt và tiếng Anh.
    3. Thống nhất 100% với sitemap hiện hành (`posts-sitemap.xml`) và canonical/hreflang tags.
    4. Tiết kiệm chi phí vận hành và giảm độ phức tạp của Next.js middleware.

---

### P3 — Chính sách Dữ liệu Thiếu Bản dịch (`fallbackLocale: false`) & Empty State
- **Đánh giá:** Cơ chế `fallbackLocale: false` kết hợp hàm `isGovernedWingsGroupEditorialPost` là lựa chọn đúng đắn:
  - Giúp cô lập hoàn toàn nội dung: bài viết chỉ có tiếng Việt sẽ không bị rò rỉ (leak) sang trang tiếng Anh.
  - Component `WingsGroupEditorialArchive.tsx` đã có sẵn trạng thái rỗng (`copy.empty = 'No published articles are available yet.'`), bảo đảm không bị crash layout ngay cả khi một locale chưa có bài viết nào được duyệt.

---

## 3. Kế hoạch Hành động Kỹ thuật (Action Items)

1. **Sửa `RenderBlocks.tsx`:** Mở biến `locale` cho khối archive thuộc WingsGroup V3 surface (`(wingsGroupV3 || wingsGroupV3Home) && block.blockType === 'archive'`).
2. **Sửa `revalidatePost.ts`:** Bổ sung revalidate đường dẫn `/tin-tuc`, `/en/tin-tuc`, `/tin-tuc/[slug]`, `/en/tin-tuc/[slug]` khi post thuộc site `wings-group`.
3. **Chạy kiểm thử Component & Regression:** Chạy Vitest cho `wingsGroupEditorial.component.spec.tsx` và `revalidatePost.spec.ts`.
4. **Deploy Production lên Oracle ARM64 VPS:** Đóng gói release và triển khai theo đúng runbook chuẩn.
