# Codex Gate Review 3 — US-092 Phase 1c

- Ngày: 2026-10-29 (hoàn tất 19:56)
- Model: `gpt-6.1-sol`, chạy tương tác qua herdr
- Phạm vi: `git diff 110a4f3..ea6236e`, `phase1c-report.md`
- Ghi lại nguyên văn kết luận của Codex từ pane.

Kiểm thử mới:

• Unit: 4 files, 110 tests passed
• Component: 1 file, 8 tests passed
• git diff --check 110a4f3..HEAD: sạch

## P1

Không phát hiện lỗi thực sự chặn Phase 2.

## P2

### P2.1 — nextOffset sai khi cursor bị từ chối

File: app/src/tours/wingsGoCatalog.ts:930, 1008

Cursor lỗi hoặc sai context được xử lý bằng cách chọn lại từ offset 0, nhưng DTO vẫn tính:

nextOffset: offset + all.cards.length

Kịch bản: request gửi cursor hỏng cùng offset=60; response trả page đầu nhưng nextOffset=66.

Đề xuất: dùng effectiveOffset + all.cards.length.

### P2.2 — Context dùng FNV-1a 32-bit

File: app/src/tours/wingsGoCatalog.ts:176-183, 432-462

ctx đã gắn site, locale, sort và filter chuẩn hóa. Quyết định không dùng HMAC hợp lý cho dữ liệu public, API no-store, và cursor giả mạo chỉ ảnh
hưởng response của chính request đó.

FNV-1a không cung cấp tính toàn vẹn và có khả năng collision lý thuyết. Đây là rủi ro cần xem lại nếu cursor sau này dùng cho dữ liệu riêng tư,
cache dùng chung hoặc quyền truy cập.

### P2.3 — Tính nhất quán dữ liệu giữa ba lần đọc

File: app/src/tours/wingsGoCatalog.ts:790-844

Wrapper, products và departures vẫn được đọc tuần tự, không có transaction/read snapshot. Một thay đổi đúng giữa các lần đọc có thể tạo DTO trộn
trạng thái.

Việc chấp nhận rủi ro này cho Phase 2 là hợp lý nếu catalog cho phép eventual consistency. Cần giữ ghi chú release và đánh giá lại trước production
nếu yêu cầu snapshot nghiêm ngặt.

## P3

• Cursor v2 đã gắn siteID, locale, sort và filter; cursor sai hoặc giả mạo được reset về trang đầu.

• x mang featured IDs của trang đầu qua các cursor tiếp theo; param exclude đã được loại bỏ.

• Route dùng enabled !== true tại app/src/app/(payload)/api/wingsgo/tour-catalog/route.ts:88.

• API real-path đã kiểm tra phân trang, inventory mutation, curation mutation, expiry, locale, filter, site và cursor malformed tại app/tests/unit/
  wingsGoTourCatalogEndpoint.unit.spec.ts:297-570.

• Homepage vẫn lấy catalog.featured một lần tại app/src/tours/wingsGoCatalog.ts:1142-1151.

• SSR truyền nguyên initial, gồm nextCursor, qua app/src/tours/WingsGoTourCatalogSection.tsx:30-45.

• /en được truyền qua page query, catalog query và client copy locale.

• Multisite được lọc ở cả Payload query, post-filter và cursor context.

• Frontend route dùng dynamic = 'force-dynamic'; API trả Cache-Control: no-store.

• Client reset cards, offset, cursor và abort request cũ khi filter đổi tại app/src/tours/WingsGoTourCatalogClient.tsx:83-95.

Nên bổ sung test cho nextOffset khi cursor invalid và một SSR integration test kiểm tra initial.nextCursor; đây là khoảng trống kiểm thử, chưa phải
blocker.

VERDICT: GO
