# Biên bản Nghiệm thu: US-081 — Đa Hotline Liên hệ & Tư vấn WingsGo

## 1. Trạng thái Nghiệm thu
- **Tình trạng:** `Đã bàn giao kỹ thuật` (implementation, display QA and production release complete; stakeholder UAT pending)
- **Ngày lập:** 19/10/2026

## 2. Danh mục Kiểm tra Tiêu chí Chấp nhận

| STT | Tiêu chí chấp nhận | Kết quả kỳ vọng | Trạng thái |
| :--- | :--- | :--- | :--- |
| AC1 | 3 đầu số hotline hiển thị đầy đủ | `0912 910 101`, `0915 250 101`, `0915 260 101` xuất hiện tại Footer, Mobile Header, FAB và Modal | Đạt — component tests và browser smoke |
| AC2 | Hiển thị số hotline trên mobile | Ba số được hiển thị đầy đủ trong drawer, Footer, FAB và modal; không tràn ngang | Đạt — viewport 320px/390px và screenshot |
| AC3 | Header Desktop không vỡ layout | Số chính hiển thị trực tiếp, nút xem thêm mở popover chứa 2 số phụ tinh gọn | Đạt — viewport 1440 và screenshot |
| AC4 | Tương thích ngược đa site | Các site khác (`wing-side`, `wings-group`) không bị ảnh hưởng | Đạt — tenant isolation/rehearsal và WingSide component suite |

## 3. Bằng chứng thực thi

- `pnpm run test:unit -- tests/unit/siteHotlines.unit.spec.ts`: exit 0, 11/11 tests.
- `pnpm run test:component -- tests/component/headerHotlines.component.spec.tsx tests/component/footerHotlines.component.spec.tsx tests/component/siteContactFab.component.spec.tsx tests/component/retailTourConsultationDialog.component.spec.tsx tests/component/wingsSideHiFiChrome.component.spec.tsx`: exit 0, 5 files và 21 tests.
- `pnpm exec tsx tests/helpers/us081SQLiteRehearsal.ts`: exit 0; legacy backfill, repeat repair, deletion preservation, tenant isolation và empty bootstrap đều đạt.
- `pnpm exec tsx tests/helpers/us081PostgresRehearsal.ts`: exit 0; legacy upgrade, tenant isolation, custom main, repeated migration, deletion preservation, Payload CRUD, validation và same-process cache invalidation đều đạt.
- `pnpm run db:migrate:smoke`: exit 0 trên PostgreSQL 16.15; migration `20261019_100000_site_settings_hotlines` đã được áp dụng.
- `pnpm run db:upgrade:smoke`: exit 0; site sentinel, submission cũ và 4/4 bảng tour được giữ lại.
- `pnpm exec tsc --noEmit`: exit 0.
- `pnpm run build`: exit 0; Next build và `postbuild` hoàn tất.
- Browser smoke tại `http://127.0.0.1:3181`: desktop popover, mobile drawer 320px, FAB/modal với đủ 3 số và Zalo OA; Escape đóng overlay; không tràn ngang. Ảnh: `browser-final-desktop.png`, `browser-final-mobile.png`, `browser-final-modal.png`.

## 4. Giới hạn nghiệm thu

- Phạm vi nghiệm thu chỉ là hiển thị responsive; không kiểm tra quay số trên thiết bị thật.
- Full unit suite của repository vẫn có lỗi ngoài US-081: 9 file lỗi, 1070 tests qua và 2 assertion lỗi liên quan redirect/brand locale/import CSS/`node:sqlite`. Không mở rộng sửa sang US-082/083.

## 5. Production deployment

- Target: Oracle Cloud VPS ARM64 `ubuntu@168.110.212.116`.
- Release: `release-us081-20261019-064820`; `current` trỏ tới release này.
- Backup trước migration: `/home/ubuntu/wings-travel/shared/backups/wingstravel-pre-us081-20261019T064024Z.dump`.
- Migration `20261019_100000_site_settings_hotlines`: áp dụng thành công; hai hotline phụ WingsGo tồn tại trong production.
- Health check: `database=up`, `leadDelivery=configured`, `redis=up`, `status=ready`.
- Live display smoke trên `https://wingsgo.vn`: desktop header dropdown, mobile drawer, Footer, FAB, modal tư vấn và trang lịch khởi hành đều hiển thị đủ 3 số; `https://wingside.vn` giữ hotline riêng.
- Follow-up production configuration cho `wingsgroup.vn`: giữ `0912910101`, thêm explicit `0915250101` và `0915260101` cho site `wings-group`; các tenant `wing-side`, `wings-care`, `wings-pass`, `wings-plus` giữ 0 hotline phụ.
- WingsGroup cache đã invalidate; readiness tiếp tục `database=up`, `leadDelivery=configured`, `redis=up`; RSC payload chứa đủ 3 hotline. Smoke desktop 1280px và mobile 375px đạt, không tràn ngang.
- Rollback point: `/home/ubuntu/wings-travel/releases/release-capability-en-20261016-143523`.
- Không commit/push; không triển khai US-082/US-083. Stakeholder UAT vẫn pending.
