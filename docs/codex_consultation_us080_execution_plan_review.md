# Codex Consultation — US-080 Execution Plan Review

- **Ngày:** 2026-10-15
- **Story:** US-080 — Rich Text Itinerary & Editorial Formatting
- **Quyết định:** **APPROVE WITH CONDITIONS**

## Kết luận

Kiến trúc additive field + dual-read là lựa chọn đúng. Giữ `summary` plain text và thêm `content` Rich Text tránh phá 73 tour hiện hữu, giữ import/export cũ và cho phép rollback bằng cách ngừng đọc field mới.

ExecPlan chưa đủ decision-complete để bắt đầu code ngay. Cần khóa field name `content`, validation theo từng locale, mọi consumer của itinerary, variant precedence, Lexical list/link API, URL scheme, cache contract và migration rehearsal.

## Findings

### P1 — Thiếu migration contract đầy đủ

`summary` hiện là localized required textarea trong `app/src/collections/TourProducts.ts`; dữ liệu PostgreSQL là string. ExecPlan thêm richText nhưng chưa mô tả migration PostgreSQL/SQLite và generated schema shape.

Điều kiện: migration additive nullable/optional, không chuyển đổi hoặc xóa `summary`; rehearsal trên dữ liệu đại diện 73 tour/từng locale; xác minh Payload types; rollback bằng forward fix/feature flag, không giả định `down()` reversible.

### P2 — Bỏ sót consumer ngoài StructuredPages

`app/src/tours/queries.ts`, `wingsSideTourViewModel.ts` và WingSide direct detail path có helper string-only. Variant itinerary overrides cũng có contract riêng.

Tour chỉ có `content` có thể trống ở mode khác hoặc bị loại bởi `asText()`. Variant có thể ghi đè `summary` trong khi base day dùng `content`.

Điều kiện: audit/sửa mọi mapper và direct path; giữ `content` qua merge/override; chốt variant có field Rich Text riêng hay chỉ override summary; test retail và consultative qua route thật.

### P2 — Validation theo locale chưa được quyết định

Plan chuyển `summary` optional và yêu cầu một trong hai field có dữ liệu, nhưng chưa định nghĩa validator và localized sibling shape.

Một locale có thể pass nhờ locale khác, hoặc Payload field validator không thấy đủ row data. Khuyến nghị giữ `summary` required trong phase đầu; nếu cho content-only, dùng `beforeValidate` kiểm tra từng row/từng locale và chỉ coi Lexical state có dữ liệu khi root children hợp lệ.

### P2 — Lexical API chưa chốt

Design dùng `ListFeature()` và `defaultFeatures`, trong khi cấu hình hiện hữu dùng feature factories và `rootFeatures`.

Dùng đúng API package đang cài, kiểm tra `UnorderedListFeature()` và `OrderedListFeature()`; không kéo Blocks/Media/Code vào array; thêm test editor config load được.

### P2 — Link feature có rủi ro URL scheme

Renderer đưa URL vào `href`; cấu hình hiện tại chủ yếu kiểm tra URL không rỗng. Internal converter không có route riêng cho tour product.

Chỉ cho phép `https`, `http`, `mailto`, `tel` và relative URL; không bật internal relation tới `tour-products` khi chưa có resolver `/tour/<slug>`; test `javascript:`, empty URL, external và new-tab link.

### P2 — Tuyên bố Redis revalidation chưa khớp code

`revalidateTourProduct` đang revalidate Next.js paths; chưa có bằng chứng hook này xóa Redis itinerary key. Route tour là dynamic.

Tách acceptance Next.js revalidation và Redis invalidation. Nếu không có Redis cache cho itinerary, ghi rõ not applicable. Nếu có, định nghĩa key theo site/tour/locale và không flush toàn cục.

### P2 — Draft/public và locale fallback

`cmsPage`/tour detail truyền draft, locale và fallback khác nhau; WingSide có `fallbackLocale:false`.

Bổ sung test anonymous published, authenticated draft preview, VI/EN, locale thiếu content và site A/B isolation. Không dùng resolver fallback chung làm đổi policy WingSide.

### P3 — Teaser extraction

Flatten Lexical mỗi render có thể tốn chi phí và nối list/link sai. Ưu tiên dùng `summary`; chỉ flatten khi summary rỗng, giới hạn ký tự và có unit test. Không tạo HTML teaser.

### P3 — Acceptance matrix thiếu regression

Bổ sung variant precedence, direct WingSide path, malformed root/unknown node, URL scheme, import/export giữ summary/unknown fields, PostgreSQL + SQLite rehearsal, draft/published save và locale revalidation.

## Scope decision

- US-077 chỉ giữ hotfix `whitespace-pre-line`; không đưa schema Rich Text vào đó.
- US-075 chỉ nhận shared authoring/preview integrity; không che migration/import contract.
- US-080 giữ schema additive, dual-read, hai site, variant semantics, import/export và release proof.

Harness đã có US-080 ở trạng thái `planned`; cần cập nhật risk/lane thành high-risk nếu story giữ migration và public contract, đồng thời cập nhật evidence/Plane mapping.

## Phê duyệt có điều kiện

**Được phép bắt đầu implementation sau khi cập nhật ExecPlan/design/validation với các điều kiện P1/P2 trên.**

Thứ tự: chốt `content`/variant precedence; chốt Lexical/link policy; thêm additive migration + SQLite repair; sửa toàn bộ mapper/render path; viết tests malformed/locale/site/draft/link; chạy typecheck, unit, component, migration rehearsal và public/draft smoke.

Không đánh dấu release-ready chỉ dựa trên TypeScript/unit pass.
