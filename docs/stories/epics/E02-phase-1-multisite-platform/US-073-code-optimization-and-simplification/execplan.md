# Exec Plan

## Goal

Đưa codebase WingsTravel về một cấu trúc nhỏ hơn và dễ review hơn bằng cách
xóa code chết, hợp nhất duplicate có cùng contract, giữ adapter cho khác biệt
thật và chứng minh không có regression trong app, Payload, seed hoặc release
proof.

## Scope

In scope:

- Xác nhận inventory và baseline LOC/dependency/reference.
- Xóa dead template seed, unreachable `SeedButton`, unused UI card, legacy
  sitemap config/aliases và direct dependencies theo allowlist.
- Tách pure Payload/Lexical block builders dùng chung giữa hai seed path.
- Tách lifecycle Docker/PostgreSQL tối thiểu cho ba smoke runner.
- Gộp ba light `page.client.tsx`, hai RowLabel và các duplicate nhỏ có cùng
  semantics.
- Phân loại và chỉ hợp nhất relation ID copies có contract trùng khớp.
- Bổ sung focused regression proof và cập nhật Harness/Plane.

Out of scope:

- Product feature, UI redesign, copy, route/locale policy hoặc schema change.
- Production CMS write, production seed, database cleanup hoặc deployment.
- Xóa `scripts/seed-subsites.ts`, active backfill, release pipeline hay Harness.
- Global relation-ID rewrite không có contract matrix.
- Generic code-generation/refactoring framework.

## Risk Classification

Risk flags:

- Existing behavior: chạm code đã được test và route public/admin.
- Public contracts: giữ nguyên `/next/seed`, header theme và rendered labels.
- Audit/security: seed phải tiếp tục fail-closed; không làm yếu guard/test.
- Cross-platform: Docker runner chạy trên các shell/platform khác nhau.
- Multi-domain: app, Payload seed, scripts, tests và package manifest.
- Weak proof: một số script test không nằm trong Vitest project mặc định.

Hard gates:

- Không xóa guard/security test hoặc validation requirement để làm diff nhỏ hơn.
- Không chạy command có thể ghi production database; chỉ disposable targets.
- Không thay đổi schema, migration hoặc public response contract.
- Không ghi đè các thay đổi dirty tree không thuộc US-073.
- Mọi shared helper phải làm code sau refactor ngắn hơn; nếu abstraction dài
  hơn duplicate hoặc tạo branching khó đọc thì giữ local implementation.

## Work Phases

1. **Baseline and safe test intake** — ghi nhận `git status`, Harness intake,
   current LOC, direct dependencies, reference scan và test baseline. Kiểm tra
   `run-phase1-e2e.mjs` để `E2E_DATABASE_ENGINE=sqlite` luôn bỏ qua
   `DATABASE_URL` kế thừa; ghi rõ target database trước mọi bước seed. Lập
   allowlist file được phép thay đổi, không trộn dirty changes ngoài story.
2. **Coverage and contract matrix** — lập mapping test cho unit/component/
   integration, hai importer test ngoài glob mặc định, E2E và ba smoke runner.
   So sánh builder output, `relationID`, smoke exit/log/teardown, page theme và
   RowLabel. Đánh dấu exact duplicate, phần parameterizable và phần phải giữ.
3. **Dead-code deletion** — xử lý seed template/fixtures, `SeedButton`, UI
   card, inert sitemap config, deprecated aliases và unused dependencies. Cập
   nhật security test, `tsconfig` hoặc importMap chỉ khi có reference trực tiếp;
   giữ `guard.ts`, route seed 404 và proof fail-closed.
4. **Payload builder extraction** — tạo pure helper trong `app/scripts/lib/`,
   chuyển hai caller theo từng nhóm block, giữ locale defaults và type narrow.
   Chạy shape/golden-output check; không import seeder side-effectful chỉ để
   lấy builder và không gom helper chỉ tồn tại ở một seed path.
5. **Smoke failure characterization then lifecycle extraction** — stub/ghi
   nhận command order cho Docker unavailable, start/readiness/port failure,
   migration failure và proof failure trước khi chuyển code. Sau đó tách
   lifecycle tối thiểu, chuyển group-commerce và taxonomy trước, Hifi sau cùng;
   giữ output mode, labels, environment, runner-specific exit code và teardown.
6. **Frontend/admin deduplication** — thay các page clients giống nhau bằng
   shared component có `theme` rõ ràng; giữ light/dark route intent. Trỏ
   Header/Footer RowLabel về implementation chung, regenerate và kiểm tra
   `importMap` không đổi path contract.
7. **Relation-ID decision gate** — chỉ sửa copies có cùng input/output
   semantics. Nếu signature chung không làm diff ngắn hơn hoặc đụng
   `null`/`undefined`/stringify/sentinel, ghi exception và giữ local helper;
   không chạy quota global “20 copies”.
8. **Full verification and handoff** — chạy validation ladder, đo LOC/deps,
   lưu command/exit/database target/teardown evidence, cập nhật Harness trace
   và Plane. Chỉ chuyển status sau khi hard gate pass hoặc exception có owner.

## Stop Conditions

Pause for human confirmation if:

- Shared builder làm thay đổi serialized Payload/Lexical shape hoặc localized
  default.
- Relation helper cần đổi `null` thành `undefined`, stringify ID hoặc đổi caller
  error behavior.
- Xóa file làm lộ rằng nó được dùng bởi generated importMap, deployment, docs
  contract hoặc external operational command.
- Smoke helper làm mất log/proof detail, thay đổi exit code hoặc không cleanup
  được container.
- E2E hoặc seed command có thể nhận nhầm `DATABASE_URL` ngoài disposable target,
  hoặc importer test ngoài glob mặc định bị bỏ qua.
- Test/build fail và đề xuất là bỏ hoặc nới validation để tiếp tục.
- Có yêu cầu chạm production DB, migration, deployment hoặc release gate.

## Rollback Strategy

- Thực hiện theo commit/patch phase độc lập để có thể revert dead-code deletion,
  shared builder, runner và UI dedup riêng.
- Không xóa database backup hay production rollback resource; story không tạo
  production mutation.
- Nếu shape comparison fail, quay lại local builder của phase đó và giữ phần
  duplicate chưa đủ bằng chứng.
