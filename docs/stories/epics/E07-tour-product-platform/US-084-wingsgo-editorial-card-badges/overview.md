# US-084 — Badge biên tập trên card tour WingsGo

**Ngày phân tích:** 21/10/2026  
**Lane:** high_risk  
**Trạng thái:** Hoàn tất  
**Site:** WingsGo  
**Epic:** E07 — Nền tảng sản phẩm tour WingsGo

## Mục tiêu

Cho phép đội nội dung gắn nhãn biên tập `Tour hot`, `Specialize` và `VIP` cho tour trong CMS. Các nhãn này xuất hiện nhất quán trên card list của homepage, `/tour` và các trang market/điểm đến.

US-084 là phạm vi biên tập và nhận diện card. `promoLabel`, giá gốc, giá bán và trạng thái thương mại vẫn thuộc US-083; không dùng badge biên tập để suy ra giảm giá.

## Hợp đồng đề xuất

- Thêm một nhóm dữ liệu typed, tên đề xuất `editorialBadges`, trên `TourProducts`; mỗi phần tử có `kind` (`hot`, `specialized`, `vip`) và `label` bản địa hóa. CMS tự điền label gần nhất theo kind/locale làm preset để editor không phải nhập lại, nhưng label vẫn có thể sửa riêng.
- Dữ liệu là thuộc tính cấp tour, site-scoped và locale-aware. Không lấy dữ liệu từ `TourDepartures` và không thêm override vào `TourCurations` trong story này.
- Giữ các field `badges`/`marketCard.badges` cũ để tương thích; không âm thầm diễn giải chuỗi tự do thành badge có hành vi. Migration dữ liệu chỉ mở khi có quyết định riêng.
- Tối đa một badge cho mỗi `kind`, tối đa ba badge trên một tour. Thứ tự mảng là thứ tự hiển thị của nhãn dán.
- Không fallback nhãn tiếng Việt trên `/en`; thiếu bản dịch phải được xử lý theo chính sách locale hiện hành.

## Hành vi hiển thị

- `hot`: card có viền ngoài dày đúng `2px`, nền viền dùng gradient cầu vồng kiểu AI/conic-gradient; giữ nguyên kích thước card, border-radius và vùng ảnh. Không dùng màu sắc làm tín hiệu duy nhất; nhãn vẫn có text.
- `specialized` và `vip`: nhãn dạng sticker gắn cố định ở góc card, có khoảng cách với badge khuyến mại thương mại. Nếu cùng xuất hiện thì xếp chồng theo thứ tự dữ liệu, không che ảnh, tiêu đề hoặc CTA.
- Có thể hiển thị đồng thời `hot` và các sticker. Không có `hot` thì card giữ viền mặc định.
- Animation gradient nếu có phải tắt hoặc giảm theo `prefers-reduced-motion`.
- DTO dùng chung cho `WingsGoHomepageSections`, `WingsGoTourCard` và `StructuredPages`; không tạo logic phân loại riêng trên từng bề mặt.

## Authoring trong CMS

Trong Tour Products, thêm nhóm “Nhãn biên tập trên card” với lựa chọn loại badge và label theo locale. Khi chọn kind, CMS điền sẵn label gần nhất theo locale; editor có thể giữ hoặc sửa label trước khi lưu. Sticker đặt góc trên trái; promo thương mại giữ góc trên phải. Người biên tập sửa badge ở cấp tour; việc sửa lịch khởi hành/giá promotion không làm thay đổi badge này.

## Tiêu chí chấp nhận

- **AC1:** CMS cho phép lưu `hot`, `specialized`, `vip` theo tour với label locale tương ứng và chặn kind trùng/quá ba badge.
- **AC2:** Card có `hot` dùng viền gradient cầu vồng 2px; card không có `hot` không bị đổi layout.
- **AC3:** `specialized` và `vip` hiển thị dạng sticker ở góc card, không che ảnh, tiêu đề, giá, promo badge hoặc CTA ở desktop/mobile.
- **AC4:** Homepage, `/tour` và market routes hiển thị cùng DTO, cùng thứ tự và cùng label locale.
- **AC5:** Không có badge biên tập thì output không thêm khoảng trống, class hoặc text rỗng ảnh hưởng layout.
- **AC6:** Không suy ra discount, giá hoặc `promoLabel` từ badge; dữ liệu site khác không được rò rỉ sang WingsGo.
- **AC7:** Sửa/xóa badge revalidate đúng các route public của tenant `wings-go`, không flush Redis toàn hệ thống.
- **AC8:** Unit, component, integration và browser desktop/mobile chứng minh các trạng thái: không badge, từng badge, hot+kết hợp sticker, locale `/en`, card dài và reduced motion.

## Ngoài phạm vi

Không thêm bulk editing, campaign scheduling, badge tự sinh theo doanh số, badge theo từng departure, thay đổi giá/khuyến mại, hoặc migration tự động từ dữ liệu badge chuỗi cũ.

## Gate trước khi code

Architecture decision trong `docs/decisions/2026-10-21-us084-editorial-card-badges.md` phải được chấp thuận. Sau đó mới sửa schema, DTO, ba bề mặt card, revalidation và chạy browser QA.
