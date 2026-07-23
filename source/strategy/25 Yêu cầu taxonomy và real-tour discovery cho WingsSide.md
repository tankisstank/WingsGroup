# Yêu cầu taxonomy và real-tour discovery cho WingsSide

## 1. Bối cảnh

WingsSide đã có 22 `TourProduct` thật được import từ BestPrice và một giao diện
hi-fi cho Home, Destinations, Styles, Packages và Tour Detail. Tuy nhiên ba khối
discovery trên Home vẫn đang dùng dữ liệu trình bày tĩnh:

- `Where your route can go` dùng card binding tĩnh theo điểm đến;
- `How you like to travel` dùng card binding tĩnh theo phong cách;
- `Which Vietnam story pulls you in first?` dùng package copy, giá và URL tĩnh.

Điều này tạo khoảng cách giữa giao diện đã được duyệt và nguồn dữ liệu sản phẩm
thật. Nếu public nguyên trạng, người dùng có thể nhìn thấy giá, hành trình hoặc
CTA không đại diện cho tour đang được quản lý trong Payload.

## 2. Quyết định phạm vi

Đây là một Change Request về product data, không phải phần kéo dài của US-048.
US-048 tiếp tục là story visual parity. Change Request mới được chia thành:

1. `US-049`: bổ sung taxonomy và phân loại 22 tour đã import;
2. `US-050`: wire ba khối discovery vào tour thật và quyền chọn của CMS;
3. `BUG-WS-001`: ghi nhận lỗi Sample Journeys đang render dữ liệu tour tĩnh.

## 3. Business requirements

### REQ-WS-DISC-001 — Real-tour discovery

Mọi card có hình thức như một sản phẩm tour phải lấy title, ảnh, summary,
duration, price/currency và URL từ một `TourProduct` WingsSide đã publish.

### REQ-WS-TAX-002 — Controlled tour classification

Mỗi tour WingsSide phải có cấu trúc phân loại rõ ràng:

- một hoặc nhiều destination tag;
- một hoặc nhiều travel-style tag;
- trạng thái đủ điều kiện xuất hiện trong discovery;
- dữ liệu provenance để biết tag được import, backfill hay editor xác nhận.

Không phân loại tour tại runtime bằng cách dò title, summary hoặc slug.

### REQ-WS-CUR-003 — Editorial selection and ordering

Editor phải chọn được tour đại diện và thứ tự hiển thị cho:

- sáu destination slot;
- sáu travel-style slot;
- ba Sample Journey slot.

Selection phải giới hạn cùng site, published và phù hợp taxonomy của slot.

## 4. Quy tắc dữ liệu

- Payload là nguồn thật; frontend không chứa fallback giả trông như tour thật.
- Taxonomy dùng stable key, không dùng label đã dịch làm định danh.
- Một tour có thể thuộc nhiều destination và nhiều travel style.
- `market=vietnam` không thay thế destination tag.
- Badge marketing và vị trí featured không được suy đoán từ giá.
- Nếu slot CMS thiếu hoặc record bị unpublish, UI dùng empty state/ẩn slot có
  kiểm soát và tạo audit finding; không quay về card tĩnh.

## 5. Phạm vi nội dung 22 tour

Toàn bộ batch `wingsside-bestprice-22-20260717` phải được rà soát và gắn tag.
Mapping phải có dry-run, apply idempotent và bảng sign-off cho editor. Mỗi record
phải có ít nhất một destination tag và một travel-style tag trước khi đủ điều
kiện làm nguồn Home discovery.

## 6. Definition of done

- 22/22 tour có taxonomy hợp lệ hoặc có exception được phê duyệt rõ ràng.
- Ba khối Home không render dữ liệu tour giả.
- Ba Sample Journeys trỏ tới wrapper/tour detail thật.
- CMS có thể thay tour và thứ tự mà không sửa code.
- Migration chạy được trên PostgreSQL và rollback được.
- Desktop/mobile giữ layout hi-fi đã duyệt.
- Tests chứng minh site isolation, published filtering, stable ordering và no
  static-tour fallback.

## 7. Ngoài phạm vi

- Import thêm tour ngoài batch 22.
- Booking/payment hoặc availability thời gian thực.
- Tự động quyết định taxonomy bằng AI trong production runtime.
- Deploy production trước khi SEO tenant, form delivery và VPS release gate pass.
