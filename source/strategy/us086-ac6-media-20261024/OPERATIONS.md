# Vận hành media an toàn — US-086 / AC6

Đề xuất ngày 24/10/2026; đi cùng `CMS-DESIGN.md` và `AC6.md`.

## 5. Cache, quyền truy cập và vòng đời

- URL generation có hash/version trong filename; thay bytes/crop/profile tạo
  URL mới. Không dùng mỗi query updatedAt để giả rằng cache đã đổi nội dung.
- Cache key phải phân biệt host/site/path; private/auth/draft nếu mô hình
  tenant có loại này dùng no-store, không tự gán loại này cho ảnhGo.
  Cả original và derivative đều phải tìm được parent media hợp lệ của site;
  file tồn tại trên disk không tự cho phép public.
- **Policy ảnhGo đã được user chốt:** mọi ảnh editor upload thành công đều
  public, không cần duyệt/publish/rights riêng hoặc có trang public tham chiếu.
  Original và derivative được phục vụ theo parent/site khi file sẵn có.
  Không thêm schema private/draft hoặc luồng xin quyền cho ảnhGo. Kiểm tra
  /media, public-media API, Payload file endpoint và storage/CDN nhất quán với
  policy này; giữ site-scoped lookup, chống giả site header, không cho đọc
  filename tùy ý. Governance Group giữ nguyên; loại asset khác không suy rộng.
- Publish/replace revalidate đúng page, tour, site-settings, locale và asset
  dependency đang dùng media. Không purge mọi tenant và không bỏ cache toàn hệ.
- Unpublish/revoke dưới đây chỉ áp loại media có vòng đời đó (như Group)
  hoặc thao tác thu hồi/xóa được giao rõ; không tạo vòng duyệt/thu hồi riêng
  cho ảnhGo vốn đã được user chốt public-on-upload.
- Bản public ban đầu dùng TTL hữu hạn theo chính sách thu hồi hiện có; chỉ dùng
  immutable dài hạn khi có cơ chế purge được kiểm chứng. Unpublish/thu hồi quyền
  phải chặn origin và purge CDN, kiểm tra lại warm cache. Không hứa xóa bản đã
  được người ngoài tải trước đó; không tuyên bố thu hồi hoàn tất nếu purge lỗi.
- Trước release, chốt **giới hạn thu hồi** theo loại media và cache thực tế:
  public browser max-age đề xuất ≤300s, CDN không phục vụ stale sau withdrawal,
  purge endpoint xử lý tất cả alias/generation/original/derivative. Chặn origin
  và vô hiệu generation trước purge; xử lý request cũ đang chạy có thể refill
  cache, retry purge có log và probe warm-cache sau cùng. Nếu không chứng minh
  được giới hạn thu hồi, nội dung cần thu hồi nhanh phải no-store. Quy tắc này
  là đề xuất cần test, không khẳng định header production đã được thay.
- Giữ bytes/tên cũ để rollback khác với giữ quyền public vĩnh viễn. Lookup
  cần đọc được generation cũ còn được phép; generation bị thu hồi phải bị
  chặn dù file còn trên disk. Denial no-store và không negative-cache CDN.
- Hash trùng chỉ dùng báo cáo/tái dùng trong phạm vi được cấp quyền. Không tự
  merge record hoặc xóa file trùng xuyên tenant: alt, provenance, quyền và nơi
  dùng có thể khác dù bytes giống nhau.

## 6. Backfill và vận hành lâu dài

Chuyển hero mockup từ media đơn sang các trường video/poster sẵn có là bước
mapping nội dung có mục tiêu: dry-run exact record/site/locale, snapshot và
rollback; chỉ chạy production khi được giao triển khai, không seed lại CMS.

1. Dry-run theo site và danh sách mediaID được duyệt; lập bảng nơi sử dụng,
   generation cũ, file nguồn, biến thể thiếu, dự kiến byte/disk và rollback.
2. Dự báo dung lượng đỉnh = nguồn giữ lại + biến thể mới + temp + backup/log;
   dùng headroom được runbook chấp thuận và số đo VPS thực. Không suy ra VPS
   còn chỗ chỉ vì các đợt dọn lịch sử đã hoàn tất.
3. Chạy batch nhỏ có checkpoint, concurrency1 và dừng khi thiếu tài nguyên;
   verify hash/decode/byte/dimensions trước chuyển con trỏ. Chạy lại không nhân
   file hoặc thay mediaID/quan hệ/alt/rights. Dùng lại import recovery hiện có.
4. Kiểm tra thumbnail/card/hero và quyền đọc trên staging, một canary/site rồi
   mở batch. Không tự sửa nội dung giá/điều khoản trên poster hoặc seed lại CMS.
5. Rollback chỉ con trỏ/generation và code tương thích, revalidate/purge liên
   quan; không restore toàn DB làm mất lead phát sinh sau backup. Schema mới
   phải additive/nullable/default an toàn trước triển khai consumer mới.
   Test cả chỉnh sửa nội dung không liên quan trên trang legacy, import
   originals-only và preview; không chặn toàn bộ publish do thiếu derivative
   ở media không đổi. Publish boundary kiểm tra slot bắt buộc theo locale.
6. Dọn orphan là thao tác riêng: đối chiếu tham chiếu nội dung/phiên bản/rollback,
   thời gian giữ lại và phê duyệt xóa; AC6 không cho xóa file gốc/ảnh cũ tự động.

Dashboard/monitor ban đầu dùng log và báo cáo sẵn có: job failed/stuck, thời
gian xử lý, pending backlog, disk/temp, ảnh chọn vượt budget và derivative404.
Không xây thêm dashboard lớn để hoàn thành AC6. Định kỳ chạy mẫu Lighthouse
và smoke media; cảnh báo regression sau thay template hoặc policy/profile.

## 7. Phạm vi thay đổi và bằng chứng bắt buộc

| Nơi cần chạm khi triển khai | Kiểm chứng |
| --- | --- |
| Media collection/fields/sizes, migrations/types khi thêm metadata | Upload mới, replace, ảnh nhỏ, draft, lỗi decode, rollback schema tương thích |
| Jobs/media processing và deployment worker nếu được chọn | Hai revision chạy đảo thứ tự, retry/crash/restart, disk-full, job không giành tài nguyên lead |
| Media resolver/ImageMedia, Go card/detail, Group ecosystem, rich-text/OG mappings | Selected URL, byte/dimensions, ratio, no duplicate preload, hai DPR và format fallback |
| Hero config, admin checklist/resolver/runtime | Poster initialHTML, source active, reduced-motion/SaveData/error, bàn phím/pause |
| Public media route, MIME, proxy và CDN rule nếu thực sự cần | Site/draft negative tests, source+derivative, warm-cache/unpublish, range/seek |
| Import/backfill/preflight và runbook | Dry-run, idempotency, giữ quan hệ và file gốc, disk forecast, canary và rollback |

Reuse suite: mediaAccess, wingsgroupMediaDelivery, publicMediaDelivery,
getMediaUrl, media/wingsgroupMedia components, heroPresentations admin/component/
integration/E2E. Thêm test cho lỗi thực/race mới, không coi grep hoặc HTTP200
đơn lẻ là bằng chứng UX. Shared component phải smoke đủ sáu tenant.

