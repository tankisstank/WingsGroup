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
  - Initial Release Commit: `113887f` (pushed to `origin/master`).
  - Production Hotfix Commits: `85e997c` (align copy, suppress legacy blocks, sync site-settings) và `482fd78` (handle case-insensitive legacy eyebrow matching).
  - Archive: `wingsgroup-us071-85e997c.tar.gz`.
  - Release Directory: `/home/ubuntu/wings-travel/releases/wingsgroup-us071-85e997c-20260909T171832Z`.
  - Next.js Container Image: `wingstravel-app:latest` (Image ID `e7c0692ed6ce`), built via Docker Compose on ARM64 with `--build`.
  - Database Alignment: Đã đồng bộ `wings_group_v3_legal_identity_relationship_statement` và nội dung `pages_blocks_feature_grid` trong PostgreSQL, flush Redis cache.
  - Runtime Switch: Symlink `/home/ubuntu/wings-travel/current` transitioned atomically sang release mới.
  - Data Layer Continuity: `wingstravel-postgres-1` (Up 3 days, healthy) và `wingstravel-redis-1` (Up 2 months, healthy) được giữ nguyên 100%, không bị recreate.
  - Health Checks: `/api/health/live` trả về HTTP 200 `status: "ok"`, `/api/health/ready` trả về HTTP 200 `{"checks":{"database":"up","leadDelivery":"configured","redis":"up"},"status":"ready"}`.
  - Public Verification: `https://wingsgroup.vn/` và `https://wingsgroup.vn/nang-luc-dich-vu` được kiểm chứng bằng `agent-browser` (ảnh chụp toàn trang `scratch/full_capability.png`), xác nhận đầy đủ:
    + Eyebrow "NĂNG LỰC PHỤC VỤ CHUYÊN SÂU" và Title "Quy trình phục vụ rõ ràng - Đồng hành trọn hành trình".
    + 2 cột nội dung chi tiết theo Slide 05: Quy trình phục vụ 4 bước và 6 Tiêu chuẩn chất lượng đầy đủ.
    + Khối 4 card gallery và 5 hàng thương hiệu với CTA trao đổi nhu cầu.
    + Khối Testimonials mạng lưới khách hàng thực tế và banner chuyển đổi.
    + Header logo responsive to đẹp, nhãn ngôn ngữ `ENGLISH (en)`.
    + Footer có địa chỉ VP Du lịch Hà Nội (Ngọc Khánh Plaza), link `tel:0912910101`, link Chính sách bảo mật và CTA liên hệ 24/7.

