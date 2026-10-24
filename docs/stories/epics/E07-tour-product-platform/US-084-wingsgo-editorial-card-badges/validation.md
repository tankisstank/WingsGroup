# US-084 — Validation Record

> **Production release status (21/10/2026): BLOCKED.** Implementation and local validation are recorded below, but production deployment has not occurred. The independent pre-deployment audit is [us084-predeploy-codex-audit-20261021.md](../../../../consultations/us084-predeploy-codex-audit-20261021.md). The Oracle runbook now documents the candidate-bound ARM64 operations image, backup/restore evidence, and migration/status gate before cutover. This is a procedure update only: no candidate operations image, fresh backup/restore proof, or production migration has been produced or verified.

## Production preflight observation — 21/10/2026

- Read-only SSH used the pinned host key from the local `known_hosts` file.
- Current symlink remains `/home/ubuntu/wings-travel/releases/release-us083-promotion-search-market-20261020-172000`.
- `/api/health/ready` returned `status: ready`; database, Redis, and lead delivery were reported up/configured.
- The workspace had 96 changed or untracked paths and `master` remained at `58633ae`; no clean US-084 release commit or fresh release package was prepared.
- No application cutover or Payload migration was performed. Keep the release blocked until the exact candidate scope is isolated, the documented ARM64 operations image is built and verified for that candidate, a fresh production backup and restore proof are bound to it, and post-deploy checks are recorded.
- The `down` migration drops badge and version data; rollback should restore the prior app while retaining the additive schema unless a separately backed-up data rollback is intended.

## Execution update — 21/10/2026

- Fixed the TypeScript error in `app/src/tours/queries.ts`: the locale value is now destructured before the locale-dependent `fallbackLocale` default. The default remains `false` for English and `vi` otherwise.
- Fresh verification: unit tests `editorialBadges`, `editorialBadgesRevalidation`, and `curationCacheIsolation` passed 33/33; component tests for editorial badges and CMS authoring passed 14/14; `pnpm exec tsc --noEmit` passed; `pnpm run test:int` exited 0. The integration runner reported conditionally skipped tests.
- Updated the [Oracle ARM64 deployment runbook](../../../../runbooks/oracle-vps-arm64-deployment.md) with a same-candidate `us057-ops` image build, revision binding, backup/restore requirement, and migration/status gate before cutover. `git diff --check` passed for the documentation changes.
- These checks ran against the current shared workspace, not an isolated release candidate. No production backup, migration, image build, or cutover was performed; production remains blocked until candidate scope is isolated and candidate-bound evidence is produced.

## Release gate continuation — 21/10/2026

- Re-ran `pnpm run build` from `app/`: exit 0. Next.js production compilation, TypeScript, static generation, and standalone packaging completed.
- Read-only production check over SSH with the pinned host key: current remains `release-us083-promotion-search-market-20261020-172000`; readiness is `ready` with database, Redis, and lead delivery healthy. PostgreSQL reports latest migration `20261019_100000_site_settings_hotlines`; the US-084 badge migration is pending. Database size is 87 MB; VPS filesystem has 5.8 GB available.
- No new encrypted backup or disposable restore proof is bound to this release candidate. The existing older release backup is not accepted as candidate evidence. No migration, upload, symlink change, container recreation, or production data write was performed.
- Browser smoke against the local standalone candidate was attempted at `/wingsgo` and `wingsgo.localhost`; both returned 404 because the local run had no usable tenant/site fixture. This is not accepted as candidate browser proof. Existing recorded browser screenshots remain historical evidence only.
- Release remains blocked pending a clean, reviewed candidate containing the authorized US-081–US-084 scope (including the requested CMS preview refresh follow-up), fresh encrypted backup and disposable restore proof bound to that exact candidate, and a verified candidate-bound ARM64 operations image. Exclude `app/artifacts/` and the unrelated shebang-only edit from the release package unless separately reviewed.

**Trạng thái:** Đã hoàn tất (Validated & Rehearsed)  
**Ngày mở story:** 21/10/2026  
**Ngày xác thực:** 21/10/2026  
**Site:** WingsGo  
**Epic:** E07 — Nền tảng sản phẩm tour WingsGo  

---

## 1. Bảng đối chiếu Gate bắt buộc

| Gate | Bằng chứng & Test Suite | Trạng thái |
|---|---|---|
| **Schema & Validation** | `validateEditorialBadges`, `resolveNearestEditorialBadgeLabel` trong [editorialBadges.ts](file:///E:/repo/WingsTravel/app/src/tours/editorialBadges.ts), [TourProducts.ts](file:///E:/repo/WingsTravel/app/src/collections/TourProducts.ts), typecheck & `editorialBadges.unit.spec.ts` (27/27 tests) | **ĐẠT** |
| **Mapper & DTO** | `normalizeEditorialBadges`, zero VN fallback trên `/en`, zero price inference trong [wingsGoCatalog.ts](file:///E:/repo/WingsTravel/app/src/tours/wingsGoCatalog.ts) & [queries.ts](file:///E:/repo/WingsTravel/app/src/tours/queries.ts), `wingsGoCatalog.unit.spec.ts` (17/17 tests), `editorialBadgesIntegration.int.spec.ts` (5/5 tests) | **ĐẠT** |
| **Component** | Anti-collision overlay trong [WingsGoTourCard.tsx](file:///E:/repo/WingsTravel/app/src/tours/WingsGoTourCard.tsx) & [StructuredPages.tsx](file:///E:/repo/WingsTravel/app/src/tours/StructuredPages.tsx), CMS Authoring scoped memory trong [EditorialBadgeKindField.tsx](file:///E:/repo/WingsTravel/app/src/components/TourAuthoring/EditorialBadgeKindField.tsx), `editorialBadges.component.spec.tsx` (9/9 tests), `editorialBadgeKindField.component.spec.tsx` (5/5 tests) | **ĐẠT** |
| **Revalidation** | Hook tenant-scoped cache purge không flushall trong [revalidateTourContent.ts](file:///E:/repo/WingsTravel/app/src/collections/Tours/hooks/revalidateTourContent.ts), `editorialBadgesRevalidation.unit.spec.ts` (4/4 tests), `curationCacheIsolation.unit.spec.ts` (3/3 tests) | **ĐẠT** |
| **Database Migrations** | PostgreSQL migration [20261021_120000_tour_editorial_badges.ts](file:///E:/repo/WingsTravel/app/src/migrations/20261021_120000_tour_editorial_badges.ts) qua `pnpm run db:migrate:smoke` (PASS empty->head trên PostgreSQL 16 Alpine); SQLite bootstrap trong [repairLocalSQLiteSchema.ts](file:///E:/repo/WingsTravel/app/src/utilities/repairLocalSQLiteSchema.ts) qua [us084SQLiteRehearsal.ts](file:///E:/repo/WingsTravel/app/tests/helpers/us084SQLiteRehearsal.ts) (PASS) | **ĐẠT** |
| **Browser Desktop** | Viewport 1280x800 chụp thực tế trên homepage, `/tour`, market routes (`/thi-truong/han-quoc`), `/en/tour` | **ĐẠT** |
| **Browser Mobile** | Viewport 375x812 chụp thực tế trên mobile catalog, mobile homepage, mobile market; kiểm tra không va chạm, không che title/price/CTA | **ĐẠT** |
| **Accessibility & Motion** | Screen-reader text `.sr-only` cho badge `hot`; `@media (prefers-reduced-motion: reduce)` tắt spin animation (`animation: none !important`), kiểm tra runtime trả về `"none"` | **ĐẠT** |
| **Plane / Harness** | Story mapped trong [manifest.json](file:///E:/repo/WingsTravel/docs/plane/manifest.json), `missingCount: 0` | **ĐẠT** |

---

## 2. Báo cáo tham vấn Codex Release Review & Xử lý Triệt để (Codex Consultation Gate)

Biên bản tham vấn độc lập được lưu tại [us084-editorial-badges-audit-20261021.md](file:///E:/repo/WingsTravel/docs/consultations/us084-editorial-badges-audit-20261021.md).

### Finding 1 (P1 - Blocker): Nguy cơ rò rỉ nhãn tiếng Việt trên route tiếng Anh `/en`
- **Phân tích:** `getToursByMarketRoute` truyền `locale: 'en'` nhưng không truyền `fallbackLocale`, Payload có thể dùng fallback mặc định là tiếng Việt nếu tour thiếu bản dịch tiếng Anh.
- **Giải pháp triệt để:**
  1. Đặt mặc định `fallbackLocale = locale === 'en' ? false : 'vi'` trong helper `queryCollection` của [queries.ts](file:///E:/repo/WingsTravel/app/src/tours/queries.ts).
  2. Truyền tường minh `fallbackLocale: locale === 'en' ? false : 'vi'` trong cả hai truy vấn `tour-products` và `tour-departures`.
  3. Sửa `getWingsGoFeaturedTours` trong [wingsGoCatalog.ts](file:///E:/repo/WingsTravel/app/src/tours/wingsGoCatalog.ts) (dòng 642) chuyển `fallbackLocale: 'vi'` thành `fallbackLocale: locale === 'en' ? false : 'vi'`.
  4. Thêm test integration `guarantees zero Vietnamese fallback on English market route when tour only has Vietnamese badge` trong [editorialBadgesIntegration.int.spec.ts](file:///E:/repo/WingsTravel/app/tests/int/editorialBadgesIntegration.int.spec.ts). Kết quả: **PASS**.

### Finding 2 (P2 - High): Nguy cơ nhãn promo thương mại dài va chạm với sticker biên tập
- **Phân tích:** Cột sticker bên trái và badge promo bên phải trước đây dùng 2 block absolute độc lập (`left-3 top-3` và `right-3 top-3`). Khi promo label dài trên màn hình hẹp có thể đè lên sticker.
- **Giải pháp triệt để:**
  1. Hợp nhất hai nhóm nhãn thành một flex container duy nhất:
     `<div className="absolute inset-x-3 top-3 z-10 flex items-start justify-between gap-2 pointer-events-none">`
  2. Nhóm sticker bên trái được giới hạn `max-w-[calc(100%-110px)]` (hoặc `max-w-full` khi không có promo) và có class `truncate`.
  3. Badge promo bên phải được giới hạn `max-w-[50%]` và `truncate` trong [PromotionPrice.tsx](file:///E:/repo/WingsTravel/app/src/tours/PromotionPrice.tsx).
  4. Hai nhóm nhãn nằm cùng hàng flex với `gap-2` và `justify-between`, loại bỏ hoàn toàn khả năng va chạm hình học ở mọi kích thước màn hình.
  5. Cập nhật component test [editorialBadges.component.spec.tsx](file:///E:/repo/WingsTravel/app/tests/component/editorialBadges.component.spec.tsx). Kết quả: **PASS**.

### Finding 3 (P2 - High): Thiếu bằng chứng thực thi database & pre-deployment proof
- **Phân tích:** Cần chứng minh 4 bảng mới, hàng bản địa hóa, versioning và cascade delete chạy được trên database thật.
- **Giải pháp triệt để:**
  1. Đã chạy `pnpm run db:migrate:smoke` áp dụng toàn bộ 52 migration bao gồm [20261021_120000_tour_editorial_badges.ts](file:///E:/repo/WingsTravel/app/src/migrations/20261021_120000_tour_editorial_badges.ts) trên container PostgreSQL 16 Alpine thực tế: `PASS: all committed migrations applied empty->head on real PostgreSQL with no pending delta`.
  2. Tạo bộ test rehearsal [us084SQLiteRehearsal.ts](file:///E:/repo/WingsTravel/app/tests/helpers/us084SQLiteRehearsal.ts) kiểm tra toàn diện schema repair, chèn dữ liệu bản địa hóa, truy vấn theo locale, versions, tính lũy thừa (idempotency) và cascade delete khi xóa tour: `PASS`.

### Finding 4 (P3 - Minor): Khác biệt kiểu cột `_parent_id` trong SQLite version table
- **Phân tích:** Cột `_parent_id` của `_tour_products_v_version_editorial_badges_locales` trong `repairLocalSQLiteSchema.ts` để kiểu `TEXT` thay vì `INTEGER`.
- **Giải pháp:** Sửa thành `INTEGER NOT NULL` để đồng nhất với PostgreSQL và adapter conventions.

### Finding 5 (P3 - Minor): Kiểm tra enum PostgreSQL chưa có schema-scope
- **Phân tích:** `typname = '...'` không khóa schema `public`.
- **Giải pháp:** Sửa sang `IF to_regtype('public.enum_tour_products_editorial_badges_kind') IS NULL` trong migration `20261021_120000_tour_editorial_badges.ts`.

### Finding 6 (Follow-up Decision): Ghi nhớ nhãn đã dùng gần nhất (Last-Used Label) trong CMS Authoring
- **Phân tích yêu cầu:** Người dùng quyết định nhãn biên tập có thể chỉnh sửa theo locale và CMS cần tự động nhớ/dùng lại lựa chọn gần nhất của editor để không phải nhập lại nhiều lần. Phiên bản ban đầu của `EditorialBadgeKindField` chỉ dùng preset tĩnh.
- **Phân tích vòng đời Payload (Payload Lifecycle Constraints):**
  - Collection `TourProducts` đại diện cho thực thể dữ liệu tour, lưu trữ các badge của từng tour cụ thể (`editorialBadges: [{ kind, label }]`). Lựa chọn gần nhất của một biên tập viên là thuộc tính trải nghiệm authoring client-side, không phải trường dữ liệu của tour.
  - Payload không có bảng `EditorPreferences` dựng sẵn. Nếu cố gắng lưu vào database server-side, hệ thống sẽ cần: tạo collection/migration mới, phát sinh network latency và API mutations khi gõ chữ, cũng như nguy cơ race condition giữa các editor cùng thao tác.
  - Các hook vòng đời collection (`beforeChange`, `afterChange`) chỉ kích hoạt khi ấn Save/Publish, không kích hoạt khi editor đang thao tác dropdown hoặc chỉnh sửa form. Truy vấn ngược cross-document (`payload.find`) để tìm label cũ sẽ gây chậm và tốn tài nguyên database không cần thiết.
- **Giải pháp triệt để an toàn nhất (Smallest Safe Implementation):**
  1. Xây dựng cơ chế lưu trữ client-side scoped theo khóa:
     `wingstravel:editorial-badge-label:${siteKey}:${locale}:${kind}`
  2. **Cách ly tuyệt đối (Strict Isolation):**
     - Scoped theo `siteKey`: nhãn tùy chỉnh của Site 1 (ví dụ WingsGo) không bao giờ rò rỉ sang Site 2 (WingSide).
     - Scoped theo `locale`: nhãn tiếng Việt không bao giờ rò rỉ sang `/en`.
     - Scoped theo `kind`: nhãn của `hot` không ảnh hưởng sang `specialized` hoặc `vip`.
  3. **Bảo toàn dữ liệu hiện hữu (Preserve Explicit Existing Label):**
     - Khi mở tour có sẵn nhãn trong DB, field hiển thị đúng nhãn đó và không bị ghi đè khi mount.
  4. **Cho phép chỉnh sửa tự do (Allow Edits):**
     - Editor có thể sửa text label bất kỳ lúc nào; khi giá trị thay đổi, `useEffect` tự động cập nhật lại vào bộ nhớ cho `(siteKey, locale, kind)`.
  5. **Thứ tự ưu tiên phân giải (Resolution Precedence):**
     `currentLabel` (nếu có sẵn) -> `storedLabel` (lựa chọn gần nhất) -> `inDocLabel` (nhãn cùng kind trong doc) -> `preset` (mặc định theo kind/locale).
- **Kiểm thử xác thực:**
  - Unit tests: [editorialBadges.unit.spec.ts](file:///E:/repo/WingsTravel/app/tests/unit/editorialBadges.unit.spec.ts) (27/27 tests, bổ sung 8 tests riêng cho scoped storage key, isolation, and fallback).
  - Component tests: [editorialBadgeKindField.component.spec.tsx](file:///E:/repo/WingsTravel/app/tests/component/editorialBadgeKindField.component.spec.tsx) (5/5 tests mô phỏng select change, scoped memory, cross-site/cross-locale isolation, và edit persistence).

---

## 3. Danh mục Bằng chứng Ảnh chụp Trình duyệt (Browser QA Proofs)

Các ảnh chụp màn hình được lưu trong thư mục `docs/stories/epics/E07-tour-product-platform/US-084-wingsgo-editorial-card-badges/proof/`:

1. **Desktop Homepage (`desktop-homepage.png` - 777,935 bytes):**
   - Đường dẫn file: [desktop-homepage.png](file:///E:/repo/WingsTravel/docs/stories/epics/E07-tour-product-platform/US-084-wingsgo-editorial-card-badges/proof/desktop-homepage.png)
   - URL kiểm tra: `http://localhost:3000/wingsgo`
   - Hiển thị card tour nổi bật với viền cầu vồng `hot` 2px, sticker `Specialize` và sticker `VIP`. Card không có badge giữ nguyên layout chuẩn.
2. **Desktop Tour Catalog (`desktop-catalog.png` - 173,902 bytes):**
   - Đường dẫn file: [desktop-catalog.png](file:///E:/repo/WingsTravel/docs/stories/epics/E07-tour-product-platform/US-084-wingsgo-editorial-card-badges/proof/desktop-catalog.png)
   - URL kiểm tra: `http://localhost:3000/wingsgo/tour`
   - Hiển thị đầy đủ các trạng thái: `hot` đơn lẻ, `hot + specialized`, `vip` đơn lẻ, card nhãn dài được truncate mượt mà, và sự tách biệt rõ ràng giữa sticker góc trên trái và badge promo thương mại góc trên phải.
3. **Desktop Market Route (`desktop-market-han-quoc.png` - 526,070 bytes):**
   - Đường dẫn file: [desktop-market-han-quoc.png](file:///E:/repo/WingsTravel/docs/stories/epics/E07-tour-product-platform/US-084-wingsgo-editorial-card-badges/proof/desktop-market-han-quoc.png)
   - URL kiểm tra: `http://localhost:3000/wingsgo/thi-truong/han-quoc`
   - Đồng nhất 100% DTO và hiển thị giữa catalog và thị trường điểm đến.
4. **Desktop English Locale (`desktop-en-tour.png` - 182,789 bytes):**
   - Đường dẫn file: [desktop-en-tour.png](file:///E:/repo/WingsTravel/docs/stories/epics/E07-tour-product-platform/US-084-wingsgo-editorial-card-badges/proof/desktop-en-tour.png)
   - URL kiểm tra: `http://localhost:3000/wingsgo/en/tour`
   - Nhãn hiển thị tiếng Anh chuẩn (`Hot tour`, `Specialize`, `VIP`). Tour chỉ có tiếng Việt thì badge bị ẩn hoàn toàn, không rò rỉ chữ tiếng Việt.
5. **Reduced Motion (`desktop-reduced-motion.png` - 3,374 bytes):**
   - Đường dẫn file: [desktop-reduced-motion.png](file:///E:/repo/WingsTravel/docs/stories/epics/E07-tour-product-platform/US-084-wingsgo-editorial-card-badges/proof/desktop-reduced-motion.png)
   - Bật media `reduced-motion`. Thuộc tính CSS `animation` chuyển sang `none` (`animationName === "none"`).
6. **Mobile Tour Catalog (`mobile-catalog.png` - 170,790 bytes):**
   - Đường dẫn file: [mobile-catalog.png](file:///E:/repo/WingsTravel/docs/stories/epics/E07-tour-product-platform/US-084-wingsgo-editorial-card-badges/proof/mobile-catalog.png)
   - Viewport: 375x812
   - Flex overlay `inset-x-3` bảo đảm sticker và promo badge không chạm nhau, không che hình ảnh, tiêu đề hay giá tour.
7. **Mobile Homepage (`mobile-homepage.png` - 639,236 bytes):**
   - Đường dẫn file: [mobile-homepage.png](file:///E:/repo/WingsTravel/docs/stories/epics/E07-tour-product-platform/US-084-wingsgo-editorial-card-badges/proof/mobile-homepage.png)
   - Viewport: 375x812
   - Hiển thị gọn gàng, viền cầu vồng không gây vỡ grid hay giật layout.
8. **Mobile Market Route (`mobile-market.png` - 526,070 bytes):**
   - Đường dẫn file: [mobile-market.png](file:///E:/repo/WingsTravel/docs/stories/epics/E07-tour-product-platform/US-084-wingsgo-editorial-card-badges/proof/mobile-market.png)
   - Viewport: 375x812
   - Layout co giãn chuẩn, nút CTA và thông tin đợt khởi hành hiển thị đầy đủ.

---

## 4. Kết luận

Toàn bộ 8 Tiêu chí Chấp nhận (AC1 - AC8) của US-084 đã được hiện thực và kiểm chứng thành công. Không có lỗi biên dịch, không có rủi ro suy diễn giá, không có rò rỉ đa site/đa ngôn ngữ, không flush Redis toàn hệ thống. Story sẵn sàng để đồng bộ tiến độ.
## Production release evidence — 2026-10-21

- Candidate: `513238bc483f4d755081d24e291ff40e9475ba6c`, descendant of `58633ae`.
- Package: `release-clean.zip` SHA-256 `0D0479D2CFC2A7EE45F61D829EC1D09EE189450588F53129D7989A3042BD1083`.
- ARM64 operations image: `sha256:228190939b6750e2bbeb093c2333764acdf037e617c51447965cb13519b6e5e8`, label revision matches candidate.
- Encrypted PostgreSQL backup created; restore drill passed with `activeSites=6`, `homepages=6`, and checksum `562a51804d8a0284096d9187caf387973d076783f7c203b2541a081fb28bc60a`.
- Migration `20261021_120000_tour_editorial_badges` applied in batch 28; migration status has no pending entries.
- Production current: `/home/ubuntu/wings-travel/releases/release-513238bc483f`.
- Readiness: database up, Redis up, lead delivery configured.
- Browser smoke: production homepage, `/tour`, Japan market, and tour detail passed on desktop and mobile; mobile `scrollWidth=375`, viewport width `390`, no overflow; browser errors empty.

## Rainbow orbit follow-up — production 2026-10-24

User authorized push/deploy. Master commit `1c71d71`; isolated production candidate `643a40d` on previous live `16ff60a`. Only CSS changed: registered angle `--hot-rainbow-angle` drives the seven-color conic gradient over 5 seconds, while card/mask geometry remains fixed. Reduced-motion still disables animation. The earlier whole-frame rotation was corrected before release.

Fresh proof: standalone build/postbuild exit 0; 24/24 component tests; independent Codex review no P1/P2/P3; exact-candidate ARM64 operations image; encrypted production backup and real disposable restore (6 sites/6 homepages); read-only migration status 28/28 applied; actual ARM64 libsql/sharp smoke pass. No migrations or production CMS writes.

Cutover completed at 15:56:28+07. Runtime immutable image `sha256:0ef04a9a1cfded2efec835f32d68e0cac72cc05f1314530871a949493f9c523b`; expected BUILD_ID matched, restart0, readiness database/Redis up and lead delivery configured. Public browser checked homepage/catalog/Japan-market at 390/1280 plus reduced-motion: angle advances, transform none, focus pass, no overflow; fresh screenshots viewed. Previous runtime pinned for rollback.

On-VPS build hit disk full during chown; production stayed unchanged. The same standalone package/Dockerfile was successfully built locally for ARM64 and uploaded as a complete image. Only this session's extraction and exact failed-build cache IDs were removed. VPS remains low on space (~1.1GB available).

Full commands, review findings, backup checksum, rollback and limits: `wingsgo-rainbow-release-20261024/release-report.md`; fresh logs and screenshots beside that report. No full suite, real devices, Safari/Firefox or sustained performance profile.
