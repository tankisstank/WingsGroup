# Exec Plan

## Goal

Hoàn thiện và triển khai toàn diện gói cải tiến trải nghiệm WingsGroup (Copy-edit, UI Layout, Social Proof) theo 19 slides review từ Canva, đảm bảo an toàn tuyệt đối cho hệ thống production.

## Scope

In scope:
- Giai đoạn 1: Tinh chỉnh câu từ & văn phong thương hiệu (Hero, 5 thương hiệu, Interactive needs, 2 cột Năng lực dịch vụ, Cơ chế 5 lớp, Thông tin pháp nhân và 3 Trụ cột).
- Giai đoạn 2: Tối ưu UI Header & Footer (kích thước logo, font điều hướng, click-to-call, địa chỉ VP Du lịch, link chính sách bảo mật, sửa layout lọt cột).
- Giai đoạn 3: Bổ sung Testimonials / Social Proof và Gallery hình ảnh thực tế.
- Đồng bộ Harness và Plane tracking.
- Triển khai cập nhật lên VPS Production thông qua Docker image build và chuyển đổi symlink an toàn.

Out of scope:
- Thay đổi cấu hình DNS hoặc CDN Cloudflare.
- Sửa đổi schema cơ sở dữ liệu hoặc tạo migration mới.

## Risk Classification

Risk flags:
- High-traffic public experience (WingsGroup homepage và corporate subpages).
- Production deployment trên VPS Oracle Cloud ARM64.

Hard gates:
- Tất cả unit / component tests phải vượt qua 100% (không có test nào bị phá vỡ).
- ESLint không có lỗi cú pháp hoặc import.
- Không recreate cơ sở dữ liệu PostgreSQL hoặc Redis khi switch container.
- Preflight và post-deploy health check (`/api/health/live`, `/api/health/ready`) phải trả về HTTP 200.

## Work Phases

1. **Thực thi và kiểm thử cục bộ**:
   - Hoàn thiện mã nguồn các component và styles.
   - Chạy kiểm thử component (`pnpm run test:component`) và linter (`pnpm exec eslint`).
2. **Harness & Plane Documentation**:
   - Lập tài liệu story US-071 (`overview.md`, `design.md`, `execplan.md`, `validation.md`).
   - Cập nhật Plane manifest và kiểm tra `pnpm run plane:preview`.
3. **Commit & Push Git**:
   - Gom các thay đổi thành commit rõ ràng: `feat(wingsgroup): implement us-071 copy-edit, ui layout, and social proof`.
   - Push commit lên nhánh `origin/master`.
4. **Triển khai Production**:
   - Tạo package release archive (`.tar.gz`) từ commit HEAD.
   - Upload lên VPS production và giải nén vào thư mục release mới.
   - Build image Next.js container trên kiến trúc ARM64 của server.
   - Chuyển symlink `current` và recreate container ứng dụng (giữ nguyên database và redis).
   - Kiểm tra xác nhận trạng thái health và các trang public.

## Stop Conditions

Dừng khẩn cấp và không switch traffic nếu:
- Component tests hoặc build bị lỗi.
- Container ứng dụng trên VPS không vượt qua health check readiness.
- Có lỗi kết nối database PostgreSQL hoặc Redis.
