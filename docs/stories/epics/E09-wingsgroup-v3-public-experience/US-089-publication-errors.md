# US-089 Hiển thị rõ lỗi duyệt khi xuất bản WingsGroup

## Status

implemented

## Lane

normal — bounded error presentation fix; no changes to approval conditions, authorization, data schema or migrations.

## Product Contract

When WingsGroup publication is rejected after an editor changes content or an image, CMS must display a Vietnamese explanation and the required next action instead of a generic server error. Draft saving must remain available and existing publication/security checks stay enforced.

## Relevant Product Docs

- `docs/product/wingsgroup-v3-public-experience.md`
- `docs/stories/epics/E09-wingsgroup-v3-public-experience/US-063-publication-brand-proof-editorial-gates.md`
- `wingsplus-companytrip-editor-20261027/investigation.md`

## Acceptance Criteria

- Hướng dẫn lưu nháp và duyệt lại khi nội dung đã thay đổi.
- Nêu rõ cần duyệt tiếng Việt khi xuất bản VI hoặc EN.
- Giải thích lỗi cấu hình xuất bản hoặc phê duyệt chính sách.
- Giữ lưu nháp, xuất bản có quyền và cách ly site hoạt động.
- Kiểm tra CMS trên bản sao và giữ nguyên dữ liệu trang 375.

## Design Notes

- Reuse Payload APIError for expected publication rejections in `validateWingsGroupV3Governance`.
- Keep all existing gate predicates intact. Only distinguish missing content approval from other gate reasons for the message.
- Existing callers: Pages beforeChange pipeline. Tests: corporate-route hook integration suite and an isolated browser reproduction.
- Deployment candidate starts at current live revision 8a0e470; do not include unrelated dirty workspace changes.

## Validation

| Layer | Expected proof |
| --- | --- |
| Unit | Existing corporate route publication-state tests |
| Integration | Public error status/message for both rejection paths; draft and authorized publish regression |
| E2E | Actual CMS browser displays the specific rejection on isolated data |
| Platform | ARM64 candidate readiness and unchanged production Page 375 data |
| Release | Independent Codex review before deployment/closure |

## Harness Delta

Intake 167; US-089 under E09, default owner c0508g. Sync Plane with actual proof/status after implementation.

## Evidence

Investigation confirms Page 375 image 1419 was saved as draft at 2026-10-27 15:36 Asia/Bangkok; production rejected publication with missing Vietnamese content approval. No production content edits are part of this fix.

### Delivered 2026-10-27

- Release `befe6efaacf5c14f0b3c8f970cb9a4bf3c27f7c2`, production cutover at `2026-10-27T09:24:42Z` (16:24 Asia/Bangkok), BUILD_ID `fJapQGuuwu5Gm4fipQzVB`.
- App ARM64 digest `sha256:a46cd38d3cef58d814b274c9417e1f50cc8e1b5c21181da2ecee9505bde511f4`; ops `sha256:4937124174f4ace3710e870f76053c757e2b785fb6a9a805d408fac487ddad98`. Exact revision labels checked; previous immutable release retained for rollback.
- Expected publication rejections now use Payload public APIError 400 with Vietnamese cause and next action. Gate predicates, authorization, schema and migrations unchanged.
- `pnpm run test:unit tests/unit/wingsGroupCorporateRoutes.unit.spec.ts`: exit 0, 18 passed.
- `pnpm run test:int tests/int/wingsGroupCorporateRoutes.int.spec.ts`: exit 0, 18 passed in candidate and main workspace; includes EN-approved successful control and missing-VI failures.
- `pnpm run build`: exit 0, TypeScript passed. `deploy/oracle/package-release.ps1`: exit 0; generated relink is required build output, generator source unchanged.
- Actual Edge CMS on isolated PostgreSQL clone: VI and EN publication show missing-Vietnamese-review guidance; changing Company Trip image autosaves. Payload confirms persisted draft image and authorized super-admin publication succeeds. See `wingsplus-companytrip-editor-20261027/browser-proof.md` and `verify-clone.log`.
- Fresh encrypted backup restored successfully: 6 sites, 6 homepages, checksum `4253ce18e50a16156e0f8124dd96e877f2c68fde0b9083c261710630c61544b1`. All 52 migrations already applied; no migration/schema writes.
- Fresh ARM64 Sharp WebP encode/decode passed. Production readiness: database up, Redis up, leadDelivery configured.
- Production page 375, draft, 6 versions and media1419 hash unchanged: `a4bca3a27da7d6c1d55d373d35a0391eeb577b1c36b9512668957fdbf11abc2d` (`snapshot-before.log`, `snapshot-after.log`). Actual public page renders all four service cards and CTA.

### Review finding closure

- P2 pending runtime/restore evidence: resolved by browser clone proof, persisted image/read-only production snapshots, authorized publication, backup restoration, exact ARM64 image labels and readiness.
- P3 ambiguous EN fixture: resolved by English-approved settings and a successful control with Vietnamese approval present.
- Generated relink scope concern: resolved by independent evidence review confirming the committed generator and runbook require generation for the actual standalone dependency tree. Fresh native encode/decode additionally passed.
- Independent Codex verdict `SHIP`, no unresolved P1/P2/P3: `wingsplus-companytrip-editor-20261027/evidence-review.md`. Earlier reviews and original findings remain in the task folder.

### Limits

Authenticated CMS post-cutover inspection redirected to login because the existing session expired. No production Publish button was submitted. Error UI and writes were verified on the exact candidate against the disposable PostgreSQL clone; the production deployment, public page and unchanged content hashes were independently checked. No physical-device or unrelated full-suite run.
