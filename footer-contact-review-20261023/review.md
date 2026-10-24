# US-085 — rút gọn liên hệ cuối trang

Ngày: 2026-10-23. Phản hồi mới của người dùng sau khi header A đã được phát hành trong release6a0dac0 lúc15:12+07.

## Thay đổi

- WingsGroupContactSection: form vẫn là hành động chính; phần trao đổi trực tiếp chỉ còn một link Gọi ngay / Call now và hotline đầu tiên nhận từ CMS. Giữ fallback cũ khi prop undefined; [] không tự chèn số hoặc để lại lời mời gọi trống.
- Footer WingsGroup v3: một hotline đã qua resolver, một email ưu tiên supportEmail rồi salesEmail. Bỏ hotline phụ, Zalo và CTA tư vấn lặp trong footer. Header disclosure vẫn cung cấp các kênh phụ.
- Giữ dữ liệu CMS, form, consent, menu Liên hệ, pháp lý, địa chỉ và hành vi WingsGo/WingSide/WingsGroup non-V3. Không thêm schema, migration hay dependency.
- Link gọi cạnh form và trong footer có vùng bấm cao tối thiểu44px. Sửa biểu tượng điện thoại bị nằm trên số bằng căn flex trong phạm vi footer V3.

## Phân công và review Codex

Agy trong pane Herdr wP:p1 sửa Footer/Component.tsx và footerHotlines.component.spec.tsx. Codex sửa contact section, hai stylesheet hiện hữu, mở rộng test header/contact, review độc lập, browser QA và tracking. Biên bản agy: agy-report.txt.

| Finding | Xử lý |
| --- | --- |
| P3: nhánh footer mới sao chép cả markup contact | Đổi thành footerEmail/footerHotlines, tái sử dụng markup cũ. |
| P2: fixture hotline phụ dùng phone thay phoneNumber, có nguy cơ test false-positive | Sửa đúng schema, dùng Partial<SiteSetting>, bỏ cast kép che lỗi. Non-V3 regression xác nhận số phụ thật sự còn được render. |
| P2: số chính invalid + email có thể rơi xuống tel raw | V3 không chạy fallback raw; thêm test invalid main + email. |
| P3: biểu tượng điện thoại tách dòng khỏi số trên mobile | Căn cùng hàng, min-height44px; ảnh mới và browser assertion sau sửa. |

Không còn finding P1/P2/P3 chưa xử lý trong phạm vi hiển thị này. Không thay luồng dữ liệu, quyền truy cập hoặc cache; không ghi CMS.

## Kiểm chứng thật

| Lệnh | Kết quả |
| --- | --- |
| pnpm run test:component -- sáu file header/contact/footer/FAB/WingSide/homepage | Exit0,59/59; component-final.log. jsdom có cảnh báo navigation chưa implement; điều hướng/layout kiểm riêng bằng browser. |
| pnpm exec tsc --noEmit --incremental false | Exit0; typecheck-final.log. |
| pnpm exec eslint trên bốn TS/TSX thay đổi | Exit0,0 error/0 warning; lint-final.log. CSS không thuộc cấu hình eslint, kiểm bằng browser/build. |
| powershell -NoProfile -ExecutionPolicy Bypass -File footer-contact-review-20261023/check-browser.ps1 | Exit0,16/16; browser-results.json. Home/contact VI/EN ×320/390/768/1280, đúng số lượng link, đúng CMS main/email, không overflow, link gọi≥44px. |
| pnpm run build với PAYLOAD_DB_PUSH=false | Exit0, gồm postbuild prepare-standalone; build.log. Windows/local SQLite, chưa phải build ARM64. payload-types.ts giữ nguyên hash trước/sau. |

Codex đã xem ảnh trước, after-contact-vi-desktop.png và ảnh footer EN320 sau sửa cuối. Browser exception buffer rỗng: browser-errors.txt. Các ảnh desktop/mobile khác cùng thư mục.

Hai lỗi của runner được giữ làm bằng chứng: PowerShell5 đọc expected Vietnamese không BOM thành mojibake (đã đổi Unicode escape); computed display của flex item là flex dù CSS khai báo inline-flex (đã kiểm alignItems/chiều cao thực). browser-results-first-pass.json, browser-results-encoding-diagnostic.json, browser-results-css-diagnostic.json không phải bằng chứng app đạt.

## Trạng thái và giới hạn

Follow-up chỉ ở local; chưa deploy hoặc ghi CMS production. Header release6a0dac0 vẫn là bản production. Local homepage fixture không có contact form; form thật được kiểm trên /wingsgroup/lien-he và /wingsgroup/en/lien-he, cùng component được dùng khi homepage có form block.

Local lead configuration đang trả400 và form hiện thông báo chưa khả dụng; không đổi cấu hình hay submit. Chưa kiểm gửi lead thành công, gọi điện thật, chat Zalo, thiết bị vật lý hoặc toàn bộ integration/E2E suite. Đây là giới hạn kiểm thử, không phải xác nhận lỗi production.
