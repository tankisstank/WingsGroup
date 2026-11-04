# US-095 — Xuất bản 4 trang giới thiệu dịch vụ con và đồng bộ khối hệ sinh thái WingsGroup

## Status — đối soát 2026-11-04

implemented / Đã bàn giao, proof Full. Production `2265e13` đã qua 28/28 browser checks: tám route VI/EN và hai mươi tab/CTA ở home/ecosystem; nhãn WingsPlus thống nhất. Chưa có xác nhận nghiệm thu stakeholder.

Trạng thái hiện tại: `docs/releases/us-status-20261104.md`. Giữ nguyên các ngày bắt đầu/target và bằng chứng bàn giao trước đó.

## User Story

Là người dùng tìm hiểu hệ sinh thái WingsGroup, tôi muốn xem thông tin giới thiệu chi tiết của từng dịch vụ con (WingsGo, WingSide, WingsPass, WingsCare, bên cạnh WingsPlus đã có) qua các trang con chuyên biệt, và thấy các liên kết này được đồng bộ nhất quán tại khối "Chọn dịch vụ phù hợp với hành trình của bạn" ở cả Trang chủ và trang Hệ sinh thái (`/he-sinh-thai`), để tôi có thể hiểu rõ năng lực phục vụ của từng thương hiệu trước khi gửi yêu cầu tư vấn.

## Scope

1. **Route Governance (`corporateRoutes.ts`)**:
   - Mở rộng danh mục route giới thiệu trên site WingsGroup:
     - `/gioi-thieu-wingsgo`
     - `/gioi-thieu-wingside` (và alias `/gioi-thieu-wing-side` nếu có)
     - `/gioi-thieu-wingspass`
     - `/gioi-thieu-wingscare`
     (Cùng `/gioi-thieu-wingsplus` đã có từ US-088).
   - Bảo toàn whitelist và access control `isWingsGroupV3PublicSurfacePathAllowed` cho cả locale `vi` và `en`.

2. **Nội dung 4 trang con mới trên WingsGroup trong Payload CMS**:
   - Mỗi trang gồm:
     - **Hero Block**: Banner định dạng hình ảnh chuẩn đã kiểm duyệt từ `wingsgroup-v3-media-manifest.json` (`wingsgroup-ecosystem-hero.png`, `wingsgroup-vietnam-discovery.png`, `wingsgroup-airport-service.png`, `wingsgroup-travel-support.png`), H1, mô tả và CTA trỏ tới `/lien-he#contact-form`.
     - **Feature Grid Block**: 4 nhóm dịch vụ/tính năng cốt lõi theo định vị thương hiệu hiện có.
     - **CTA Block**: Mời liên hệ chuyên viên tư vấn.
   - Hỗ trợ dữ liệu song ngữ `vi` và `en`, trạng thái `published`.

3. **Đồng bộ khối hệ sinh thái trên Trang chủ (`/`, Page 191) và Trang Hệ sinh thái (`/he-sinh-thai`, Page 181)**:
   - Cập nhật mô tả chuẩn hoá, ngắn gọn cho cả 5 thương hiệu: WingsGo, WingSide, WingsPass, WingsPlus, WingsCare.
   - Nút hành động CTA của cả 5 thẻ chuyển thành `Xem giới thiệu` (`state: 'approved-deep-link'`), trỏ tương ứng tới 5 đường dẫn `/gioi-thieu-*`.

## Acceptance Criteria

- [x] AC1: Khai báo đầy đủ 4 route mới trong `corporateRoutes.ts`, unit test kiểm tra route public hợp lệ và chặn các route không thuộc danh mục.
- [x] AC2: Tạo 4 trang mới trong CMS thuộc site WingsGroup với slug `/gioi-thieu-wingsgo`, `/gioi-thieu-wingside`, `/gioi-thieu-wingspass`, `/gioi-thieu-wingscare`, đầy đủ Hero, Feature Grid và CTA.
- [x] AC3: Cập nhật khối Ecosystem Explorer trên Trang chủ (`/`) trỏ 5 CTA tới 5 trang `/gioi-thieu-*`.
- [x] AC4: Cập nhật khối Ecosystem Explorer trên trang `/he-sinh-thai` đồng bộ 100% nội dung và CTA với Trang chủ.
- [x] AC5: Kiểm thử unit test, component test, typecheck, lint pass exit 0.
- [x] AC6: Biên bản rà soát kiến trúc & phát hành thông qua Codex Consultation Gate.
