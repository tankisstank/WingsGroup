# US-073 — Tinh gọn code và giảm trùng lặp

## Status

implemented

Visual snapshot exception accepted by stakeholder on 2026-09-14: the tracked
baseline is Windows-only while the available verification workspace is Linux;
manual desktop/mobile visual proof passed.

## Lane

high-risk

## Product Contract

Đội phát triển có một codebase WingsTravel nhỏ gọn hơn, không còn các đường
code/template đã chết và không tạo thêm abstraction chỉ để che khác biệt giữa
các domain. Việc tinh gọn phải giữ nguyên hành vi public, contract Payload,
seed cục bộ, quyền tenant, admin UI và các bằng chứng release hiện có.

Đây là story maintenance/refactor; không thêm capability sản phẩm và không
thay đổi dữ liệu CMS production.

## Current Behavior

Read-only audit ngày 2026-09-13 ghi nhận:

- `app/src/endpoints/seed/` còn bộ Payload website-template không được đăng ký
  trong `payload.config.ts`; route `/next/seed` hiện trả `404`. Các fixture
  content/image này tách khỏi seed chính đang được dùng là
  `app/scripts/seed-subsites.ts`.
- `app/src/components/BeforeDashboard/SeedButton/` không có registration thực
  tế và gọi cùng route seed đã bị vô hiệu hóa.
- `app/src/components/ui/card.tsx` không có import thực tế; app dùng
  `app/src/components/Card/index.tsx` cho card public.
- Các Payload/Lexical block builders bị copy giữa `seed-subsites.ts` và
  `wingssideLocaleBackfill.ts`; một số default locale/typing khác nhau.
- Ba PostgreSQL CRUD smoke runner lặp lifecycle Docker; runner Hifi đã có
  logging/error handling khác hai runner còn lại.
- Ba `page.client.tsx` của posts/search giống hệt; `Header/RowLabel.tsx` và
  `Footer/RowLabel.tsx` cũng giống hệt.
- Có các alias deprecated không còn caller và hai direct dependency không có
  consumer trong repo: `@types/escape-html` và `autoprefixer`.
- Các helper `relationID` cục bộ nhiều nhưng không cùng contract: có nơi trả
  `null`, có nơi `undefined`, có nơi stringify hoặc giữ unknown value.

## Implementation Guardrails

Đánh giá độc lập sau khi lập kế hoạch xác nhận thêm các guardrail sau:

- `test:e2e:sqlite` phải tự tạo và tự dọn SQLite disposable, không được dùng
  `DATABASE_URL` kế thừa từ shell; E2E PostgreSQL chỉ nhận container/database
  có tên an toàn hoặc URL disposable được ghi rõ trước khi seed.
- Nếu chạm importer hoặc caller ngoài hai seed path, phải chạy riêng các test
  `scripts/import-wingsgroup-v3-content.test.ts` và
  `scripts/import-wingsgroup-v3-media.test.ts`; chúng không nằm trong glob
  unit/integration mặc định.
- Smoke proof phải characterise cả nhánh fail: Docker/start/readiness/port,
  migration, proof, exit code, log và teardown; không chỉ chạy happy path.
- `normalizeRelationID` chỉ thay thế input/output tương thích. Các helper trả
  `null`, nhận `unknown`, stringify hoặc giữ sentinel rỗng tiếp tục là adapter
  cục bộ.

## Target Behavior

- Dead template code, unreachable admin control, unused UI scaffold, unused
  direct dependencies và alias không dùng được loại bỏ sau khi có allowlist
  reference rõ ràng.
- Builder thuần dùng chung chỉ chứa phần thật sự giống nhau; khác biệt locale,
  label và type được biểu diễn bằng tham số hoặc adapter nhỏ tại caller.
- PostgreSQL smoke runner dùng một lifecycle helper tối thiểu, còn proof command,
  secret, database name, output và exit contract vẫn rõ ở từng smoke case.
- Client header-theme và admin row-label dùng implementation chung mà không đổi
  route behavior, theme intent hoặc importMap contract.
- `relationID` chỉ được hợp nhất ở các caller có cùng input/output semantics;
  không ép toàn bộ repo dùng helper ở `access/roles.ts`.
- Không có schema migration, production CMS write, public API change hoặc thêm
  runtime dependency.

## Affected Users

- Developer và reviewer duy trì app, seed và migration-proof scripts.
- QA/release operator chạy unit, integration, browser và PostgreSQL smoke proof.
- CMS operator, chỉ ở mức bảo toàn admin row labels và các route hiện có.
- Người dùng public, không được thấy thay đổi hành vi ngoài việc giữ nguyên
  header theme và rendered content.

## Acceptance Criteria

- Inventory before/after ghi rõ từng file, caller, lý do giữ/xóa/gộp và số dòng
  source thực giảm; seeder template không đăng ký, `SeedButton`, UI card, config
  sitemap legacy, alias không caller và direct dependency không dùng được xử lý
  theo allowlist; không tính generated output, lockfile hoặc evidence.
- Các Payload/Lexical builder giống nhau có một implementation chung; test
  snapshot/shape chứng minh output tương đương cho seed và locale backfill, trong
  khi khác biệt locale/type/default vẫn nằm ở option hoặc adapter rõ ràng.
- Ba PostgreSQL CRUD smoke runner chia sẻ lifecycle Docker tối thiểu; từng proof
  vẫn giữ database isolation, exit code, log, command riêng và teardown.
- Ba client page giống hệt và hai RowLabel giống hệt dùng implementation chung;
  `light`/`dark` header intent, Payload importMap và label hiển thị không đổi.
- Việc chuẩn hóa relation ID có ma trận contract cho từng caller; chỉ caller
  tương thích mới dùng helper chung, không đổi public API, seed fail-closed,
  schema/migration, production write hoặc thêm runtime dependency.
- Khi implementation hoàn tất, unit, component, integration, typecheck, lint,
  build, focused E2E và ba PostgreSQL smoke proof đều pass hoặc có exception
  được owner duyệt; Harness story, evidence, source links và Plane work item
  `US-073` đồng bộ trước khi chuyển sang `implemented`.

## Relevant Product Docs

- `docs/ARCHITECTURE.md`
- `docs/HARNESS.md`
- `docs/FEATURE_INTAKE.md`
- `docs/product/multisite-platform.md`
- `docs/product/layout-preset-library.md`
- `docs/product/go-live-review-pipeline.md`
- `source/strategy/18 Áp dụng Payload vào dự án WingsTravel.md`
- `source/strategy/19 Kiến trúc đề xuất nội bộ WingsTravel Payload.md`
- `source/strategy/20 Kiến trúc đề xuất gửi khách hàng WingsTravel.md`

## Non-Goals

- Không redesign UI, đổi copy, đổi route, đổi locale policy hoặc thay đổi
  business behavior.
- Không xóa `scripts/seed-subsites.ts`, locale backfill đang được dùng hoặc
  các proof runner chỉ vì chúng lớn.
- Không xóa/đổi `guard.ts` và security test nếu chưa có contract tương đương cho
  seed fail-closed và local opt-in.
- Không global-replace mọi hàm `relationID` bằng một return type duy nhất.
- Không đổi schema, migration, dữ liệu production, deployment hoặc release gate.
- Không xây framework generic cho smoke test, block builder hay code-generation.
