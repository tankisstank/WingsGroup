# US-092 — WingsGo Tour Catalog v2

## Hành vi hiện tại

WingsGo `/tour` đã có catalog server/client dùng chung DTO `WingsGoCatalogCard`, curation tối đa sáu slot, bộ lọc qua URL, tải thêm có chống race, badge biên tập, promotion price và revalidation theo tenant. Hero curation hiện chỉ được wiring cho homepage; Live Simulator CMS đang mô phỏng layout cũ.

Đang có lỗi locale: `WingsGoTourCatalogSection` và API `/api/wingsgo/tour-catalog` không truyền `locale` xuống query, nên `/en/tour` nhận dữ liệu và nhãn tiếng Việt.

## Hành vi mục tiêu

- `/tour` dùng Hero `WingsGoCommerceHero` (component dùng lại được, không phải key mới trong hero registry của CMS), lấy slot #1–#3 từ resolver curation bốn tầng. Slot #1 là thẻ nổi bật có ảnh, giá thật, ngày và hãng bay; slot #2–#3 là ô phụ. Hero không bị bộ lọc tác động.
- Catalog giữ hai section: "Tour nổi bật" (slot #4–#6) và "Tất cả tour". Khi có bộ lọc, section "Tour nổi bật" ẩn đi và "Tất cả tour" chứa mọi tour khớp, nên không có card bị trùng hoặc biến mất.
- Card v2 có biến thể wide và dòng thông tin ngày/hãng bay, đồng thời giữ nguyên hợp đồng badge/promotion/giá của US-083, US-084 và US-091.
- Trang có thêm dải "Sắp cất cánh", các ô thị trường tổng hợp từ cùng inventory đủ điều kiện, chip filter trên URL, và bộ lọc server-side `departureMonth`/`season` với bốn mùa.
- Ảnh ô thị trường được chọn ngẫu nhiên nhưng deterministic từ các tour đủ điều kiện trong chính market đó, nên không nhấp nháy giữa các lần render.
- `/en` không fallback sang nhãn tiếng Việt. Chỉ site `wings-go` nhận thay đổi giao diện.

## Acceptance Criteria

- Hiển thị `/en/tour` và API tải thêm ở ngữ cảnh EN không còn nhãn tiếng Việt nào.
- Dựng Hero, Tour nổi bật và Tất cả tour từ một snapshot theo resolver bốn tầng, không trùng card khi có hoặc không có filter.
- Lọc theo tháng và bốn mùa bằng lịch VN; card và ngân sách dùng departure, giá trong cửa sổ; URL có filter đặt noindex.
- Hiển thị Sắp cất cánh với badge N ngày do server tính và ô thị trường có số tour, giá thấp nhất, ảnh ổn định.
- Giữ nguyên homepage WingsGo, quy tắc giá và badge US-083/084/091, không thay đổi WingSide và WingsGroup.
- Đồng bộ Live Simulator với public renderer và đạt bằng chứng trình duyệt 1440/390 cho VI và EN.

Kiểm tra chi tiết cho từng tiêu chí nằm trong `validation.md`.

## Người dùng bị ảnh hưởng

- Khách WingsGo trên desktop 1440px và mobile 390px.
- Editor WingsGo quản lý TourCurations và xem Live Simulator.
- Developer/operator kiểm tra cache, tính dynamic và tenant isolation.

## Tài liệu sản phẩm liên quan

- `docs/product/tour-product-platform.md`
- `docs/product/multisite-platform.md`
- `docs/stories/epics/E07-tour-product-platform/US-078-wingsgo-tour-curation-console/overview.md`
- `docs/stories/epics/E07-tour-product-platform/US-083-wingsgo-tour-discount-promotions/overview.md`
- `docs/stories/epics/E07-tour-product-platform/US-084-wingsgo-editorial-card-badges/overview.md`
- `docs/stories/epics/E07-tour-product-platform/US-091-wingsgo-homepage-lowest-price.md`

## Ngoài phạm vi

- Không đổi giá, departure hay dữ liệu production.
- Không booking/payment, không collection curation mới, không migration schema, không thêm key vào hero registry.
- Không seed demo trên production, không đổi giao diện site khác, không đổi font WingsGo.
- Không thêm kênh liên hệ chưa được xác nhận; hiện chỉ dùng Zalo OA và hotline.
