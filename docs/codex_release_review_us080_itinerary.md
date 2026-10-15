# US-080 — Release Review & Pre-deployment Audit

- **Ngày audit:** 2026-10-15
- **Phạm vi:** schema TourProducts, RichText renderer, StructuredPages, WingSide view model, revalidation hooks, tests và migration inventory.
- **Kết luận:** **REJECT / BLOCK RELEASE** cho đến khi bổ sung migration và khắc phục các điều kiện P1/P2 dưới đây.

## Bằng chứng đã kiểm tra

Các lệnh đã chạy trong phiên này:

- `pnpm exec vitest run --config ./vitest.unit.config.mts tests/unit/tourItineraryRichText.unit.spec.ts` — **5/5 PASS**.
- `pnpm exec vitest run --config ./vitest.component.config.mts tests/component/retailTourItineraryAndServices.component.spec.tsx tests/component/wingsSideTourDetail.component.spec.tsx` — **9/9 PASS**.
- `pnpm exec tsc --noEmit` — **exit 0**.
- `git diff`, static inspection và CodeGraph blast-radius inspection.

Các test trên chứng minh code hiện tại biên dịch và các fixture được chọn chạy được. Chúng chưa chứng minh production database đã được nâng cấp hoặc browser/ISR đã fresh sau deploy.

## Findings

### P1 — Thiếu migration production cho field `content`

Diff thêm `content: richText` vào `itineraryDays` và cập nhật `payload-types.ts`, nhưng `app/src/migrations/index.ts` không có migration US-080. `app/src/migrations/` cũng không có migration mới cho `tour_products_itinerary_days_locales` và `_tour_products_v_version_itinerary_days_locales`; `repairLocalSQLiteSchema.ts` không có cột tương ứng.

Schema hiện hữu lưu `summary` trong bảng locale string. Rich Text cần cột JSONB tương ứng cho bảng public và bảng versions. Nếu deploy bundle này lên PostgreSQL hiện tại, Payload có thể query/insert field chưa tồn tại và fail khi đọc hoặc lưu TourProduct. Đây là blocker, dù typecheck và unit test đều pass.

**Bắt buộc trước release:** sinh migration additive bằng Payload, đăng ký trong `migrations/index.ts`, cập nhật SQLite repair, chạy rehearsal trên bản sao PostgreSQL có dữ liệu 73 tour và kiểm tra cả public/version locale tables. Không chuyển đổi hoặc xóa `summary`.

### P2 — Sanitizer chưa chặn toàn bộ scheme nguy hiểm

`sanitizeHref` và custom CMS validation chỉ từ chối chuỗi khớp `^javascript:` sau `trim()`. Chúng vẫn cho phép `data:`, `vbscript:`, các scheme không mong muốn và các biến thể chứa control character mà browser có thể chuẩn hóa trước khi điều hướng.

Unit test hiện tại định nghĩa lại một sanitizer trong test thay vì import/export helper production, nên test không chứng minh implementation thật.

**Khắc phục:** dùng allowlist scheme (`https`, `http`, `mailto`, `tel`, relative) sau khi loại bỏ control characters; từ chối scheme khác ở cả CMS và renderer; export helper để test trực tiếp; thêm test `data:text/html`, `vbscript:`, whitespace/control prefix, encoded input và malformed link node.

### P2 — Unit test variant không gọi code merge thật

Test “preserves content when merging variant overrides” tự tạo `Object.fromEntries` trong test. Nó không gọi hàm merge trong `app/src/tours/queries.ts`, nên có thể pass dù production merge làm mất `content`.

**Khắc phục:** export hoặc test qua public query function; fixture phải chạy qua đúng đường merge variant và kiểm tra precedence khi variant có `summary`, có `content`, cả hai, `null` và empty string.

### P2 — Malformed Lexical state chưa được test qua renderer thật

Test chỉ kiểm tra helper trích text tự định nghĩa. `RichText` converter thật có thể gặp link node thiếu fields, unknown node hoặc relation object không hợp lệ và ném lỗi khi render.

**Khắc phục:** component test render `RichText`/`StructuredPages` với malformed root, unknown node, malformed link và empty children; yêu cầu fallback `summary` hoặc bỏ qua node lỗi mà không làm 500 trang tour.

### P2 — RichText chạy trong client tree cho toàn bộ accordion

`StructuredPages.tsx` có `'use client'`. Tất cả ngày itinerary được tạo trong DOM dù accordion đang đóng; việc thêm `<RichText />` khiến Lexical conversion và toàn bộ AST của mỗi ngày tham gia render/hydration trước khi người dùng mở ngày.

Chưa có bundle-size, hydration hoặc LCP measurement mới. Với tour dài và nhiều node, đây là rủi ro performance thực tế, dù chưa có bằng chứng hiện tại gây regression.

**Khắc phục/điều kiện:** chạy production build bundle analysis và browser performance smoke trên tour dài nhất; đặt ngưỡng kích thước/hydration; nếu vượt ngưỡng, lazy-render nội dung khi mở accordion hoặc tách renderer server-side/chunk riêng.

### P2 — Revalidation Next.js có, Redis chưa được chứng minh

`revalidateTourProduct` gọi `revalidatePath` cho route tour và locale public. Trong phần code được audit không có assertion rằng itinerary content được xóa khỏi Redis; route tour hiện là dynamic. Không nên ghi acceptance “Redis PASS” chỉ từ việc hook chạy.

**Khắc phục:** tách hai tiêu chí. Xác minh bằng smoke rằng save published content làm mới đúng slug và locale. Nếu có Redis cache cho tour detail, ghi rõ key gồm site/tour/locale và test invalidation đúng tenant; không flush Redis toàn cục.

### P2 — Multisite và direct path chưa được chứng minh đầy đủ

`wingsSideTourViewModel` giữ `content`, nhưng test chỉ gọi view model với mock. Cần kiểm tra route WingsGo retail và WingSide consultative thật, locale fallback (`fallbackLocale:false` của WingSide), draft preview và anonymous published response.

**Khắc phục:** thêm test/site matrix bảo đảm site A không đọc tour/content site B, draft không lọt public, và content không mất qua query/projection/variant/direct detail path.

### P3 — Teaser flatten có chi phí và semantics chưa đầy đủ

Fallback teaser trích text đệ quy từ AST và nối mọi node bằng khoảng trắng. List, hard break và link có thể mất ngữ nghĩa; helper được gọi lặp trong cùng render.

**Khuyến nghị:** ưu tiên `summary` làm teaser; chỉ flatten khi summary rỗng, memoize/tính một lần mỗi day, giới hạn 160 ký tự và test line break/list/link.

## Security assessment

Chặn `javascript:` là cần thiết nhưng chưa đủ cho boundary nhận nội dung CMS. React escaping bảo vệ HTML attribute, nhưng không biến mọi URL scheme thành an toàn. Allowlist ở cả write boundary và render boundary là yêu cầu trước release.

Internal link relation hiện cho phép `pages` và `posts`; không bật relation tới `tour-products` nếu chưa có resolver riêng cho `/tour/<slug>`. Link malformed phải không làm render toàn trang lỗi.

## Verdict

**REJECT / BLOCK RELEASE hiện tại.** Lý do quyết định là P1 thiếu migration/SQLite schema, không phải do unit hoặc component logic.

Có thể chuyển sang **CONDITIONAL APPROVE** sau khi hoàn tất:

1. Migration PostgreSQL + SQLite repair + rehearsal/verification.
2. URL allowlist và production sanitizer test trực tiếp.
3. Integration test cho variant merge và malformed Lexical renderer.
4. Public/draft/multisite/locale smoke trên cả WingsGo và WingSide.
5. Bundle/hydration/LCP measurement cho tour dài.
6. Evidence mới cho Next.js revalidation và Redis (hoặc ghi Redis là not applicable).

Chưa kiểm tra: staging/production database, migration thực tế, browser performance, Redis runtime và Oracle ARM64 package. Không được đóng Story hoặc đưa release package lên VPS dựa trên bằng chứng hiện có.

## Remediation review — 2026-10-15

### Đã xác minh lại

- Migration `20261015_120000_tour_itinerary_content_richtext.ts` đã tồn tại, được đăng ký trong `migrations/index.ts`, thêm nullable `jsonb` cho bảng locale hiện hành và bảng version locale, không sửa/xóa `summary`.
- SQLite repair đã thêm `content` cho cả bảng locale hiện hành và version locale.
- `sanitizeHref` production đã tách thành module và dùng allowlist `http`, `https`, `mailto`, `tel` và relative path; protocol-relative, `data`, `vbscript`, `javascript`, control characters và `blob` bị từ chối.
- Unit test hiện gọi trực tiếp `sanitizeHref` production và `mergeTourVariant` production.
- Component test có fixture Rich Text và fallback AST rỗng/malformed.

### Kiểm tra mới

- `pnpm exec vitest run --config ./vitest.unit.config.mts tests/unit/tourItineraryRichText.unit.spec.ts tests/unit/tourDetailBuilder.unit.spec.ts tests/unit/tourProductPreview.unit.spec.ts` — **14/14 PASS**.
- `pnpm exec vitest run --config ./vitest.component.config.mts tests/component/retailTourItineraryAndServices.component.spec.tsx tests/component/wingsSideTourDetail.component.spec.tsx` — **11/11 PASS**.
- `pnpm exec tsc --noEmit` — **exit 0**.
- `git diff --check` — **exit 0**; chỉ còn cảnh báo line ending CRLF từ Git.

### Verdict cập nhật

**CONDITIONAL APPROVE cho Staging; chưa APPROVE Production.** P1 migration blocker đã được khắc phục ở mức source review. Việc đóng Story và phát hành Production vẫn cần bằng chứng mới cho:

1. PostgreSQL migration rehearsal trên schema có dữ liệu đại diện, gồm kiểm tra cả active/version locale tables.
2. SQLite repair runtime trên database local mới và database đã tồn tại.
3. Browser smoke cho WingsGo/WingSide, published/draft, VI/EN và multisite isolation.
4. ISR freshness sau save content; xác nhận Redis là `not applicable` hoặc cung cấp key/invalidation evidence.
5. Bundle, hydration và LCP measurement trên tour có nhiều ngày/nhiều Lexical nodes.

Không còn thấy P1/P2 chắc chắn trong static code review hiện tại, nhưng chưa được phép tuyên bố production-ready khi các rehearsal và runtime gates trên chưa có output.
