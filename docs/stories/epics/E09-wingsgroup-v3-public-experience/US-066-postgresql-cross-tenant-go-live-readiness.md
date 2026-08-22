# US-066 PostgreSQL, cross-tenant và go-live readiness

## Trạng thái

Accepted engineering; Chờ xác nhận PostgreSQL rehearsal và launch gates.

## Lane

high-risk

## Product Contract

E09 phải có evidence cho migration PostgreSQL additive-safe, tenant isolation,
proxy/media fail-closed và go-live review. Local SQLite và browser smoke chỉ là
proof môi trường phát triển; không được nâng thành staging/production evidence.

## Relevant Product Docs

- `docs/product/wingsgroup-v3-release-gates.json`
- `docs/product/go-live-review-pipeline.md`
- `docs/product/multisite-platform.md`
- `source/strategy/18 Áp dụng Payload vào dự án WingsTravel.md`
- `source/strategy/19 Kiến trúc đề xuất nội bộ WingsTravel Payload.md`

## Acceptance Criteria

- E09 migrations có registry/order, additive guards, replay-safety và down-path review; không dùng SQLite để thay thế PostgreSQL rehearsal.
- Anonymous Payload collections và raw/forged media access fail-closed; cross-tenant page/form/media relations bị từ chối.
- Preserved proxy context phải có signature, freshness/replay boundary và media alias không được bypass governance; pending media bị deny trên direct, alias, locale và forged-header paths.
- Go-live pipeline chạy được explicit WingsGroup route inventory, kiểm tra advertised sitemap children, retry timeout đúng cách và không biến environment-inconclusive thành launch pass.
- Evidence phải ghi riêng technical acceptance, human publication gates và environment blockers; không kết luận production GO từ local SQLite/Webpack run.
- Disposable PostgreSQL rehearsal và Harness matrix phải được chạy ở môi trường được cấp trước khi có thể nâng readiness status.

## Validation

| Layer | Expected proof |
| --- | --- |
| Unit | E09-40-41 final re-review: proxy/media, migration safety và foundation focused suites passed; E09-50-51 final re-review: 23 go-live pipeline tests passed. |
| Integration | E09-40-41 final re-review: site access, domain, media/context/foundation suites passed; cross-tenant isolation verified. |
| Platform | E09-40-41 final re-review denied pending media on direct/default/tenant/locale/raw/forged paths; E09-50-51 completed 27/27 local route checks. |
| Release | PostgreSQL rehearsal chưa chạy vì không có disposable loopback target/client; Harness query báo thiếu `harness.db` và không được initialize. Production launch vẫn blocked. |

## Evidence

- `/home/docker-admin/.codex-orchestrator/runs/wings-e09-fidelity-20260814/reports/E09-40-41-rereview-1.json` — accepted SHA `d7215b54c8c62fa56eaee139fab190e8dd65cb0c`.
- `/home/docker-admin/.codex-orchestrator/runs/wings-e09-fidelity-20260814/reports/E09-50-51-rereview-1.json` — accepted engineering correction SHA `ebb4175b2b104f1b564232f7051282bc3881f574`; recommendation `accept_engineering_correction; production_launch_blocked_pending_human_gates`.
- `bash scripts/harness query matrix` — exact result: database absent; no initialization performed.

## Pending Gates

Disposable PostgreSQL rehearsal and missing Harness DB are environment gates.
Human gates remain legal/privacy/consent, proof publication rights, brand
token/logo, editorial media/English copy, consultation owner/SLA/tracking và
ecosystem destination validation.
