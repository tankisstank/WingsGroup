# Codex Gate Review 2 — US-092 Phase 1b

- Ngày: 2026-10-29 (hoàn tất 19:26)
- Model: `gpt-6.1-sol`, chạy tương tác qua herdr
- Phạm vi: `git diff b1e3f23..ef5f2f4`, `phase1b-report.md`
- Ghi lại nguyên văn kết luận của Codex từ pane (Codex không tự ghi file ở lần này).

## P1

### P1.1 — Cursor không ràng buộc site, locale và filter

Vị trí: app/src/tours/wingsGoCatalog.ts:452-475, 861-864

Cursor chỉ được kiểm tra cấu trúc và sort; không có chữ ký, site, locale, filter hoặc fingerprint của request.

Kịch bản:

1. Request đầu lấy trang 1 với locale vi, không filter.
2. Request sau tái sử dụng cursor đó với locale en, market khác hoặc price filter khác.
3. Cursor vẫn được chấp nhận vì cùng sort.
4. selectWingsGoCatalogCards lọc các card có comparator nhỏ hơn cursor, khiến card hợp lệ bị bỏ sót.

Client có reset cursor khi đổi filter, nhưng API vẫn nhận các request stale hoặc được tạo trực tiếp.

Đề xuất: ký cursor bằng HMAC hoặc dùng token server-side; cursor phải chứa và xác thực site, locale, canonical filters, sort và phiên bản snapshot/
curation.

### P1.2 — exclude vẫn cho phép loại tùy ý card hợp lệ

Vị trí: app/src/tours/wingsGoCatalog.ts:484-491, 867-879; WingsGoTourCatalogClient.tsx:125-133

exclude chỉ kiểm tra regex và giới hạn sáu ID. Server không xác minh các ID đó thực sự là featured của request trước.

Kịch bản: gọi API với sáu ID hợp lệ của các tour đang đủ điều kiện. Các tour đó bị loại khỏi all, tạo khoảng trống hoặc làm mất card khỏi phân
trang.

Đề xuất: đưa featured IDs vào cursor đã ký hoặc server tự đối chiếu với context của cursor; không tin danh sách ID tùy ý từ client.

## P2

### P2.1 — Vẫn bỏ sót khi sort key thay đổi

Vị trí: app/src/tours/wingsGoCatalog.ts:561-565

Nếu departure date, price hoặc title của card thay đổi để nằm trước cursor giữa hai request, comparator sẽ loại card đó. Đây là giới hạn keyset
cursor đã được Phase 1b ghi nhận, nhưng vẫn là tình huống mất card thực tế.

Đề xuất: snapshot/generation cho catalog hoặc cơ chế refresh khi dữ liệu thay đổi mạnh.

### P2.2 — Chính sách enabled chưa dùng đúng một biểu thức

Vị trí: app/src/app/(payload)/api/wingsgo/tour-catalog/route.ts:89; query dùng strict check tại wingsGoCatalog.ts:729

Route dùng if (!enabled), trong khi query dùng enabled !== true. Với dữ liệu runtime malformed nhưng truthy, API route có thể tiếp tục xử lý trong
khi query/SSR từ chối.

Đề xuất: đổi route thành page?.wingsGoTourCatalog?.enabled !== true và thêm test với giá trị truthy không phải boolean.

### P2.3 — Test API chưa chứng minh toàn bộ đường chạy thật

Vị trí: tests/unit/wingsGoTourCatalogEndpoint.unit.spec.ts:195-229

Test endpoint chỉ mock queryWingsGoTourCatalog, nên mới chứng minh route forward cursor và exclude; chưa chứng minh:

• GET API dùng cursor đã encode thật.
• Query thật chạy qua selector keyset.
• Mutation inventory/curation qua API không skip.
• Cursor dùng sai locale/filter/site bị từ chối.
• exclude độc hại không làm mất card.

Test selector và một số test query đã tốt; test P2.1 cũng chứng minh thứ tự market image ổn định (wingsGoCatalog.unit.spec.ts:2313-2380).

### P2.4 — Ba truy vấn Payload vẫn không có snapshot chung

Vị trí: app/src/tours/wingsGoCatalog.ts trong queryWingsGoTourCatalog

Wrapper, products và departures được đọc tuần tự. Nếu inventory thay đổi giữa các lần đọc, một response có thể trộn trạng thái cũ và mới. Quyết
định hoãn P2.2 sang Phase 2 là hợp lý nếu chấp nhận eventual consistency, nhưng cần ghi rõ đây là residual release risk.

## P3

• P2.1 market image: Đã sửa đúng; sort ứng viên theo ID rồi URL, test query-level chứng minh không phụ thuộc thứ tự Payload.

• P3.2 curation: Đã sửa đúng; homepage gọi queryWingsGoTourCatalog và dùng catalog.featured, test xác nhận một lần resolve tại
  wingsGoCatalog.unit.spec.ts:2100-2108.

• P3.1 DTO bắt buộc: Chấp nhận được như hợp đồng v2; không thấy lỗi kiến trúc mới.

• P3.3 giới hạn 200 bản ghi: Có thể hoãn, vì đã có giới hạn rõ ràng; cần metrics/cảnh báo trước khi catalog vượt giới hạn.

• Whitespace đã sạch theo git diff --check.

Rủi ro chính chưa được chứng minh hoặc khóa lại là cursor không có request context và exclude không được xác thực. Vì vậy Phase 1b chưa đủ an toàn
để bắt đầu Phase 2.

VERDICT: NO-GO
