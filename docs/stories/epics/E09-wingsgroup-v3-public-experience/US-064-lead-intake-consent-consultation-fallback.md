# US-064 Consent lead-intake và consultation fallback

## Trạng thái

Accepted engineering; privacy contract đã được duyệt, Chờ xác nhận runtime và
production delivery approval.

## Lane

high-risk

## Product Contract

Contact intake của WingsGroup phải thu thập đúng name/brief/consent, ghi được
ngữ cảnh route/site/locale và retention, đồng thời có fallback nội bộ khi các
kênh tư vấn ngoài chưa được cấu hình. Production phải fail-closed cho tới khi
runtime policy/consent proof và delivery owner được duyệt; source privacy/consent
contract đã được stakeholder duyệt ngày `2026-08-24`.

## Relevant Product Docs

- `docs/product/wingsgroup-v3-release-gates.json`
- `docs/product/wingsgroup-v3-fidelity-contract.json`
- `docs/product/multisite-platform.md`
- `docs/product/editorial-operations.md`

## Acceptance Criteria

- Form chỉ yêu cầu full name, brief/need và consent version `wingsgroup-contact-v1`; CTA dùng đúng `Nhận tư vấn phù hợp`.
- Preferred-channel control hiển thị lựa chọn nội bộ và ba channel pending-update, tất cả external href đều null cho tới khi được duyệt.
- Submit không có consent bị từ chối; local explicit draft preview chỉ ghi synthetic/run-owned sink với locale, site, sourcePath, consentedAt và retentionUntil.
- Signed local-preview grant phải gắn đúng draft cookie, user, site và locale; missing, arbitrary, corrupt, expired hoặc replayed grant không được tiết lộ pending configuration.
- Production không nhận pending lead và không suy ra privacy/endpoint approval từ local preview; fallback chỉ ghi nhận channel preference hoặc giữ form unavailable.
- Consultation endpoint chỉ được bật sau khi có approved URL, named owner, SLA và tracking proof; không tự thêm URL trong story này.

## Validation

| Layer | Expected proof |
| --- | --- |
| Unit | E09-30-31 final re-review: 6 files, 50 tests passed; signed grant adversarial cases passed. |
| Component | Lead form component: 10 tests passed, consent and pending-channel controls covered. |
| Integration | Lead submission, corporate routes và media access: 30 tests passed; sourcePath `/lien-he` và retention proof recorded in run-owned sink. |
| E2E | Desktop 1440x900 và mobile 390x844: one consent control, one preferred-channel control, zero external links, no overflow. |
| Release | Production missing/forged local grant/context returned 400; no pending configuration disclosure. |

## Evidence

- `/home/docker-admin/.codex-orchestrator/runs/wings-e09-fidelity-20260814/reports/E09-30-31-rereview-3.json` — accepted SHA `ca7ccbae8ec2f5e5186e4a9ce81b4d8f134c7ea6`.
- Stakeholder-approved privacy and consent contract, 2026-08-24: `/chinh-sach-bao-mat`, `/en/chinh-sach-bao-mat`, retention 24 months, data-subject contact `info@doicanhviet.com`, inter-branch routing allowed.
- `docs/product/wingsgroup-v3-release-gates.json` (gate: `privacy-consent`)
- `docs/product/wingsgroup-v3-release-gates.json` (gate: `consultation-channels`)

## Pending Gates

Source privacy/consent approval đã hoàn tất ngày `2026-08-24`; runtime policy
routes, consent persistence, migration/seed, production smoke và consultation
endpoint owner/SLA/tracking còn pending. Không có production lead-delivery
approval trong evidence này.
