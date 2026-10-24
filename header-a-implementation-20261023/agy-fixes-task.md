# US-085 — sửa finding sau Codex review

Người dùng yêu cầu tiếp tục sau review. Hãy thực hiện sửa ngay 5 finding P2, tự kiểm và bàn giao lại. Workspace `E:\repo\WingsTravel`, phương án A và hotline WingsGroup `0948786775` giữ nguyên.

## Đọc trước

- Audit đầy đủ: `E:\repo\WingsTravel\docs\stories\epics\E09-wingsgroup-v3-public-experience\US-085-wingsgroup-header-contact-consolidation\audit.md`.
- Contract gốc: overview/design/execplan/validation cùng thư mục story; handoff cũ `E:\repo\WingsTravel\header-a-implementation-20261023\agy-task.md`.
- Evidence Codex: `E:\repo\WingsTravel\header-a-implementation-20261023\codex-review\`. Đừng sửa/xóa bằng chứng fail cũ; lưu kết quả mới riêng.

## Phạm vi agy sở hữu

1. **F1 — CMS-cleared / noop:** sửa `app/scripts/updateWingsGroupHotline.ts` để chỉ đổi main old→new; new phải thật sự không ghi; null/empty không được coi là số cũ và tự điền lại. Không sửa additionalHotlines null/[]/custom. Dùng normalization hiện hữu khi phù hợp. Sửa fallback ở `app/src/blocks/WingsGroupContact/Component.tsx` để hotlines=[] không tạo số hardcode ngoài CMS. Thêm test wrapper Payload xác nhận dữ liệu ghi và số lần ghi, không chỉ test hàm pure.
2. **F2 — 320px:** sửa layout/CSS nhỏ nhất để logo, main call, arrow, hamburger không va chạm; popup nằm hoàn toàn trong viewport. Codex đo popup left=-3px và overlap 1.75–2.453125px. Không dùng overflow hidden để che lỗi. Giữ mobile có nhãn gọi rõ; đảm bảo vùng bấm theo design 44px nếu có thể từ constraint thật.
3. **F3 — mobile EN:** popup mobile dùng chung resolveHotlineItemLabel như desktop/drawer; giữ nhãn tùy chỉnh CMS; thêm regression EN.
4. **F4 — WingsGo EN:** khôi phục locale-aware aria-label cho main call mobile, không thay số WingsGo hoặc tenant khác; thêm VI/EN regression.
5. **F5 — keyboard:** Escape từ link trong mobile drawer phải trả focus về hamburger. Giữ ref nút và không phá dropdown Escape/outside-click. Test từ bên trong drawer.

## Phân công tránh đè file

- Agy sửa các app files trên và tests liên quan (HeaderNav, CSS, contact section, script/unit/component). Được dọn hai unused warnings do implementation tạo.
- Codex giữ toàn bộ docs/stories, manifest, Harness/Plane, artifact `codex-review/`, script kiểm ở root và baseline `app/scripts/wingsgroup-v3-release-gates.test.mjs`. Không sửa các file này.
- Không chạy build trong lúc sửa; Codex sẽ chạy build sau bàn giao để tránh xung đột .next/dev. Báo khi ngừng sửa source.
- `app/src/payload-types.ts` có diff generated ngoài báo cáo: media sizes và sắp xếp field tour. Chỉ giải thích provenance trong báo cáo; không tự reset/ghi đè.
- Không reset/xóa/sửa các thay đổi baseline khác, không push/deploy/production CMS, không gửi lead hay gọi số thật.
- Không spawn subagent con hay theo dõi pane root. Mỗi lệnh ghi một file, tối đa khoảng 15KB; patch section nếu file lớn, không Delete+Add, không minify.

## Kiểm và bàn giao

- Chạy focused unit/component, tsc, ESLint đúng changed files; browser thật bằng agent-browser nếu cần. Server root vòng review trước đã dừng theo phiên; kiểm port trước khi tự chạy. Nếu cần server, dùng local DB, không PAYLOAD_DB_PUSH=true.
- Reproducer F1 của Codex sẽ được root điều chỉnh để chấp nhận empty→no-op hoặc abort an toàn; yêu cầu không ghi. Không tự sửa artifact root để biến fail thành pass.
- Bàn giao từng F1–F5 với file, cách sửa, command/exit và evidence mới tại `E:\repo\WingsTravel\header-a-implementation-20261023\agy-fixes-report.md`, ảnh/log riêng `agy-fixes-evidence/`.
- Khi đủ kiểm và ngừng sửa code, trả marker **AGY_US085_FIXES_READY**. Nếu blocker thật, nêu lỗi cụ thể và làm tiếp phần độc lập. Không tự đóng US hoặc đánh dấu release hoàn tất.
