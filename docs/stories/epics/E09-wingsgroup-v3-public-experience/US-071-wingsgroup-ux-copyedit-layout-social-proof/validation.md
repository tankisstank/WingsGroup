# Validation

## Proof Strategy

Chứng minh tính đúng đắn của toàn bộ các thay đổi giao diện và nội dung thông qua kiểm thử tự động ở môi trường local, sau đó kiểm chứng runtime trực tiếp trên VPS production sau khi triển khai container mới.

## Test Plan

| Layer | Cases |
| --- | --- |
| Component | Kiểm tra toàn bộ 25 test suites component (140 tests): `wingsGroupBrand`, `wingsGroupV3Homepage`, `wingsSideHiFi`, v.v. |
| Code Quality | Chạy ESLint trên toàn bộ các file sửa đổi và tạo mới, đảm bảo 0 lỗi và 0 cảnh báo. |
| Platform & Build | Kiểm tra Docker image build độc lập trên VPS Oracle Cloud Ubuntu ARM64. |
| Production Smoke | Kiểm tra HTTP 200 cho `/api/health/live`, `/api/health/ready` và các trang công chúng: `https://wingsgroup.vn/`, `https://wingsgroup.vn/nang-luc-dich-vu`, `https://wingsgroup.vn/tin-cay-va-phap-ly`. |
| Audit & Plane | Chạy `pnpm run plane:preview` xác nhận 0 missing stories. |

## Commands

```bash
# Local testing
pnpm run test:component
pnpm exec eslint app/src/components/WingsGroupV3/ app/src/blocks/WingsGroupCapability/ app/src/blocks/WingsGroupTrust/ app/src/Footer/ app/src/components/Logo/
pnpm run plane:preview

# Production build and switch (on VPS)
sudo docker compose --env-file /home/ubuntu/wings-travel/shared/.env -p wingstravel -f docker-compose.production.yml build app
ln -sfn /home/ubuntu/wings-travel/releases/<release-dir> /home/ubuntu/wings-travel/current
cd /home/ubuntu/wings-travel/current/app
sudo docker compose --env-file /home/ubuntu/wings-travel/shared/.env -p wingstravel -f docker-compose.production.yml up -d --no-deps app
curl -s http://127.0.0.1:3000/api/health/live
curl -s http://127.0.0.1:3000/api/health/ready
```

## Acceptance Evidence

- **Component Tests**: 25/25 test files passed, 140/140 tests passed (100%).
- **Linter**: 0 errors, 0 warnings.
- **Plane Tracking**: 0 missing stories; Story US-071 đã được liên kết với Epic E09.
- **Production Preflight & Deployment**:
  - Release Commit: `113887f` (pushed to `origin/master`).
  - Archive: `wingsgroup-us071-113887f.tar.gz` (SHA256: `c47c85b5a1a4d64d52b7c3903d8341dd8ec75c0f39ecc12701148ab38632bd16`).
  - Release Directory: `/home/ubuntu/wings-travel/releases/wingsgroup-us071-113887f-20260909T232000Z`.
  - Next.js Container Image: `wingstravel-app:latest` built via Docker Compose on ARM64.
  - Runtime Switch: Symlink `/home/ubuntu/wings-travel/current` transitioned atomically.
  - Data Layer Continuity: `wingstravel-postgres-1` (Up 3 days, healthy) và `wingstravel-redis-1` (Up 2 months, healthy) được giữ nguyên 100%, không bị recreate.
  - Health Checks: `/api/health/live` trả về HTTP 200 `status: "ok"`, `/api/health/ready` trả về HTTP 200 `{"checks":{"database":"up","leadDelivery":"configured","redis":"up"},"status":"ready"}`.
  - Public Verification: `https://wingsgroup.vn/` và `https://wingsgroup.vn/nang-luc-dich-vu` được kiểm chứng bằng `agent-browser`, xác nhận đầy đủ:
    + Văn phong Hero và 5 thương hiệu mới.
    + Khối 5 card tương tác nhu cầu (`JourneyInquiryGrid`) hoạt động chuẩn.
    + Khối Testimonials mạng lưới khách hàng thực tế và banner chuyển đổi.
    + Header logo responsive to đẹp, nhãn ngôn ngữ `ENGLISH (en)`.
    + Footer có địa chỉ VP Du lịch Hà Nội (Ngọc Khánh Plaza), link `tel:0912910101`, link Chính sách bảo mật và CTA liên hệ 24/7.

