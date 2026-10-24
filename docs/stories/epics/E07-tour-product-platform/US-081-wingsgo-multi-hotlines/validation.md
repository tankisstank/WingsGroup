# Biên bản Nghiệm thu: US-081 — Đa Hotline Liên hệ & Tư vấn WingsGo

## Follow-up hiện tại — 23/10/2026

Trạng thái: **đã bàn giao kỹ thuật production; stakeholder UAT còn chờ xác nhận** cho yêu cầu sửa footer WingsGo. Release `d6057d4` trước đó rút gọn footer WingsGroup, không phải WingsGo. Bằng chứng ngày 19/10 bên dưới là lịch sử, không xác nhận hợp đồng mới đã chạy production.

Hợp đồng mới: main `0948786775`; footer một link gọi và một email ưu tiên, không selector, Zalo, số phụ hoặc CTA tư vấn lặp. FAB ẩn khi footer hiện; dialog đang mở được giữ, Escape focus về link gọi footer. Header/dialog tiếp tục giữ kênh phụ.

Bằng chứng hiện tại tại `wingsgo-footer-review-20261023/`:

- `production-before.json` và `production-settings-before.log`: đọc thực tế public/CMS, main WingsGo còn `0912910101`, WingsGroup đã `0948786775`; không ghi production.
- `unit-final.log`: resolver/updater 21/21, exit 0.
- `agy-component-final.log`: 9 file, 94/94 tests, exit 0. Một expectation WingGo cũ trong suite chrome được cập nhật sau lần chạy đầu 93/94.
- `footer-component-final.log`: 14/14, exit 0 sau khi sửa nhãn nút bị CSS span cũ bọc pill.
- `typecheck.log`: exit 0. `agy-lint-final.log`: exit 0, 0 errors và 8 warnings đã ghi rõ trong review.
- `cms-rehearsal-final.log`: Payload trên bản sao SQLite riêng; plan không ghi, apply chỉ main WingsGo và updatedAt, repeat noop, toàn bộ trường còn lại và 5 site khác giữ nguyên. Custom main abort an toàn; không dùng bằng chứng SQLite thay cho PostgreSQL production.
- `build-final.log`: build/postbuild exit0 sau sửa span; compile20.3s, TypeScript28.5s. `browser-final.log` và `browser-results.json`:20/20 cases exit0, 16 WingsGo home/contact VI/EN320–1280px và4 cross-tenant; SSR light, stored dark/reload, FAB hide/show, dialog retention và Escape focus đã thử thật, exceptions[]. Hai ảnh cuối đã mở xem.
- Updater cần `context: { seed: true }` theo pattern trusted migration có sẵn; `overrideAccess` một mình không vượt hook xác thực. Không thay access hook.
- Tracking: `plane:preview`1 story/4 children; `plane:sync:workitems` patched5/missing0. API readback `plane-readback.log` exit0 xác nhận WingsGo/E07/US081/4 child, owner c0508g,0 missingDates và0 genericChildNames; lịch gốc19–22/10 giữ nguyên. Lần kiểm đầu phát hiện owner trống, đã gán theo default owner của skill rồi đọc lại API mới. Plane plan không hỗ trợ Initiative; Project/Epic/US hoạt động bình thường.

Browser/build cuối và phân tích nhận xét agy được ghi trong `wingsgo-footer-review-20261023/review.md`. Các gate release audit, shared transaction/row lock cho CMS, fresh backup/restore PostgreSQL, ARM64 và public smoke đã đạt; bằng chứng production được bổ sung ở phần addendum cuối file. Chưa thử gọi điện, chat Zalo, gửi lead hoặc điện thoại thật.

## Biên bản lịch sử ngày 19/10/2026

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

## Production release addendum — 24/10/2026

Follow-up footer WingsGo đã được deploy production. Revision `16ff60a28ba48489d7d06de648780c522372e13f`; operations image digest `sha256:f9a0f53174fcacd34465a6745f45f4c80f8592aedec54baa077ce5600ea57ec8`, label khớp revision.

- Fresh encrypted backup và full-site restore drill đạt: 6 active sites, 6 homepages, checksum `88a00dc36d1b186f2e212b62fdef0334f6e545197edcee9997f9e76e2d500aeb`.
- `payload migrate` exit 0; `migrate:status` xác nhận 28 migration đã áp dụng, không pending.
- CMS apply trên PostgreSQL dùng transaction và `FOR UPDATE`: settings `wings-go` ID16 đổi đúng `0912910101` thành `0948786775`; 1 write; repeat noop; các trường còn lại và 5 site khác giữ nguyên; cache được invalidate.
- Cutover health: `database=up`, `leadDelivery=configured`, `redis=up`, `status=ready`.
- Public browser QA trên `/`, `/en`, `/lien-he`, `/en/lien-he`: footer có đúng một link gọi và một email, không theme selector; không có browser errors.

Tình trạng kỹ thuật: **Đã bàn giao production**. Stakeholder UAT và kiểm tra quay số/Zalo/lead trên thiết bị thật vẫn chờ xác nhận.

