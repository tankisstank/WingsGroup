# US-078 — Release Review & Pre-deployment Audit

- **Ngày audit:** 2026-10-15
- **Phạm vi:** `TourCurations.ts`, `TourCurations/hooks.ts`, `wingsGoTourCatalog.ts`, `app/src/fields/wingsGoTourCatalog.ts`, migration `20261015_090000_wingsgo_tour_curations.ts`; đối chiếu prompt release review, tài liệu kiến trúc curation và runbook Oracle ARM64.
- **Kết luận phát hành:** **SHIP WITH CONDITIONS**. Logic hiện tại có fallback và kiểm thử cơ bản tốt, nhưng cần hoàn tất các preflight migration và xử lý các rủi ro P2 trước khi xem là phát hành production không điều kiện.

## 1. Tóm tắt kết quả

Không thấy lỗi P1 chắc chắn gây mất dữ liệu hoặc làm trắng trang trong luồng đọc bình thường. Tuy nhiên migration có thể bị chặn ở production nếu dữ liệu hiện hữu chứa từ hai curation mặc định trở lên trên cùng site trước khi tạo partial unique index. Đây là **P1 release gate theo điều kiện dữ liệu**, cần kiểm tra trước migration.

Các rủi ro P2 đáng chú ý:

1. Resolver đọc curation bằng `overrideAccess: true` nhưng không xác minh bản ghi curation thuộc đúng `siteID`; validator Page có kiểm tra, nhưng dữ liệu/API đã tồn tại vẫn có thể tạo liên kết sai site.
2. Hook chỉ invalidation khi TourCuration thay đổi. Thay đổi tour product, departure hoặc wrapper có thể để giá, ngày bay và card cũ trong cache/ISR.
3. Revalidation truy vấn tối đa 100 Page liên kết, không phân trang; các Page thứ 101 trở đi có thể không được làm mới.
4. Migration dùng `site_id NOT NULL` nhưng khóa ngoại là `ON DELETE SET NULL`; xóa site có thể lỗi do cố ghi NULL vào cột NOT NULL.
5. `down()` là no-op, nên không có rollback tự động cho schema/backfill.

## 2. Findings theo mức độ

| ID | Mức | Trạng thái | Bằng chứng | Tác động |
|---|---|---|---|---|
| P1-1 | Critical gate | Mở có điều kiện | Migration tạo unique partial index tại dòng 72. | Nếu DB đã có duplicate `is_default=true` cùng site, migration fail và release dừng giữa chừng. |
| P2-1 | Major | Mở | `resolveCuratedTourIDs` dùng `findByID/find` với `overrideAccess: true` và chỉ lọc default theo `siteID`; Page curation riêng không kiểm tra `curationDoc.site === siteID`. | Liên kết sai site có thể được đọc. Catalog card vẫn lọc site nên nguy cơ lộ tour hiện tại thấp, nhưng precedence/order và tính cô lập không được bảo đảm ở boundary resolver. |
| P2-2 | Major | Mở | Hook invalidation chỉ gắn vào `TourCurations.afterChange/afterDelete`. Không có hook tương ứng trong phạm vi audit cho TourProduct, TourDeparture hoặc wrapper. | Giá, lịch bay, ảnh hoặc eligibility thay đổi có thể giữ dữ liệu public cũ trong Redis/ISR. |
| P2-3 | Major | Mở | `revalidateCurationSurfaces` truy vấn Pages với `limit: 100`, không `pagination:false` hoặc loop trang. | Khi một curation được dùng trên hơn 100 Page, các Page còn lại không được revalidate. |
| P2-4 | Major | Mở | Migration khai báo `site_id integer NOT NULL` nhưng FK dùng `ON DELETE SET NULL`. | Xóa site có thể lỗi integrity; hành vi retention chưa nhất quán với schema. |
| P2-5 | Major | Mở | Backfill migration chọn một Page `pathname=''/tour''` với `LIMIT 1`, chỉ cập nhật `pages`, không cập nhật version tương ứng. | Multi-site hoặc dữ liệu có nhiều bản ghi /tour có thể backfill thiếu; preview/version có thể khác public page. |
| P2-6 | Major | Mở | `down()` trả về ngay, không drop schema hay hoàn nguyên relationship/backfill. | Rollback release không thể phục hồi DB bằng Payload migration. Cần backup/forward-fix khi deploy. |
| P3-1 | Minor | Theo dõi | Redis dùng SCAN batch 100 và nuốt toàn bộ lỗi trong `clearRedisCurationCache`. Pattern có wildcard đầu chuỗi. | SCAN tốt hơn KEYS về blocking, nhưng lỗi Redis tạo stale cache im lặng; Redis Cluster cần xác nhận client quét đủ shard. |
| P3-2 | Minor | Theo dõi | Catalog vẫn hydrate inventory wrapper/product/departure bounded tối đa 200 trước khi áp dụng curation. | Tốn query và có thể bỏ sót sản phẩm khi inventory vượt 200; không phù hợp tối ưu curation riêng theo ID. |
| P3-3 | Minor | Theo dõi | Field legacy `featuredTours` vẫn hiển thị trên Page và collection mới có danh sách riêng. | Editor có thể sửa hai nguồn dữ liệu khác nhau; cần hướng dẫn rõ nguồn ưu tiên và kế hoạch deprecate. |

### P1-1 — Preflight duplicate defaults bắt buộc

Partial unique index là biện pháp đúng để chặn race condition sau migration. Hook `enforceSingleDefaultPerSite` tự tắt các record cũ, nhưng hai request đồng thời vẫn cần DB constraint để quyết định request thắng/thua.

Trước migration phải chạy truy vấn:

```sql
SELECT site_id, COUNT(*)
FROM tour_curations
WHERE is_default = true
GROUP BY site_id
HAVING COUNT(*) > 1;
```

Nếu có dòng trả về, dừng deploy, chọn record giữ lại, tắt các record còn lại trong transaction rồi mới chạy migration. Sau khi index tồn tại, cần kiểm tra một request bị unique violation được trả về lỗi có thể xử lý, không để trạng thái UI hiểu nhầm là đã lưu thành công.

### P2-1 — Cô lập site ở resolver

`validateWingsGoTourCatalog` đã kiểm tra curation cùng site khi lưu Page và `TourCurations` hooks kiểm tra tour cùng site. Đây là lớp bảo vệ tốt cho CMS. Tuy nhiên resolver đọc reference trực tiếp với `overrideAccess: true`; khi reference đến curation khác site hoặc dữ liệu được ghi ngoài flow CMS, resolver không loại bỏ reference đó theo site.

Khuyến nghị:

- Sau `findByID`, chỉ dùng curation nếu relation `site` trùng `siteID`.
- Với curation object đã populate sẵn, cũng kiểm tra site trước khi trả ID.
- Thêm test page-site A tham chiếu curation-site B và xác nhận fallback về default/legacy.

### P2-2/P3-1 — Cache và revalidation

SCAN cursor loop tránh lệnh `KEYS` blocking, nhưng hook bỏ qua mọi lỗi Redis. Đây là quyết định fail-open hợp lý cho request CMS, nhưng phải có log/metric để phát hiện stale cache. Pattern hiện tại chỉ xóa key có tiền tố WingsGo; key naming phải thống nhất với mọi writer.

Phạm vi invalidation hiện có:

- `/`, `/tour`
- root và `/tour` theo `publicLocaleCodes`
- Page liên kết được tìm thấy

Thiếu:

- invalidation khi TourProduct thay đổi;
- invalidation khi TourDeparture hoặc wrapper/ảnh thay đổi;
- phân trang khi tìm các Page liên kết;
- kiểm tra Redis Cluster nếu production dùng nhiều shard.

Khuyến nghị ngắn hạn trước release: phân trang truy vấn Page liên kết, thêm log khi Redis invalidation thất bại, và xác nhận smoke test sau khi sửa curation thấy thay đổi trên homepage, /tour và một landing page. Khuyến nghị tiếp theo: dùng dependency invalidation từ tour/departure về các curation chứa product.

### P2-4/P2-6 — Migration và rollback

Migration tạo bảng/foreign key/index bằng `IF NOT EXISTS` và backfill idempotent ở mức “đã có default thì không tạo lại”. Các điểm cần xử lý trong runbook:

- `site_id NOT NULL` phải dùng `ON DELETE RESTRICT/NO ACTION`, hoặc bỏ NOT NULL nếu thực sự muốn SET NULL.
- Kiểm tra duplicate default trước khi tạo index.
- Xác nhận site `wings-go` tồn tại trước migration; nếu không, migration hiện tại tạo schema nhưng bỏ qua backfill.
- Xác nhận Page /tour đúng site và số lượng bản ghi; `LIMIT 1` không đủ cho dữ liệu bất thường.
- Không tuyên bố rollback hoàn chỉnh: `down()` hiện không làm gì. Phải có backup PostgreSQL và kế hoạch forward repair nếu release thất bại.
- Kiểm tra cả `pages` và `_pages_v` sau migration nếu preview/version được sử dụng.

## 3. Backward compatibility và resolver

Luồng fallback có khả năng chịu lỗi tốt:

1. Curation gắn Page.
2. Curation mặc định theo site.
3. Legacy `featuredTours` trên Page.
4. Algorithmic fallback trong `queryWingsGoTourCatalog`.

Khi curation null, không tồn tại hoặc truy vấn collection lỗi, code bắt lỗi ở Tier 1/Tier 2 và tiếp tục Tier 3/Tier 4. Khi production chưa backfill, Page /tour vẫn có thể dùng legacy array. Đây là bằng chứng cho khả năng tương thích ngược trong luồng đọc.

Giới hạn cần ghi nhận:

- Nếu Page curation tồn tại nhưng có danh sách rỗng, resolver cố ý tiếp tục fallback.
- Resolver không tự kiểm tra site của Page curation như nêu ở P2-1.
- Collection không bật versions/drafts trong file được audit; public resolver không truy vấn draft cho curation. Cần xác nhận cấu hình Payload chung không làm draft lọt vào public.
- Field legacy vẫn nên giữ trong ít nhất một chu kỳ release để rollback, nhưng cần hướng dẫn editor chỉ sửa một nguồn.

## 4. Checklist deploy Oracle Cloud ARM64

Thực hiện đúng `docs/runbooks/oracle-vps-arm64-deployment.md`:

### Trước khi upload

- [ ] Chạy unit curation, catalog, component và TypeScript check.
- [ ] Kiểm tra duplicate default bằng SQL.
- [ ] Backup PostgreSQL và lưu checksum/manifest.
- [ ] Xác nhận Redis URL, database connectivity và site WingsGo.
- [ ] Từ `app/`, chạy `pnpm run build`.
- [ ] Từ repo root, chạy `node deploy/oracle/generate-symlinks.js`.
- [ ] Chạy `powershell -ExecutionPolicy Bypass -File deploy/oracle/package-release.ps1`.
- [ ] Kiểm tra release không chứa `public/media`.

### Trình tự trên VPS

1. Tạo thư mục release theo commit/timestamp.
2. Upload zip, Dockerfile, `relink.sh` và compose production.
3. Giải nén, chuẩn hóa line ending của `relink.sh`, tạo mount `public/media`.
4. Chạy migration bằng runtime/container production đúng với app, không chạy một binary Windows hoặc SQLite local.
5. Kiểm tra bảng, foreign key, index và số lượng default sau migration.
6. Chạy backfill idempotent nếu quy trình release yêu cầu; ghi lại số record/tour/page trước và sau.
7. Build Docker image ARM64 theo Dockerfile standalone; chạy relink để tải native sharp/libvips/@libsql ARM64.
8. Chuyển symlink `current` và recreate app bằng Docker Compose.
9. Chỉ clear Redis curation keys sau khi migration/backfill thành công; không xóa nhầm namespace khác.
10. Kiểm tra `/api/health/live` và `/api/health/ready`; xác nhận DB và Redis đều up.
11. Smoke test:
   - Admin collection `tour-curations`;
   - homepage WingsGo;
   - `/tour`;
   - một Page có curation riêng;
   - locale public được cấu hình;
   - curation draft/khác site không xuất hiện public;
   - đổi thứ tự hoặc thay curation rồi kiểm tra cache/ISR cập nhật.
12. Nếu health hoặc smoke fail, giữ release cũ/current, khôi phục từ backup hoặc forward-fix; không dùng `down()` hiện tại như rollback tự động.

## 5. Bằng chứng kiểm tra trong phiên audit

| Lệnh | Kết quả |
|---|---|
| `pnpm exec vitest run --config ./vitest.unit.config.mts tests/unit/wingsGoTourCuration.unit.spec.ts` | PASS — 1 file, 18 tests |
| `pnpm exec vitest run --config ./vitest.unit.config.mts tests/unit/wingsGoCatalog.unit.spec.ts` | PASS — 1 file, 10 tests |
| `pnpm exec vitest run --config ./vitest.component.config.mts tests/component/wingsGoTourCuration.component.spec.tsx` | PASS — 1 file, 2 tests |
| `pnpm exec tsc --noEmit` | Exit 0, không có output lỗi |
| Đọc static code, migration, architecture consultation và Oracle ARM64 runbook | Đã thực hiện |
| Migration production, PostgreSQL rehearsal, Redis Cluster test, VPS deploy, browser smoke | **Chưa thực hiện** |

## 6. Quyết định

**Chưa nên đóng release production vô điều kiện.** Có thể chuẩn bị phát hành sau khi:

1. preflight duplicate defaults trả về 0 dòng;
2. xác nhận/fix FK `site_id` và quyết định rollback;
3. bổ sung hoặc chấp thuận bằng văn bản rủi ro invalidation của TourProduct/TourDeparture;
4. kiểm tra resolver cross-site;
5. chạy migration rehearsal và smoke test trên môi trường gần production.

Không phát hiện P1 chắc chắn trong code path đọc hiện tại; P1-1 là release gate phụ thuộc dữ liệu production.

> **Chưa kiểm tra:** chưa chạy PostgreSQL rehearsal, Redis Cluster, deploy VPS ARM64, browser smoke hoặc kiểm tra production data thực tế. Rủi ro còn lại lớn nhất là migration fail do dữ liệu duplicate và stale public content khi dependency tour thay đổi.




## 7. Bổ sung từ rà soát độc lập

Các điểm sau được xác nhận thêm khi đối chiếu hook collection với validator legacy:

- **P2 — Validation curation chưa đủ mạnh:** `validateTourCurationTours` chỉ kiểm tra tối đa 6, trùng ID và cùng site. Nó chưa yêu cầu tour được publish, wrapper `/tour/<slug>` publish hoặc có departure tương lai như validator Page. Một curation có thể lưu dữ liệu không đủ điều kiện rồi được resolver đọc.
- **P2 — Đổi site có thể giữ relation cũ:** hook lấy `data.featuredTours` nhưng không fallback sang `originalDoc.featuredTours`. Khi chỉ đổi site, các relation cũ có thể không được revalidate theo site mới.
- **P2 — Xóa curation đang được dùng làm mất liên kết im lặng:** quyền delete cho manager được bật, FK Page dùng `ON DELETE SET NULL`, và afterDelete chỉ revalidate. Page sẽ rơi về default/legacy mà không có cảnh báo hoặc transaction chuyển đổi.
- **P2 — Backfill không reconcile trạng thái partial:** nếu đã có default rỗng hoặc migration chạy dở, điều kiện “đã có default” khiến migration bỏ qua copy legacy và link Page.
- **P2 — Draft/publish chưa khớp tài liệu:** Collection không khai báo `versions`/draft config. Chỉnh sửa curation được live ngay; cần bật draft hoặc sửa contract/release checklist.
- **P3 — Rollback forward-only:** `down()` không hoàn nguyên schema/data. Đây là hạn chế vận hành cần ghi rõ trong runbook, không được xem là rollback tự động.

Các điểm này không thay đổi quyết định **SHIP WITH CONDITIONS**; chúng làm rõ thêm các điều kiện cần xử lý hoặc chấp thuận trước production.

