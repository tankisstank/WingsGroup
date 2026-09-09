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
  - Image Next.js được build thành công từ source archive release.
  - PostgreSQL và Redis containers được bảo toàn 100% thời gian uptime (không bị recreate).
  - Health checks `/api/health/live` và `/api/health/ready` trả về `status: "ok"` và `"status": "ready"`.
  - Các trang công chúng `https://wingsgroup.vn/`, `https://wingsgroup.vn/nang-luc-dich-vu`, `https://wingsgroup.vn/tin-cay-va-phap-ly` phản ánh đúng giao diện mới, không có lỗi console hay tràn khung responsive.
