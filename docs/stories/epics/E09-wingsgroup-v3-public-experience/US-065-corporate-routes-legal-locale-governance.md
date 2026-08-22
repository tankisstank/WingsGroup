# US-065 Corporate routes, legal/locale và publication governance

## Trạng thái

Accepted engineering; Chờ xác nhận legal, editorial và locale publication.

## Lane

high-risk

## Product Contract

Các route corporate WingsGroup phải site-aware, giữ đúng identity đã duyệt,
không leak English hoặc policy draft, và chỉ publish nội dung khi route/locale
đã qua gate tương ứng. Fail-closed là hành vi có chủ ý khi approval chưa đủ.

## Relevant Product Docs

- `docs/product/wingsgroup-v3-release-gates.json`
- `docs/product/wingsgroup-v3-fidelity-contract.json`
- `docs/product/multisite-platform.md`
- `docs/product/go-live-review-pipeline.md`
- `source/strategy/19 Kiến trúc đề xuất nội bộ WingsTravel Payload.md`

## Acceptance Criteria

- Các route VI corporate `/`, `/ve-wingsgroup`, `/nang-luc-dich-vu`, `/tin-cay-va-phap-ly`, `/tin-tuc` và `/lien-he` resolve đúng WingsGroup site context.
- Legal route chỉ render exact approved identity/relationship wording; không thêm policy, proof, partner, review hoặc certification claim chưa có nguồn.
- Privacy, terms và payment-policy routes giữ 404/unpublished cho tới khi legal/privacy approval có policy URL/version, retention và data-subject contact.
- English route/chrome/metadata/editorial giữ hidden/404 cho tới khi locale completeness và native-quality English review được duyệt.
- Canonical, sitemap, security và tenant checks không được cho phép query/header/alias giả đổi site hoặc tạo unsafe ecosystem deep-link.
- Publication governance phân biệt route kỹ thuật đã render được với quyền công bố production; không đánh dấu story hay Epic là Delivered/Hoàn tất từ browser smoke local.

## Validation

| Layer | Expected proof |
| --- | --- |
| Integration | E09-30-31 final re-review: corporate routes/lead/media integration 30 tests passed. |
| E2E | E09-30-31 final re-review: VI routes render in preview; English `/en/lien-he` returns 404; sourcePath and locale/site boundary verified. |
| Platform | E09-50-51 final re-review: 27/27 route checks, tenant-forgery checks, robots/sitemap/pages-sitemap and security headers evidence. |
| Release | Policy and English publication remain intentionally blocked; no production GO claim. |

## Evidence

- `/home/docker-admin/.codex-orchestrator/runs/wings-e09-fidelity-20260814/reports/E09-30-31-rereview-3.json` — accepted SHA `ca7ccbae8ec2f5e5186e4a9ce81b4d8f134c7ea6`.
- `/home/docker-admin/.codex-orchestrator/runs/wings-e09-fidelity-20260814/reports/E09-50-51-rereview-1.json` — accepted engineering correction SHA `ebb4175b2b104f1b564232f7051282bc3881f574`.
- `docs/product/wingsgroup-v3-release-gates.json` (gate: `legal-identity`)
- `docs/product/wingsgroup-v3-release-gates.json` (gate: `privacy-consent`)
- `docs/product/wingsgroup-v3-release-gates.json` (gate: `locale-completeness`)

## Pending Gates

Legal/privacy/consent approval, editorial media/English copy, brand token/logo
và ecosystem destination validation còn pending; environment gates được giữ ở
US-066.
