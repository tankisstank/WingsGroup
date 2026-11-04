# US-005 Page And Landing Page Composer

## Status

implemented / Đã bàn giao — đối soát 2026-11-04, proof Full. Release tích hợp `2265e13` đã triển khai và kiểm chứng H1/caption/video/CTA desktop/mobile. Chưa có xác nhận nghiệm thu stakeholder.

Trạng thái hiện tại: `docs/releases/us-status-20261104.md`. Các mốc bên dưới là lịch sử.

## Lane

normal

## Product Contract

Phase 1 must provide reusable page composition for core marketing pages and at
least one landing page pattern without recurring structural frontend edits.

## Relevant Product Docs

- `docs/product/phase-1-scope.md`
- `docs/product/editorial-operations.md`
- `docs/product/acceptance-and-kpis.md`
- `docs/product/page-composer-and-landing-pattern.md`

## Acceptance Criteria

- Core marketing pages can be managed from structured content in Payload.
- At least one landing page pattern is reusable for campaign or market-specific variants.
- Editors can change hero, CTA, and supporting sections without code changes for standard cases.
- Hiển thị H1 campaign WingsGo tiếng Việt theo nội dung đã duyệt.
- Ẩn caption media riêng trang campaign WingsGo.

## Follow-up 2026-11-02 — AC4–AC5

Owner c0508g; bắt đầu 2026-11-02. Phạm vi candidate: H1 tiếng Việt “Tour theo mùa: Khám phá vẻ đẹp thế giới”, cập nhật qua Payload có guard giá trị cũ; không đổi H2 hoặc tự dịch H1 tiếng Anh. Prop nội bộ `showMediaCaption` mặc định true, chỉ đặt false cho site WingsGo tại `/campaign`; không xóa caption của media dùng chung. Kiểm chứng và review đợt mới được ghi riêng; không kế thừa bàn giao 2026-05-27.

Review local 2026-11-02: công cụ H1 mặc định dry-run, journal bất biến trước ghi, transaction/row lock PostgreSQL, kiểm tenant/path/updatedAt và draft mọi locale. Nội dung H1 khác hai giá trị đã duyệt hoặc bị chia formatting sẽ dừng để editor rà soát. Rehearsal kiểm snapshot tamper, wrong route, stale version, EN draft, noop và rollback; EN hero, layout và caption media giữ nguyên. Browser desktop và mobile390: đúng một H1 mới, không caption dưới video, video thực phát readyState4/pausedfalse, không overflow; CTA mở `/wingsgo/lien-he#contact-form`. Trang caption-control dùng cùng media vẫn hiện cả hai phần caption; EN campaign giữ nguyên H1. Bằng chứng `followups-20261102/us005-independent-pg-proof.json`, `campaign-browser-*.json`, `campaign-caption-control.json`, `campaign-cta-click.json` và ảnh. Candidate Đang rà soát / Partial, chưa phát hành.

## Design Notes

- Commands: create page, create landing page, publish draft.
- Queries: fetch blocks and shared settings for render.
- API: page and landing page read models.
- Tables: pages, posts, future services if introduced in scope.
- Domain rules: page structure remains block-based and reusable.
- UI surfaces: frontend marketing pages and CMS block editor.

## Validation

| Layer | Expected proof |
| --- | --- |
| Unit | Block config and serialization helpers |
| Integration | CMS documents render expected block payloads |
| E2E | Create/edit/publish path for one page and one landing page |
| Platform | Mobile and desktop smoke checks |
| Release | One reusable landing page pattern demonstrated |

## Harness Delta

This story anchors reusable composition as a durable acceptance requirement.

## Evidence

2026-05-27 implementation:

- Documented the reusable page composer and phase-1 landing pattern in
  `docs/product/page-composer-and-landing-pattern.md`.
- Added a phase-1 landing page pattern helper requiring `content`,
  `mediaBlock`, `cta`, and `formBlock`.
- Added a `/campaign` sample landing page to `scripts/seed-subsites.ts` for
  each configured site. The page includes editable hero, content proof points,
  media, CTA, form, SEO metadata, breadcrumb label, parent page, and related
  page links.
- Added `Campaign` to seeded site navigation so the sample landing page is not
  orphaned.

Validation:

- `pnpm exec tsc --noEmit --pretty false --incremental false` passed after
  preflight cleanup.
- Landing pattern integration tests cover required block composition.

2026-05-27 launch smoke update:

- Added E2E seed helper for Phase 1 launch smoke so `/wingsgo/campaign` exists
  in the local SQLite test database without downloading remote assets.
- Added Playwright smoke coverage for `/wingsgo/campaign`, including campaign
  title, visible landing heading, breadcrumb, and contact link.
- `pnpm run test:e2e` passed outside sandbox with 10 tests.
- `pnpm lint` passed with zero warnings.
- `pnpm exec tsc --noEmit --pretty false --incremental false` passed.


## Production follow-up — 2026-11-03

Production follow-up delivered 2026-11-03, owner c0508g, revision5b81a19d663f2f78a04d0e411fcfa0afbd416c4a. Bounded Payload CTA/H1 apply verified:556 page-locales/6sites,only3 changed locales,all1399 media unchanged,drafts preserved; rerun noop. ARM64 media path defect found by public browser QA, rolled back and fixed with3unit/typecheck/ESLint/build and independent Codex noP1/P2/P3. Fresh encrypted PG backup+disposable restore,28/28 migrations,immutable image gate,readiness passed. Production desktop1440/mobile390 verifies hotline0948786775,newVIH1,EN unchanged,caption scope,playing video and4WingsPlus descriptions pre-line/nooverflow. Evidence followups-20261102/PRODUCTION-REPORT.md. Technical delivery is not stakeholder acceptance; real calls/leads and physical Safari/iOS not exercised.

- Deployed code: `5b81a19d663f2f78a04d0e411fcfa0afbd416c4a`, branch `work/followups-20261102-us081-088-005`.
- Release: `/home/ubuntu/wings-travel/releases/release-5b81a19`; previous `release-us093-8efdbbf` retained.
- CMS journals remain protected on VPS at `shared/artifacts/followups-642b857/{cta-apply,heading-apply}.json`. No shared media edits or database restore performed.
- New follow-up state: **Đã bàn giao / Full**, start2026-11-02, delivery/review2026-11-03. Earlier dated candidate-only and historical delivery entries remain as history.
- Evidence: `followups-20261102/production-content-verify-final.log`, `production-media-gates-2.log`, `production-media-cutover-2.log`, `production-browser-qa.json`, four production screenshots, `production-media-codex-review.md` plus original independent reviews. No unresolved P1/P2/P3.

Resolved production findings: campaign identity now follows exact public pathname despite namespaced CMS slug; standalone preserves traced database driver packages; media directory now resolves from runtime app-root cwd. The first media-defective image was rolled back immediately after public QA; final preview tested actual1024-byte206 media response before cutover. Existing preview-store restrictions and tenant access checks remain intact.
