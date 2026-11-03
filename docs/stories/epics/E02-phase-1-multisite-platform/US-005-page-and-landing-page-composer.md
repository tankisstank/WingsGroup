# US-005 Page And Landing Page Composer

## Status

in_progress

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
