# Ma trận Nghiệm thu & Bằng chứng Kiểm thử — US-080

## 1. Tiêu chí Chấp nhận (Acceptance Criteria)

- [x] **AC-1:** Editor có thể soạn thảo nội dung lịch trình ngày với bộ công cụ Rich Text (Paragraph, Bold, Italic, Underline, Unordered List, Ordered List, Link) trong Payload CMS.
- [x] **AC-2:** Giao diện chi tiết Tour trên WingsGo (Retail mode) hiển thị chính xác các định dạng: in đậm mốc giờ, thụt lề gạch đầu dòng, danh sách đánh số và liên kết.
- [x] **AC-3:** Giao diện chi tiết Tour trên WingSide (Consultative mode) hiển thị đồng bộ nội dung Rich Text với tone màu thương hiệu WingSide.
- [x] **AC-4:** Các tour cũ chỉ có `summary` (plain text) vẫn hiển thị bình thường, bảo toàn các dấu xuống dòng nhờ `whitespace-pre-line` (Backward Compatibility 100%).
- [x] **AC-5:** Hàm merge biến thể (`queries.ts`) và view model WingSide (`wingsSideTourViewModel.ts`) bảo toàn trường `content` không bị ghi đè hay mất dữ liệu.
- [x] **AC-6:** Link Feature ngăn chặn hoàn toàn giao thức `javascript:`, chỉ cho phép `http:`, `https:`, `mailto:`, `tel:` và đường dẫn tương đối (cả cấp CMS field validate và component sanitizeHref).
- [x] **AC-7:** Xử lý fail-safe khi Lexical AST bị malformed hoặc rỗng: tự động fallback an toàn về `summary` mà không làm crash React tree (`isRichTextEmpty` helper).
- [x] **AC-8:** Tính cô lập đa site (`siteField`) được bảo toàn tuyệt đối giữa WingsGo và WingSide.
- [x] **AC-9:** Khi lưu thay đổi lịch trình, Next.js ISR được revalidate tức thì cho trang chi tiết tour qua hook existing `revalidateTourProduct`.

---

## 2. Ma trận Bằng chứng Kiểm thử (Evidence Matrix)

| Tầng kiểm thử | Kịch bản kiểm thử | Kết quả mong đợi | Trạng thái |
| :--- | :--- | :--- | :--- |
| **Typecheck** | `pnpm --dir app exec tsc --noEmit` | 0 errors | **PASS** (exited code 0) |
| **Unit** | Schema loading (`TourProducts.itineraryDays[].content`) | Config Lexical nạp đúng features (UnorderedList, OrderedList, Link, Paragraph, Bold, Italic, Underline) | **PASS** (5/5 tests passed) |
| **Unit** | Dual-read resolver fallback | PASS (xử lý null, empty string, malformed AST, valid AST) | **PASS** (`tourItineraryRichText.unit.spec.ts`) |
| **Unit** | Variant precedence & merge | PASS (`content` được bảo toàn qua merge overrides) | **PASS** (`tourItineraryRichText.unit.spec.ts`) |
| **Unit** | Link URL scheme security | PASS (block `javascript:`, allow `https:`, `mailto:`, `tel:`) | **PASS** (`tourItineraryRichText.unit.spec.ts`) |
| **Component** | `retailTourItineraryAndServices` | PASS (kiểm tra render timeline, accordion, teaser, CSS whitespace-pre-line, rich text bold/p, malformed AST fallback) | **PASS** (8/8 tests passed) |
| **Component** | `wingsSideTourDetail` | PASS (kiểm tra consultative layout & styling trên WingSide) | **PASS** (3/3 tests passed) |
| **Multisite** | Site-isolation audit | PASS (không leak tour hoặc revalidate nhầm site) | **PASS** (kiểm tra siteField filterOptions và queries) |
| **Database Safety** | Migration PostgreSQL & SQLite Repair | Additive migration `20261015_120000_tour_itinerary_content_richtext.ts` registered in `migrations/index.ts` + SQLite column repair in `repairLocalSQLiteSchema.ts` | **PASS** (Additive P2, không ALTER DROP hay NOT NULL) |

---

## 3. Biên bản Khắc phục Thẩm định Codex (Codex Audit Remediation)

Theo biên bản thẩm định tại [`docs/codex_release_review_us080_itinerary.md`](file:///E:/repo/WingsTravel/docs/codex_release_review_us080_itinerary.md):

1. **Khắc phục P1 (Migration):**
   - Đã tạo migration PostgreSQL: `app/src/migrations/20261015_120000_tour_itinerary_content_richtext.ts`.
   - Đã đăng ký migration vào `app/src/migrations/index.ts`.
   - Đã cập nhật `repairLocalSQLiteSchema.ts` bổ sung cột `content TEXT` cho `tour_products_itinerary_days_locales` và `_tour_products_v_version_itinerary_days_locales`.
2. **Khắc phục P2 (Protocol Allowlist):**
   - Tách module thuần `app/src/components/RichText/sanitizeHref.ts` và export trực tiếp.
   - Cho phép: `https:`, `http:`, `mailto:`, `tel:`, `/path`, `#hash`, `./path`.
   - Chặn tuyệt đối: `javascript:`, `vbscript:`, `data:`, `//evil.com` (protocol-relative), lọc sạch control characters (`\u0000-\u001F\u007F`).
   - Cập nhật cả ở cấp CMS `LinkFeature` validation lẫn client-side `RichText` component.
3. **Khắc phục P2 (Variant Merge Test & Malformed AST):**
   - Đã chuyển `mergeTourVariant` sang `app/src/tours/utils.ts` và import kiểm thử trực tiếp logic production cho cả 4 trường hợp ưu tiên (overrides, base preservation, null/empty, summaryOverride).
   - Đã bổ sung 2 component test mới trong `retailTourItineraryAndServices.component.spec.tsx` kiểm thử định dạng RichText thật và fallback fail-safe khi AST rỗng/malformed.

