# US-081 — Đa Hotline Liên hệ & Tư vấn WingsGo có Click-to-Call (`tel:`)

## 1. Trạng thái (Status)

`Hoàn tất / Full` — người dùng xác nhận nghiệm thu ngày 2026-11-04; Harness giữ `implemented` và ghi xác nhận trong evidence. Release tích hợp `2265e13` đã kiểm chứng hotline CTA và bảo toàn tenant/draft. Biên bản nghiệm thu: `docs/releases/us-acceptance-20261104.md`. Trạng thái hiện tại: `docs/releases/us-status-20261104.md`.

Lịch sử: follow-up CTA bắt đầu 2026-11-02, production 2026-11-03. Bàn giao footer ngày
2026-10-24 bên dưới là bằng chứng lịch sử, không phải proof cho AC5.

Follow-up ngày2026-10-23 theo phản hồi trực tiếp của người dùng: footer WingsGo vẫn có theme selector, số cũ và nhiều CTA. Release d6057d4 trước đó chỉ rút gọn WingsGroup; không phải bằng chứng sửa WingsGo. Candidate đã được deploy production và CMS WingsGo đã được cập nhật theo wrapper transaction có row lock. Evidence: wingsgo-footer-review-20261023/.

## 2. Phân làn (Lane)

`high-risk` — bổ sung schema, migration và luồng dữ liệu multisite.

## 3. Hợp đồng Sản phẩm (Product Contract)

WingsGo dùng hotline chính `0948786775`, hai hotline phụ `0915250101` và `0915260101`. Số chính cũ `0912910101` chỉ được chuyển qua công cụ CMS có kiểm tra giá trị cũ; không đổi số tenant khác.

Hệ thống phải đảm bảo:
1. **Bảo tồn Hotline chính & Bổ sung Hotline phụ:**
   - Hotline chính: `0948 786 775` (tel: `0948786775`).
   - Hotline phụ 1: `0915 250 101` (tel: `0915250101`).
   - Hotline phụ 2: `0915 260 101` (tel: `0915260101`).
2. **Click-to-Call (`<a href="tel:...">`) trên Mọi Thiết bị:**
   - Mọi số điện thoại khi hiển thị bắt buộc phải bọc trong thẻ liên kết `<a href="tel:[so_chuan_hoa]">` với định dạng số sạch (không chứa khoảng trắng hay dấu chấm trong thuộc tính `href`, giữ nguyên số `0` ở đầu).
   - Khi người dùng chạm vào số điện thoại trên di động hoặc máy tính bảng, hệ thống kích hoạt ứng dụng quay số (dialer) ngay lập tức mà không cần copy/paste thủ công.
3. **Phân phối Điểm chạm UI/UX:**
   - **Header Desktop:** Giữ hotline chính gọi trực tiếp, có dropdown/popover hoặc nhóm chip số phụ tinh gọn, không làm vỡ bố cục thanh điều hướng.
   - **Header Mobile Navigation Drawer:** Liệt kê đầy đủ 3 đầu số với icon ☎/📞 và nhãn rõ ràng để gọi ngay.
   - **Footer:** Một link Gọi ngay / Call now tới hotline chính và một email ưu tiên supportEmail rồi salesEmail. Không lặp số phụ, Zalo, Nhận tư vấn Tour hoặc bộ chọn sáng/tối. Địa chỉ và navigation được giữ.
   - **Floating Action Button (SiteContactFab):** Giữ kênh phụ trong dialog; ẩn trigger khi footer vào viewport. Không tự đóng dialog đang mở; khi đóng ở footer, focus về link gọi footer.
   - **Modal Tư vấn Giữ chỗ (RetailTourConsultationDialog):** Cung cấp các nút gọi nhanh cho từng hotline và một nút Zalo OA chung qua `getSharedZaloCTA(siteCode, locale)`; người dùng đã chốt không dùng Zalo cá nhân theo số.
4. **An toàn Kiến trúc & Backward Compatibility:**
   - Collection `SiteSettings` giữ nguyên trường `supportPhone: text` làm hotline chính (tránh breaking change cho các tenant khác và database migrations).
   - Bổ sung trường `additionalHotlines` (dạng array) trong CMS.
   - Tạo helper dùng chung `resolveSiteHotlines(settings, defaultSiteCode)` chuẩn hóa, lọc trùng và giữ nguyên số 0 đầu.
   - Chỉ WingsGo nhận fallback. Trường `additionalHotlines` chưa tồn tại (`undefined`) dùng hai số phụ mặc định; `[]` hoặc `null` nghĩa là CMS đã chủ động bỏ số phụ. Không tái thêm các số đã xóa khi đọc dữ liệu hay chạy lại migration.
   - Giữ nguyên hotline chính hợp lệ do CMS cấu hình; số Việt Nam dạng `+84` được chuẩn hóa về `0`, các tenant khác giữ định dạng quốc tế hợp lệ.

## 4. Hành vi trước triển khai ban đầu (Historical Behavior)

- WingsGo chỉ hiển thị một đầu số duy nhất là `0912 910 101`.
- Số điện thoại bị hardcode phân tán tại Header, Footer, Fab, Modal mà chưa có cơ chế quản lý danh sách đa hotline thống nhất.

## 5. Hành vi Đích (Target Behavior)

- Khách có thể gọi chính `0948 786 775`; các số phụ `0915 250 101`, `0915 260 101` được giữ ở menu và dialog, không dàn hàng trong footer.
- Mọi vị trí hiển thị đều có link `<a href="tel:..."` click gọi ngay trên di động.
- Quản trị viên CMS có thể cấu hình thêm/bớt số hotline phụ trong `SiteSettings`.

## Acceptance Criteria

Tiêu chí chấp nhận theo thứ tự AC1–AC5; ba đầu số và định dạng được quy định tại Hợp đồng Sản phẩm.

- Giữ kênh phụ trong menu; rút gọn liên hệ footer.
- Gọi trực tiếp qua liên kết `tel:` chuẩn hóa và bộ quay số trên mobile.
- Giữ menu desktop gọn, gọi số chính và mở danh sách hotline phụ.
- Bảo toàn cấu hình và giao diện liên hệ của các site khác.
- Đồng bộ hotline trong CTA các trang WingsGo.

## Follow-up CTA — 2026-11-02

Owner c0508g; bắt đầu 2026-11-02. Candidate local tại
`followups-20261102/candidate`, baseline `8efdbbf`. Mốc review là ngày kiểm
thực tế, không kế thừa hạn hay proof bàn giao cũ. Không ghi production.
Kiểm kê sitemap public: 88 URL HTTP 200, 4 URL có CTA, 3 URL còn số cũ
(`/`, `/campaign`, `/thi-truong`); `/en` có CTA không dùng số cũ.
API CMS public trả 403; inventory này không chứng minh trạng thái draft.
Evidence mới: `followups-20261102/public-cta-inventory.json`.

AC5 bao gồm mô tả, nhãn và tel của CTA đã xuất bản theo từng locale;
inventory, dry-run, snapshot trước ghi, kiểm đồng thời trong giao dịch
PostgreSQL, verify, noop và rollback có mục tiêu. Bảo toàn draft editor,
hotline phụ và tenant khác.

Review candidate 2026-11-02: 36 kiểm thử tập trung và 2 kiểm thử PostgreSQL thực qua; có VI/EN, noop, snapshot sửa trái phép, tenant khác, draft, stale version, rollback và writer đồng thời bị row lock chặn. Codex review lần đầu có ba finding P2: ghi đè journal khi chạy lại, rewrite sau commit làm hỏng recovery, transaction leak khi lock lỗi. Đã sửa bằng journal `wx` + fsync bất biến và rollback ngay trong helper lock; ba kiểm thử hồi quy qua. Typecheck và ESLint exit 0 (còn cảnh báo any trong mock/adapter). Browser local xác nhận mô tả/nhãn/tel mới và số phụ nguyên vẹn. Follow-up đang rà soát, proof Partial; chưa phát hành. Các log và review ở `followups-20261102/`.

## Follow-up light theme và an toàn dữ liệu

WingsGo cố định light từ SSR và ThemeProvider, không dùng stored dark/system preference; không chỉ che selector bằng CSS. WingSide và tenant khác giữ preference hiện hữu. Form WingsGo dùng hotlines đã nhận từ RenderBlocks thay số viết cứng; prop[] không tạo lại link gọi. Seed/fallback WingsGo đồng bộ số mới, nhưng số hợp lệ do CMS cấu hình vẫn là nguồn ưu tiên.

Production audit read-only ngày23/10: settingsID16 WingsGo vẫn0912910101, settingsID14 WingsGroup đã0948786775; không ghi dữ liệu. Công cụ updater mặc định plan, chỉ old→new; new/empty→noop, custom/invalid→abort, không chạm additionalHotlines. Production apply cần backup, rehearsal PostgreSQL và shared transaction/row lock theo runbook trước release. Không seed lại toàn bộ nội dung.

## Production release — 24/10/2026

- Revision: `16ff60a28ba48489d7d06de648780c522372e13f`.
- CMS WingsGo settings ID16: main hotline `0948786775`; additional hotlines và tenant khác giữ nguyên.
- Footer production: một link gọi, một email ưu tiên, không theme selector, không lặp CTA/Zalo/số phụ.
- Health ready sau cutover: database, Redis, lead delivery đều đạt.
- Kỹ thuật đã bàn giao; stakeholder UAT và kiểm tra thiết bị thật còn chờ xác nhận.


## Production follow-up — 2026-11-03

Production follow-up delivered 2026-11-03, owner c0508g, revision5b81a19d663f2f78a04d0e411fcfa0afbd416c4a. Bounded Payload CTA/H1 apply verified:556 page-locales/6sites,only3 changed locales,all1399 media unchanged,drafts preserved; rerun noop. ARM64 media path defect found by public browser QA, rolled back and fixed with3unit/typecheck/ESLint/build and independent Codex noP1/P2/P3. Fresh encrypted PG backup+disposable restore,28/28 migrations,immutable image gate,readiness passed. Production desktop1440/mobile390 verifies hotline0948786775,newVIH1,EN unchanged,caption scope,playing video and4WingsPlus descriptions pre-line/nooverflow. Evidence followups-20261102/PRODUCTION-REPORT.md. Technical delivery is not stakeholder acceptance; real calls/leads and physical Safari/iOS not exercised.

- Deployed code: `5b81a19d663f2f78a04d0e411fcfa0afbd416c4a`, branch `work/followups-20261102-us081-088-005`.
- Release: `/home/ubuntu/wings-travel/releases/release-5b81a19`; previous `release-us093-8efdbbf` retained.
- CMS journals remain protected on VPS at `shared/artifacts/followups-642b857/{cta-apply,heading-apply}.json`. No shared media edits or database restore performed.
- New follow-up state: **Đã bàn giao / Full**, start2026-11-02, delivery/review2026-11-03. Earlier dated candidate-only and historical delivery entries remain as history.
- Evidence: `followups-20261102/production-content-verify-final.log`, `production-media-gates-2.log`, `production-media-cutover-2.log`, `production-browser-qa.json`, four production screenshots, `production-media-codex-review.md` plus original independent reviews. No unresolved P1/P2/P3.

Resolved production findings: campaign identity now follows exact public pathname despite namespaced CMS slug; standalone preserves traced database driver packages; media directory now resolves from runtime app-root cwd. The first media-defective image was rolled back immediately after public QA; final preview tested actual1024-byte206 media response before cutover. Existing preview-store restrictions and tenant access checks remain intact.
