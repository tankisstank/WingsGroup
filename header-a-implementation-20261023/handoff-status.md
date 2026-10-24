# US-085 — Kết quả cập nhật kế hoạch và giao việc

Ngày: 2026-10-23. Người dùng chọn A và yêu cầu giao agy triển khai, đổi hotline chính WingsGroup thành **0948 786 775 / tel:0948786775**.

## Cập nhật sau sửa và review độc lập

Agy đã sửa F1–F6, bàn giao AGY_US085_FIXES_READY và đóng băng source. Codex xác nhận local review PASS: 58 unit, 45 component, 16 release-gate tests và 44 case browser; typecheck/build/postbuild exit 0. Hotline chính WingsGroup mới đúng, không đổi tenant khác; CMS-cleared/no-op, targets 44px, popup 320px, VI/EN, keyboard và inquiry đều qua. Báo cáo đầy đủ: story audit.md/validation.md và codex-recheck/; phần dưới lưu lịch sử giao việc ban đầu.

Harness trace 312, US-085 in_progress, proof unit=1/integration=0/e2e=1/platform=1. Scoped plane:preview và plane:sync:workitems exit 0, patchedCount=5/missingCount=0. API verification 2026-10-23T07:32:58.998Z PASS: đúng project lõi/E09/US/4 children, Chờ xác nhận, mỗi item một owner c0508g, thiếu ngày=0, tên con chung chung=0. Parent start 2026-10-23, target kỹ thuật 2026-10-26.

Proof vẫn Partial: chưa PostgreSQL/Redis, browser zoom 200% thật hay production/ARM64; chưa deploy/push/ghi CMS production. Số live cần xác nhận ở bước phát hành riêng. Generated payload-types baseline vẫn được giữ, cần tách/giải thích trước đóng gói release.

## Đã làm

- Cập nhật số trong prototype `header-options-preview-20261023/so-sanh-header.html` và bổ sung quyết định cuối vào `header-contact-review-20261023/proposal.md`.
- Tạo story US-085 thuộc E09: overview, execplan, design, validation trong `docs/stories/epics/E09-wingsgroup-v3-public-experience/US-085-wingsgroup-header-contact-consolidation/`.
- Harness: intake **149**, trace **310**, story **in_progress**, proof unit/integration/e2e/platform đều **0** vì app chưa hoàn tất. Query lại story đã xác nhận trạng thái/evidence.
- Giao file `agy-task.md` cho **pane agy hiện hữu wP:p1** bằng `herdr pane run`. Quan sát agent đang đọc source/seed/release gates để triển khai local.
- Ranh giới: root quản lý kế hoạch/Harness/Plane/prototype; agy sửa app/test/data script và ghi `agy-implementation.md`. Bảo toàn các thay đổi ngoài US-085.

## Kế hoạch triển khai

1. Trace supportPhone và shared header; cập nhật nguồn seed WingsGroup, chuẩn bị tenant-scoped data update có preflight/idempotency/rollback.
2. Header A: link gọi chính + nút kênh phụ trong một cụm vàng; dropdown hotline phụ/Zalo/form, mobile gọn, VI/EN rõ và accessible.
3. Kiểm tra shared callers, form context, locale publication, empty/custom data, tenant isolation, collision và responsive bằng app thật.
4. Agy bàn giao code và proof; Codex audit trước đóng story hoặc phát hành. Mục tiêu **review kỹ thuật 2026-10-26**, không phải lịch production.

## Lệnh và kết quả

- `agent-browser --session header-options-20261023 open file:///E:/repo/WingsTravel/header-options-preview-20261023/so-sanh-header.html`: mở bản HTML đã cập nhật thành công.
- Browser eval `verify-preview.js`: **PASS 300 assertions / 24 cases** lúc 2026-10-23T04:42:39.135Z. Evidence `prototype-verification.json`.
- Browser assert link hotline: A/B có `tel:0948786775`, hiển thị số mới, không có link số cũ; **PASS** lúc 2026-10-23T04:42:51.766Z. Evidence `prototype-hotline-verification.json` và `prototype-updated-desktop.png`.
- Với `PLANE_STORY_IDS=US-085`, chạy từ app/: `pnpm run plane:preview` → 1 story / 4 children, đúng project và Đang thực hiện; `pnpm run plane:import:history` → exit 0; `pnpm run plane:sync:workitems` → exit 0, **patchedCount 5 / missingCount 0**.
- `node header-a-implementation-20261023/verify-plane.mjs --apply-metadata` → exit 0 / PASS; thêm đúng một owner c0508g và labels theo việc cho 5 items. API xác nhận project Nền tảng lõi WingsGroup, US-085 dưới Epic E09, 4 children, thiếu ngày **0**, tên con chung chung **0**, start 2026-10-23 / target 2026-10-26. Lần kiểm read-only lưu ở `plane-verification.json`.
- Harness CLI ban đầu từ chối intake type `feature`, proof `false`, trace outcome `in_progress`; đã đổi đúng hợp đồng thành `change request`, `0`, `partial` và ghi thành công. Query bảng `stories` lỗi, đã query bảng thật `story` và đọc đúng kết quả.

## Chưa kiểm / giới hạn

Chưa có proof app US-085 hoàn tất; browser proof trên đây chỉ áp dụng prototype. Chưa đổi CMS production, push/deploy, gọi số thật hoặc gửi lead/OA. Hai số phụ và tenant khác giữ cấu hình riêng. Agy phải kiểm app và chuẩn bị bước cập nhật CMS có điều kiện; số live chỉ được xác nhận trong lần phát hành được duyệt riêng.

Plane hiện cảnh báo gói không hỗ trợ Initiative/custom properties và một số API tạo Epic (E10 ngoài phạm vi). US-085 vẫn đã liên kết đúng Epic E09 hiện hữu, có đủ metadata và 4 việc con; không tạo cấu trúc trả phí mới.

## Production handoff — 2026-10-23

Supersedes earlier local-only status: user explicitly authorized deployment/CMS write. Codex deployed isolated release6a0dac0 at15:12:01+07; main WingsGroup hotline0948786775 persisted, additional hotlines and other tenants unchanged. Real encrypted backup/restore + PG transaction rehearsal/apply, ARM64/native/readiness,44 public responsive cases, VI/EN keyboard/inquiry and8 cross-site cases pass. Existing FAB dialog smoke shows new phone. Candidate, restore DB and owned tunnel/browser resources removed; backup/rollback retained. No push/schema write.

Harness trace313 / implemented with scoped proofs. Plane US085+4 children Đã bàn giao, EpicE09, missingCount0; API readback PASS, missingDates0/genericChildNames0. Original planned23–26October timeline retained; actual delivery23October recorded. Full evidence and limits: production-release/release-report.md. No real call/external Zalo/lead submit/device/true200% zoom/full repo suites; existing dev-push marker remains;3.6GB free VPS. Delivery does not imply customer acceptance.
