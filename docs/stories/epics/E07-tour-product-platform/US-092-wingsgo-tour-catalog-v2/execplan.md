# Exec Plan — US-092

## Mục tiêu

Triển khai `/tour` v2 cho WingsGo dựa trên DTO, query và curation hiện có: Hero dùng lại được, catalog hai section, khám phá theo market và lịch khởi hành, CMS simulator khớp layout. Toàn bộ hợp đồng nằm ở `design.md`.

## Phạm vi

Trong phạm vi: sửa locale, helper lịch nghiệp vụ, hợp đồng filter và snapshot, Hero `/tour`, catalog và card v2, dải "Sắp cất cánh", ô thị trường, SEO cho URL có filter, Live Simulator, test, QA trên trình duyệt, bằng chứng cho Harness và Plane.

Ngoài phạm vi: sửa dữ liệu production, booking/payment, migration schema, key mới trong hero registry, field media cho market, nhà cung cấp liên hệ mới, thay đổi giao diện site khác, đổi font.

## Phân loại rủi ro

Lane: `high-risk`. Harness intake: `#170`.

Cờ rủi ro: public contract, existing behavior, cross-platform, weak proof, multi-domain, tính dynamic và cache.

Cổng cứng:

- Không hard-code tour, giá, ảnh hay số liệu. Không gửi lead thật.
- Không để dữ liệu hoặc filter của WingsGo rò sang tenant khác. `/en` không dùng nhãn tiếng Việt.
- Không làm thay đổi output của WingSide/WingsGroup, trừ khi có decision record theo quy tắc ở Phase 0.
- Không đánh dấu hoàn tất nếu chưa có targeted test, build và bằng chứng trên trình duyệt.
- Phải có tham vấn Codex theo AGENTS.md trước Phase 1 và trước khi release (xem `validation.md`).

## Các phase

### Phase 0 — Baseline, locale và lịch nghiệp vụ

File: `cmsPage.tsx`, `WingsGoTourCatalogSection.tsx`, `app/(payload)/api/wingsgo/tour-catalog/route.ts`, `wingsGoCatalog.ts`, `tours/utils.ts`, helper copy VI/EN, test liên quan.

- Truyền locale qua page, API, query, DTO và client. Đưa nhãn giá liên hệ và các chuỗi của client vào bảng copy VI/EN. Phần này có thể release độc lập.
- Chạy truy vấn chỉ đọc: đếm theo site số `tour_departures.departure_date` có ngày VN khác ngày UTC. Ghi kết quả vào `validation.md`.
- Thêm `toBusinessCalendarDay`. Áp quy tắc trang detail trong `design.md`:
  - Kết quả bằng 0: chuyển `groupDeparturesByMonth` sang helper mới và thêm snapshot test cho WingSide.
  - Kết quả lớn hơn 0: giữ trang detail nguyên trạng, ghi decision record và tạo story riêng.
- Thêm test canh giữ: `/tour` vẫn `force-dynamic`, API catalog vẫn `no-store`.
- Làm trên worktree hoặc branch riêng, tách khỏi các thay đổi chưa commit không liên quan.

### Phase 1 — Snapshot và hợp đồng filter

File: `wingsGoCatalog.ts`, helper mới cạnh module tours, `parseWingsGoCatalogFilters`, API route, unit test.

- Thêm parser cho `departureMonth` và `season`, whitelist market, và định nghĩa cửa sổ khởi hành (departure khớp, giá thấp nhất trong cửa sổ, ngân sách so trên giá cửa sổ).
- Trả về một snapshot gồm `hero`, `featured`, `all`, `markets`, `upcoming` với cùng `now`. Áp quy tắc hai section: có filter thì không loại featured. API tải thêm dùng cùng quy tắc này.
- Đưa `daysUntilDeparture` vào DTO. Thêm tổng hợp market và chọn ảnh deterministic, có fallback và log khi chạm trần 200.
- Giữ resolver bốn tầng và điều kiện site. Siết tier 1: curation thiếu `site` không được chấp nhận ở nhánh object.
- Unit test:
  - Slot #1–#6, kể cả khi có ít hơn 3 tour curated.
  - Không filter thì kết quả trùng US-091.
  - Từng filter và tổ hợp AND, mùa đông qua năm mới.
  - Ranh giới 16:59Z/17:00Z.
  - Locale.
  - Cô lập site.
  - Không tự sinh mức giảm giá.

### Phase 2 — Hero `/tour`

File: `app/src/heros/WingsGoCommerceHero.tsx` (hoặc tên tương đương trong `heros/`), `cmsPage.tsx`, `HighImpact` (homepage dùng chung component), component test.

- `/tour` nhận slot #1–#3 từ snapshot. Slot #1 có ảnh, `PromotionPrice`, `nextDeparture` và hãng bay; slot #2–#3 là ô phụ.
- Homepage chuyển sang dùng chung component nhưng giữ đúng output: lấy `limit: 4` từ `getWingsGoFeaturedTours`, có snapshot test hồi quy.
- Ô tìm nhanh ghi URL params; không dùng `scrollIntoView`.
- Component test: hot, sticker và promo cùng xuất hiện; không có badge thì không có class hay khoảng trống thừa; copy `/en` đúng locale.

### Phase 3 — Catalog và card v2

File: `WingsGoTourCatalogClient.tsx`, `WingsGoTourCard.tsx`, CSS của catalog, metadata của `/tour`, test hiện có.

- Đổi select thành chips nhưng giữ đồng bộ URL, `AbortController`, generation guard và tải thêm. Client loại trùng theo `id`.
- Có filter thì ẩn "Tour nổi bật". Thêm `layout="wide"` và dòng thông tin ngày/hãng bay.
- Link thẳng tới trang detail, đúng tiền tố `/en`. Empty state giải thích việc tour giá liên hệ không tham gia bộ lọc ngân sách.
- Đặt `noindex, follow` và canonical cho URL có filter.
- Rủi ro cần test: race khi gỡ chip nhanh, race giữa ô tìm nhanh của Hero và chip filter, layout 390px, badge chồng nhau.

### Phase 4 — Sắp cất cánh và ô thị trường

File: section mới trong `app/src/tours/`, wiring trang, copy theo locale, component và integration test.

- Dải "Sắp cất cánh" sắp theo ngày, "Giá từ" theo cửa sổ hoặc US-091, hiện badge N ngày từ DTO.
- Ô thị trường hiện số tour, giá thấp nhất và ảnh deterministic. Bấm ô sẽ set `?market=`, giữ các filter khác và gọi `window.scrollTo`.
- Integration test:
  - Resolver bốn tầng cho Hero `/tour`.
  - Một snapshot, không trùng card.
  - Cô lập tenant.
  - API WingSide/WingsGroup trả catalog rỗng.

### Phase 5 — Live Simulator CMS

File: `LiveSimulatorPreview.tsx`, `FeaturedToursCurationField.tsx`, mô tả trong `TourCurations.ts`, component test.

- Simulator mô phỏng Hero #1, ô phụ #2–#3 và grid #4–#6; kéo thả cập nhật ngay.
- Dùng chung pure mapper với public renderer. Cảnh báo khi card thiếu departure hoặc giá. Không đổi schema.

### Phase 6 — QA và release review

- E2E bằng `agent-browser` ở 1440px và 390px, cả VI và EN:
  - Đổi thứ tự curation trong CMS rồi kiểm tra Hero và grid.
  - Từng filter, tháng, bốn mùa, khôi phục khi rỗng.
  - Reduced motion, điều hướng bàn phím và focus.
- Chạy trong `E:\repo\WingsTravel\app`: `pnpm run lint`, `pnpm run test:unit`, `pnpm run test:component`, `pnpm run test:int`, `pnpm run build`.
- Trước staging/production:
  - Làm theo `docs/runbooks/oracle-vps-arm64-deployment.md`.
  - Release review bằng Codex về race, cache, migration, cô lập site và rủi ro gián đoạn.
- Story chỉ đóng khi `validation.md` có đủ bằng chứng và Plane đã đồng bộ.

## Thứ tự và phụ thuộc

Phase 0 → tham vấn Codex → 1 → 2 → 3 → 4 → 5 → 6.

Phần locale của Phase 0 có thể release độc lập. Phase 5 dùng mapper từ Phase 1–3.

## Điều kiện dừng

Dừng để người dùng chốt nếu:
- cần schema hoặc migration mới;
- truy vấn Phase 0 cho thấy phải đổi trang detail trên nhiều site;
- hợp đồng bộ lọc hoặc mùa cần thay đổi;
- xuất hiện yêu cầu thêm nhà cung cấp liên hệ chưa xác nhận.

Thay đổi bất kỳ quyết định D1–D9 nào phải có decision record mới. Không tự sửa dữ liệu production hay mở rộng phạm vi.
