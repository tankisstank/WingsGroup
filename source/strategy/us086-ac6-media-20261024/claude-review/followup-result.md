# Cập nhật AC6 sau quyết định public-on-upload cho ảnh WingsGo

## 1. Trạng thái P1-B

**P1-B đã có quyết định sản phẩm, nên chuyển từ "phụ thuộc schema chưa quyết" thành "cần test để xác nhận".**

- AC6 không còn cần schema publication, trạng thái draft/private hay việc dò trang tham chiếu cho ảnh Go.
- Theo code tôi đã đọc ở lượt trước (`route.ts:115-128`), quyết định này khớp hành vi hiện tại: ảnh Go được phục vụ khi đúng site và có record. Vì vậy, làm đúng quyết định chủ yếu là **không thêm gate mới**.
- Câu trong AC6.7 "Anonymous không đọc được draft/private…" cần viết lại. Câu đó chỉ còn áp cho Group governed và cho truy cập khác tenant. Với ảnh Go thì ghi rõ là không áp dụng theo quyết định sản phẩm.
- Vẫn còn mở, không suy rộng từ quyết định này:
  - Chính sách cho video và tài liệu của Go. Code hiện phục vụ chúng giống ảnh, nhưng chưa ai quyết định.
  - Bốn tenant còn lại giữ hành vi hiện tại.
- G-Revoke với ảnh Go giờ chỉ còn trường hợp xóa hoặc replace: URL hay cache cũ còn phục vụ bao lâu. Không còn trường hợp thu hồi quyền.

## 2. Bộ test chấp nhận nhỏ nhất

1. **Ảnh gốc mới, chưa trang nào dùng:** sau khi upload vào Go thành công, GET ẩn danh `https://wingsgo.vn/media/<file>` trả 200. Kiểm `Content-Type` đúng và SHA-256 khớp file đã upload.
2. **Derivative:** mỗi file trong 6 bản `wingsgroup-v3-*` của parent Go trả 200, đúng MIME, và width/height decode khớp metadata.
   - Media import originals-only không có derivative: tên derivative trả 404 kèm `no-store`, còn file gốc vẫn 200.
   - Size chuẩn chưa được route whitelist (`thumbnail`, `small`…): giữ 404 và chứng minh renderer không xuất ra các URL này.
3. **Readiness không chặn file gốc:** khi derivative thiếu hoặc lỗi, file gốc vẫn 200.
4. **Cô lập site:**
   - Filename của Go gọi qua host wingsgroup.vn và ngược lại: 403/404, `no-store`.
   - Gửi `x-site-code` giả khi không có trusted context: header bị bỏ qua.
   - Alias path `/<alias>/media/...` trả cùng kết quả như path chuẩn.
5. **Group không đổi:** media Group chưa publish hoặc thiếu governance vẫn 403 qua file gốc lẫn cả 6 derivative.
6. **An toàn tên file:** `..`, `%2F`, ký tự điều khiển và tên dài hơn 255 ký tự đều trả 404.
7. **Không mở rộng bề mặt:** quyết định chỉ áp cho **bytes ảnh**. Kiểm tra `/api/media` list và metadata ẩn danh vẫn giữ hành vi hiện tại, không cho liệt kê media.
8. **Replace và xóa:**
   - Sau replace, URL được render trả bytes mới.
   - Sau xóa, origin trả 404 `no-store`. Đo riêng thời gian CDN warm cache còn trả bản cũ.

**Lưu ý an toàn nội dung (không phải gate quyền):** `publicMediaContentType` có mapping SVG, và tôi không thấy Media giới hạn `mimeTypes` trong config đã đọc. Nếu ảnh SVG được public ngay khi upload, đây có thể là rủi ro stored XSS cùng origin. Đây là giả thuyết. Xử lý bằng kiểm tra loại file thật khi upload, không phải bằng gate publish.

## 3. G-Async có giải quyết P1-A không

**Có, với ba điều kiện:**

- **Ngân sách chốt trước khi đo.** Bộ file đo phải đại diện: PNG ~3 MB, ảnh 3156px, ảnh portrait, ảnh có EXIF orientation, đủ 13 size gồm cả AVIF.
- **Có đo tải đồng thời:** 2 lượt upload chạy song song, và đo latency endpoint lead trong lúc encode.
- **Bằng chứng ở chế độ sync:**
  - Hai replace đồng thời cho ra record cuối mà mọi `sizes.*` đều sinh từ **cùng một source**, kiểm bằng hash/decode.
  - Kill process trong lúc ghi file: record vẫn trọn vẹn là bản cũ hoặc bản mới. File orphan được chấp nhận nhưng phải được báo cáo.

**Các gate còn mở:**

- G0 / G-Measure: cách tính video so với yêu cầu tải xong và quy tắc tập request thiết yếu.
- G-Legacy: width thật của media Group.
- G-Revoke: chỉ cho Group và cho việc xóa/replace ảnh Go.
- P1-C: owner và phạm vi xử lý TTFB/JS.
- Chính sách video/tài liệu của Go.
- Người chuẩn bị MP4 và người được sửa dữ liệu hero.

## 4. Những gì không được thêm cho ảnh Go

- Field `publicationState`, draft, private, rights-approval hay `managedBy` Group trên ảnh Go.
- Kiểm tra "đang được trang đã publish tham chiếu" trước khi phục vụ ảnh.
- Trả 403 vì derivative chưa ready, vì quá budget hay vì thiếu alt. Readiness ở slot (P2-H) chặn **publish trang**, không chặn **đọc ảnh**.
- Signed URL, yêu cầu cookie hoặc auth để xem ảnh public.
- Đặt `no-store`/`private` cho ảnh Go với lý do "thu hồi quyền". Ảnh Go được dùng TTL hữu hạn; `no-store` chỉ dành cho response từ chối.
- Ẩn hoặc 404 ảnh Go chưa được nơi nào dùng.

Các gate trên vẫn đúng cho Group và cho truy cập khác tenant, nên phải giữ nguyên ở đó.

Tôi không xác nhận code hay kế hoạch đã sẵn sàng production. Lượt này chỉ đọc `claude-review/resolution.md`, ngoài ra dựa trên code đã đọc ở lượt trước. Tôi không chạy test và không truy cập VPS hay CDN.

CLAUDE_AC6_FOLLOWUP_COMPLETE
