# US-088 — Xuất bản trang giới thiệu WingsPlus

## Status — đối soát 2026-11-04

implemented / Đã bàn giao, proof Full. Release tích hợp `2265e13` đã kiểm chứng bốn nhóm dịch vụ giữ newline ở 1440/390, không tràn ngang và nhãn hệ sinh thái đồng bộ. Chưa có xác nhận nghiệm thu stakeholder.

Trạng thái hiện tại: `docs/releases/us-status-20261104.md`. Các mốc review candidate và bàn giao bên dưới là lịch sử.

## User Story

Là khách tìm hiểu WingsPlus, tôi muốn đọc trang giới thiệu có bốn nhóm dịch vụ và nút trao đổi với chuyên viên, để chọn hướng tư vấn phù hợp trước khi gửi yêu cầu.

## Scope

Theo đính chính của người dùng ngày 2026-10-27, trang giới thiệu thuộc site wings-group tại wingsgroup.vn/gioi-thieu-wingsplus, quản lý trong CMS → Pages → WingsGroup → Giới thiệu WingsPlus → Content/Layout. Trang thuộc tenant WingsGroup, dùng Hero, Feature Grid và CTA hiện có. Khối hệ sinh thái chỉ dùng mô tả ngắn: “Hành trình riêng, Company Trip, MICE và các chương trình thiết kế theo yêu cầu.” Không đưa bốn nhóm nội dung dài vào khối này.

CTA trên trang mới: “Trao đổi với chuyên viên”, dẫn tới /lien-he#contact-form của WingsGroup. CTA WingsPlus trong hệ sinh thái: “Xem giới thiệu”, dẫn tới trang giới thiệu trên WingsGroup. Nội dung bốn nhóm lấy từ bản editor cung cấp: Company Trip, MICE, Private Tour, Wellness & Medical Travel.

Phạm vi kỹ thuật cần thiết: bổ sung đúng một route giới thiệu được quản trị /gioi-thieu-wingsplus, giữ inventory và seed mười corporate routes hiện hữu; tiếp tục kiểm tra tenant, locale, approval và media. Phát hành phần đơn giản hóa CTA đã yêu cầu trong US-087 để CMS có thể lưu mô tả và liên kết mà không yêu cầu năm trường evidence không phù hợp. Không tạo collection hoặc schema mới; giữ cột cũ để tương thích dữ liệu và rollback. Page372 trên wingsplus.vn là kết quả hiểu sai trước đính chính, không được tính là bằng chứng hoàn tất; chuyển trang tự tạo này về draft sau khi trang đúng chạy được.

## Ownership and Dates

Owner c0508g; bắt đầu 2026-10-27. Epic E09, project Core. Site nội dung là WingsGroup. Ngày kiểm tra và bàn giao ghi theo bằng chứng thực tế.

## Acceptance Criteria

- Tạo trang /gioi-thieu-wingsplus trên WingsGroup có Hero và metadata đúng site.
- Trình bày đủ bốn nhóm dịch vụ bằng Feature Grid.
- Dẫn CTA Trao đổi với chuyên viên tới form WingsGroup.
- Giữ mô tả hệ sinh thái ngắn, CTA Xem giới thiệu mở /gioi-thieu-wingsplus; bảo toàn nội dung và draft hiện hữu.
- Kiểm tra production trên desktop và mobile, lưu review và bằng chứng.
- Cập nhật trạng thái, kết quả Harness và Plane theo thực tế.
- Giữ xuống dòng trong mô tả bốn nhóm dịch vụ WingsPlus.

## Follow-up 2026-11-02 — AC7

Owner c0508g. Bắt đầu và review candidate ngày 2026-11-02; trạng thái Đang rà soát, proof Partial. Lịch sử bàn giao 2026-10-27 bên dưới và trong validation/audit vẫn được giữ nguyên; follow-up chưa phát hành.

Feature Grid giữ nguyên textarea và dữ liệu CMS, dùng `white-space: pre-line` và ngắt chữ dài cho mô tả thẻ lẫn phần chi tiết accordion/tabs. Ba kiểm thử component bao gồm newline, dòng trống, một dòng và chữ dài. Browser local dùng nguyên nội dung công khai bốn nhóm Company Trip, MICE, Private Tour, Wellness & Medical Travel: giữ 7/4/6/7 newline, không tràn ngang ở 1440px và 390px. Accordion mở và giữ pre-line. Typecheck và ESLint exit 0.

Bằng chứng đợt mới: `followups-20261102/us088-component.log`, `us088-browser-desktop.json`, `us088-browser-mobile.json`, `us088-detail-click.json`, ảnh `wingsplus-desktop.png` / `wingsplus-mobile.png`. Candidate ở `followups-20261102/candidate`; chưa push/deploy/publish.

## Implementation and Rollback

Kiểm tra tồn tại route trước khi tạo; lưu bằng chứng sửa vị trí trong wingsplus-on-wingsgroup-20261027. Candidate tách riêng từ source production; không kéo thay đổi ngoài phạm vi từ working tree. Tham vấn Codex trước thay đổi governance và trước release; tuân thủ runbook ARM64. Dùng CMS/Payload hiện có, không sửa database trực tiếp. Lưu snapshot published và latest draft trước khi sửa ecosystem; giao dịch có kiểm tra đồng thời, không phát hành Hero draft của editor. Nếu lỗi, rollback image và đúng nội dung do tác vụ thay đổi; giữ cột lịch sử.

## Verification

Kiểm tra nội dung render, một H1, bốn thẻ, CTA thực sự mở form, ảnh tải được nếu dùng ảnh, không tràn ngang mobile. Không gửi lead thật. Không coi HTTP 200 hoặc tìm chuỗi là đủ bằng chứng. Các hạn chế sẽ ghi vào validation.md.


## Production follow-up — 2026-11-03

Production follow-up delivered 2026-11-03, owner c0508g, revision5b81a19d663f2f78a04d0e411fcfa0afbd416c4a. Bounded Payload CTA/H1 apply verified:556 page-locales/6sites,only3 changed locales,all1399 media unchanged,drafts preserved; rerun noop. ARM64 media path defect found by public browser QA, rolled back and fixed with3unit/typecheck/ESLint/build and independent Codex noP1/P2/P3. Fresh encrypted PG backup+disposable restore,28/28 migrations,immutable image gate,readiness passed. Production desktop1440/mobile390 verifies hotline0948786775,newVIH1,EN unchanged,caption scope,playing video and4WingsPlus descriptions pre-line/nooverflow. Evidence followups-20261102/PRODUCTION-REPORT.md. Technical delivery is not stakeholder acceptance; real calls/leads and physical Safari/iOS not exercised.

- Deployed code: `5b81a19d663f2f78a04d0e411fcfa0afbd416c4a`, branch `work/followups-20261102-us081-088-005`.
- Release: `/home/ubuntu/wings-travel/releases/release-5b81a19`; previous `release-us093-8efdbbf` retained.
- CMS journals remain protected on VPS at `shared/artifacts/followups-642b857/{cta-apply,heading-apply}.json`. No shared media edits or database restore performed.
- New follow-up state: **Đã bàn giao / Full**, start2026-11-02, delivery/review2026-11-03. Earlier dated candidate-only and historical delivery entries remain as history.
- Evidence: `followups-20261102/production-content-verify-final.log`, `production-media-gates-2.log`, `production-media-cutover-2.log`, `production-browser-qa.json`, four production screenshots, `production-media-codex-review.md` plus original independent reviews. No unresolved P1/P2/P3.

Resolved production findings: campaign identity now follows exact public pathname despite namespaced CMS slug; standalone preserves traced database driver packages; media directory now resolves from runtime app-root cwd. The first media-defective image was rolled back immediately after public QA; final preview tested actual1024-byte206 media response before cutover. Existing preview-store restrictions and tenant access checks remain intact.
