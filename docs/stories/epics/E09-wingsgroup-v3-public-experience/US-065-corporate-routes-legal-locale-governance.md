# US-065 Corporate routes, legal/locale và publication governance

## Trạng thái

Accepted engineering; Chờ xác nhận legal/privacy và publication governance.

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
- English route/chrome/metadata/editorial đã có locale completeness và native-quality English review được duyệt; policy routes vẫn hidden/404 cho tới khi legal/privacy approval có policy URL/version, retention và data-subject contact.
- Canonical, sitemap, security và tenant checks không được cho phép query/header/alias giả đổi site hoặc tạo unsafe ecosystem deep-link.
- Publication governance phân biệt route kỹ thuật đã render được với quyền công bố production; không đánh dấu story hay Epic là Delivered/Hoàn tất từ browser smoke local.

## Validation

| Layer | Expected proof |
| --- | --- |
| Integration | E09-30-31 final re-review: corporate routes/lead/media integration 30 tests passed. |
| E2E | E09-30-31 final re-review validated VI routes and the pre-approval fail-closed English `/en/lien-he` 404; sourcePath and locale/site boundary were verified. WP-EN-01 and EN-EDITORIAL-03 subsequently provide accepted English route/editorial evidence. |
| Platform | E09-50-51 final re-review: 27/27 route checks, tenant-forgery checks, robots/sitemap/pages-sitemap and security headers evidence. |
| Release | Policy/privacy publication remains intentionally blocked; English locale/editorial evidence is approved; no production GO claim. |

## Evidence

- `/home/docker-admin/.codex-orchestrator/runs/wings-e09-fidelity-20260814/reports/E09-30-31-rereview-3.json` — accepted SHA `ca7ccbae8ec2f5e5186e4a9ce81b4d8f134c7ea6`.
- `/home/docker-admin/.codex-orchestrator/runs/wings-e09-fidelity-20260814/reports/E09-50-51-rereview-1.json` — accepted engineering correction SHA `ebb4175b2b104f1b564232f7051282bc3881f574`.
- `/home/docker-admin/.codex-orchestrator/runs/wings-e09-en-editorial-audit-20260824/reports/EN-EDITORIAL-03-final.json` — independent Terra accepted SHA `95e887ec6da2f74a1a7403f0d8e4e62de95cc85d`; no P0/P1/P2 public-English findings.
- `docs/product/wingsgroup-v3-release-gates.json` (gate: `legal-identity`)
- `docs/product/wingsgroup-v3-release-gates.json` (gate: `privacy-consent`)
- `docs/product/wingsgroup-v3-release-gates.json` (gate: `locale-completeness`)

## Pending Gates

Privacy/consent source contract đã được stakeholder duyệt ngày `2026-08-24`;
runtime policy/consent proof vẫn là release work riêng. Consultation channels
và ecosystem destination validation vẫn optional/fail-closed; brand token/logo,
13-asset site-scope/publication authorization và English editorial review đã
approved. Environment gates được giữ ở US-066.
