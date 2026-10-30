# Brief cho agy — US-093 Phase 3 (browser, thanh lọc, URL, Theo ngày, trạng thái rỗng, metadata)

Bạn là agent implement; Claude là orchestrator. Làm trong worktree `E:\repo\WingsTravel-us093`, nhánh `feat/us-093-departure-schedule-v2`. Không push, không deploy, không sync Plane, không đụng DB của repo chính hay production.

Phase 2 (`b29a8d1`) và vòng sửa K1–K3 (`4d46710`) đã được orchestrator chấp nhận: component 17/17, unit 58/58, integration 5/5, tsc 2 lỗi baseline.

## Đọc trước

- Thư mục story: `handoff.md` mục 3 và mục 5 (điểm 2–7, 9, Responsive, SEO); `design.md` mục DTO, "Nơi giữ trạng thái bộ lọc", Bảng trạng thái, Facet và bộ lọc, SEO, Giao diện, D8, D9, D12 (Q3), D13; `execplan.md` mục "Phase 3".
- Prototype (chỉ tham chiếu giao diện và câu chữ; **không copy HTML/CSS/JS, không dùng mảng dữ liệu nhúng**): `C:\Users\VIETD\AppData\Roaming\Open Design\namespaces\release-stable-win\data\projects\6ffd6d32-dc11-4cff-9cd7-7f8987c230cd\tour-page-redesign\wingsgo-departures-v2.html`.
- Mẫu US-092: `WingsGoTourCatalogClient.tsx` (đồng bộ URL, `popstate`, giữ `utm_*`), cách `/tour` xử lý metadata `noindex, follow` + canonical trong `cmsPage.tsx`.
- `PromotionPrice`, `PromotionBadge` (US-083) và cách `WingsGoTourCard` dùng chúng.

## Ranh giới module (bắt buộc)

- Component client chỉ import runtime từ `tours/wingsGoScheduleModel.ts` và các module thuần khác. **Không** import runtime từ `tours/wingsGoSchedule.ts`, `tours/queries.ts` hay module nào kéo `payload`/`next/headers`. `import type` được phép.
- Client **không** tính lại ngày, `canHoldSeat`, availability hay giá: mọi thứ đó đã có sẵn trong row của snapshot.

## Việc cần làm

1. **`WingsGoScheduleBrowser.tsx`** (client root). Nhận `snapshot` (`rows`, `tours`, `months`, `markets`, `airlines`, `marketCards`, `initialFilters`, `locale`). Giữ state bộ lọc (khởi tạo từ `initialFilters`) và dùng `filterScheduleRows`, `countScheduleFacets`, `sortScheduleRows` từ module thuần.
   - Nối biểu đồ tháng và thẻ thị trường của Phase 2. Số trên cột và chip đổi theo các bộ lọc khác (facet bỏ chính chiều đang đếm). Bấm cột lần nữa thì bỏ lọc tháng. Bấm thẻ thị trường thì đặt `market` và cuộn tới danh sách bằng hàm cuộn của Phase 2.
   - Hero chữ (eyebrow, H1, 4 số liệu) vẫn render trên server, không phụ thuộc bộ lọc.
2. **`WingsGoScheduleFilterBar.tsx`**: sticky `top: 0` (D13; không đổi header). Gồm: tìm kiếm không dấu có debounce (khoảng 200–300 ms), hãng bay, tình trạng, sắp xếp (ngày gần nhất; giá thấp nhất, đợt không giá xếp cuối), chuyển chế độ xem (Theo ngày / Theo hành trình — Phase 3 chỉ làm Theo ngày; nút "Theo hành trình" đặt `view=tour` và tạm hiện danh sách Theo ngày, Phase 4 sẽ thay), chip thị trường kèm số đợt. Mobile: thanh gọn, chip cuộn ngang trong khung, không cuộn ngang trang.
3. **Dòng kết quả**: số đợt và số hành trình; chip bộ lọc đang bật, bỏ được từng cái; nút xoá tất cả.
4. **`WingsGoScheduleDateList.tsx` + `WingsGoScheduleRow.tsx`** (Theo ngày):
   - Nhóm theo tháng (`monthKey`), hiện 8 đợt mỗi tháng. Khi `sort=price` thì không nhóm tháng.
   - **D8:** SSR và lần render đầu ở client render **đủ mọi row khớp bộ lọc**, chưa có `hidden`. Sau `useEffect` (enhanced = true) mới gắn `hidden` cho row thứ 9 trở đi của mỗi tháng và hiện nút "Xem thêm" (`aria-expanded`, `aria-controls`). Không dùng `.slice(0, 8)` ở SSR, không dùng `<noscript>`.
   - Row dạng vé: cuống ngày kèm thứ (dùng business calendar, không `toLocaleDateString`); tên tour (link "Xem tour" tới trang tour theo locale, dùng `SiteLink`/pattern hiện có); dòng thông tin: mã nơi đi → nhãn thị trường, hãng bay đã chuẩn hoá, "Về dd/mm" chỉ khi có ngày về; **Q3:** tour hot có nhãn chữ tĩnh "Tour hot" / "Hot tour" (không viền cầu vồng, không chỉ dựa vào màu); giá bằng `PromotionPrice` (`<del>` khi `original > price`) và `PromotionBadge` cho `promoLabel`, kèm `urgencyLabel`; nhãn tình trạng theo bảng trạng thái; CTA dùng `row.ctaHref`/`row.ctaLabel` qua `SiteLink` để thêm locale. Chữ ở trạng thái sold-out đạt tương phản 4,5:1.
5. **`WingsGoScheduleEmpty.tsx`**: khi không có kết quả, gợi ý bỏ từng bộ lọc kèm số đợt sẽ hiện nếu bỏ bộ lọc đó, và một lối tới chuyên viên (`/lien-he` theo locale). Snapshot không có đợt nào thì hiện trạng thái rỗng riêng, không hiện lịch quá khứ.
6. **URL** (D9, whitelist `market, month, airline, status, q, sort, view`): đồng bộ hai chiều bằng `history.replaceState`/`pushState` theo mẫu US-092, xử lý `popstate`, giữ tham số tracking (`utm_*` và tham số lạ không thuộc whitelist), bỏ tham số khi bằng mặc định.
7. **`cmsPage.tsx`**: truyền `searchParams` tới `getWingsGoScheduleSnapshot` để `initialFilters` đúng ngay ở SSR. Metadata của `/lich-khoi-hanh` (VI và EN): `noindex, follow` khi có **bất kỳ** tham số whitelist nào, kể cả giá trị sai; `utm_*` không tính; canonical luôn về `/lich-khoi-hanh` hoặc `/en/lich-khoi-hanh`.
8. **Gỡ đường cũ cho WingsGo**: nhánh WingsGo của `TourSchedulePage` không còn render `DepartureStrip`, `ScheduleInteractiveDepartures` và không gọi `getResolvedScheduleData` cho trang lịch WingsGo nữa (bỏ query thừa ở `cmsPage.tsx`). Xoá `ScheduleInteractiveDepartures.tsx` chỉ khi không còn nơi nào dùng. Giữ khối CTA cuối trang (Zalo OA + hotline từ cấu hình site) cho tới Phase 4. Site khác không đổi.
9. **Hai điểm nhỏ còn lại của Phase 2:**
   - cột biểu đồ đang `bg-muted/80`, gần như không thấy trên nền thẻ: dùng nền trung tính đậm hơn từ token theme (prototype dùng `--surface-strong`), hover/selected dùng `--site-brand`, vẫn đạt tương phản;
   - số liệu hero đang hard-code `font-['WingsGo_Display',…]`: dùng class `.wingsgo-display` có sẵn.

## Test

- **Component** (`app/tests/component/`):
  - row đủ trạng thái: mở bán, sắp hết chỗ, đã kín, chờ báo giá, có `originalPrice`, `promoLabel`, `urgencyLabel`, `ctaLabelOverride`, tour hot (nhãn chữ, không có class viền cầu vồng);
  - D8: render đầu đủ row, không có `hidden`; sau enhance mới có `hidden`; "Xem thêm" mở ra; row đang ẩn không nhận focus;
  - trạng thái rỗng và nút khôi phục từng bộ lọc với số đợt đúng;
  - bộ lọc ban đầu từ `initialFilters` có hiệu lực ngay ở render đầu;
  - biểu đồ + thẻ thị trường + thanh lọc trong cùng browser: đếm facet đổi theo nhau, bấm cột lần hai bỏ lọc;
  - `sort=price` không nhóm tháng, đợt không giá xếp cuối;
  - EN không có chữ VI trong UI.
- **Unit:** metadata với `?view=tour`, `?sort=price`, giá trị sai (`?market=xyz`), chỉ có `utm_source`, trang EN.
- Test render component thật, không tự viết lại logic trong test.

## Cổng, commit, báo cáo

- `pnpm run lint`, `pnpm run test:unit` (chỉ còn lỗi baseline `wingsGroupV3Shell`), `pnpm run test:component`, `pnpm exec tsc --noEmit` (2 lỗi baseline), `pnpm run build`.
- Integration qua `node scripts/run-integration-tests.mjs`: `wingsGoScheduleIntegration`, `wingsGoLeadCompatibility`.
- Dev server local trên DB copy của worktree: chụp `/lich-khoi-hanh` và `/en/lich-khoi-hanh` ở 1440 và 390, thêm một ảnh có bộ lọc (`?market=…&view=date`) và một ảnh trạng thái rỗng, vào `artifacts/phase3/`. Kiểm bằng `curl` rằng HTML SSR của URL có bộ lọc đã chỉ chứa row khớp, có `noindex` trong meta robots, và URL không lọc chứa link tới mọi tour trong snapshot. Ghi lệnh và kết quả vào báo cáo.
- Không commit `payload-types.ts` hay `.snap` chỉ khác line-ending.
- Commit một lần: `feat(wingsgo): US-093 phase 3 schedule browser, filters, URL state and date list`, kèm:

```
Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01LPBpFfhDsGd5w6zaiq2fq4
```

- Ghi `phase3-report.md`: file đã sửa/xoá, quyết định nhỏ, output test thật, ảnh, bằng chứng curl, điểm còn mở.

Khi xong in `US093_PHASE3_DONE`. Nếu bị chặn, in `US093_PHASE3_BLOCKED` kèm lý do. Điều kiện dừng theo `execplan.md`, thêm: phải đổi DTO, hoặc phải đổi giao diện `/tour`, trang chủ hay site khác.
