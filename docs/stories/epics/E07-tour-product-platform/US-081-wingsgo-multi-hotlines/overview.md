# US-081 — Đa Hotline Liên hệ & Tư vấn WingsGo có Click-to-Call (`tel:`)

## 1. Trạng thái (Status)

`in_progress`

## 2. Phân làn (Lane)

`high-risk` — bổ sung schema, migration và luồng dữ liệu multisite.

## 3. Hợp đồng Sản phẩm (Product Contract)

Hệ thống cho phép hiển thị và tương tác với danh sách đa hotline liên hệ trên site WingsGo, bổ sung thêm 2 đầu số `0915250101` và `0915260101` bên cạnh hotline chính hiện có `0912910101`.

Hệ thống phải đảm bảo:
1. **Bảo tồn Hotline chính & Bổ sung Hotline phụ:**
   - Hotline chính: `0912 910 101` (tel: `0912910101`).
   - Hotline phụ 1: `0915 250 101` (tel: `0915250101`).
   - Hotline phụ 2: `0915 260 101` (tel: `0915260101`).
2. **Click-to-Call (`<a href="tel:...">`) trên Mọi Thiết bị:**
   - Mọi số điện thoại khi hiển thị bắt buộc phải bọc trong thẻ liên kết `<a href="tel:[so_chuan_hoa]">` với định dạng số sạch (không chứa khoảng trắng hay dấu chấm trong thuộc tính `href`, giữ nguyên số `0` ở đầu).
   - Khi người dùng chạm vào số điện thoại trên di động hoặc máy tính bảng, hệ thống kích hoạt ứng dụng quay số (dialer) ngay lập tức mà không cần copy/paste thủ công.
3. **Phân phối Điểm chạm UI/UX:**
   - **Header Desktop:** Giữ hotline chính gọi trực tiếp, có dropdown/popover hoặc nhóm chip số phụ tinh gọn, không làm vỡ bố cục thanh điều hướng.
   - **Header Mobile Navigation Drawer:** Liệt kê đầy đủ 3 đầu số với icon ☎/📞 và nhãn rõ ràng để gọi ngay.
   - **Footer:** Hiển thị khu vực Hotline tư vấn với đủ 3 số, có click-to-call.
   - **Floating Action Button (SiteContactFab):** Hiển thị danh sách 3 đầu số hotline trực quan trong popover liên hệ để khách hàng tùy chọn bấm gọi.
   - **Modal Tư vấn Giữ chỗ (RetailTourConsultationDialog):** Cung cấp các nút gọi nhanh cho từng hotline và một nút Zalo OA chung qua `getSharedZaloCTA(siteCode, locale)`; người dùng đã chốt không dùng Zalo cá nhân theo số.
4. **An toàn Kiến trúc & Backward Compatibility:**
   - Collection `SiteSettings` giữ nguyên trường `supportPhone: text` làm hotline chính (tránh breaking change cho các tenant khác và database migrations).
   - Bổ sung trường `additionalHotlines` (dạng array) trong CMS.
   - Tạo helper dùng chung `resolveSiteHotlines(settings, defaultSiteCode)` chuẩn hóa, lọc trùng và giữ nguyên số 0 đầu.
   - Chỉ WingsGo nhận fallback. Trường `additionalHotlines` chưa tồn tại (`undefined`) dùng hai số phụ mặc định; `[]` hoặc `null` nghĩa là CMS đã chủ động bỏ số phụ. Không tái thêm các số đã xóa khi đọc dữ liệu hay chạy lại migration.
   - Giữ nguyên hotline chính hợp lệ do CMS cấu hình; số Việt Nam dạng `+84` được chuẩn hóa về `0`, các tenant khác giữ định dạng quốc tế hợp lệ.

## 4. Hành vi Hiện tại (Current Behavior)

- WingsGo chỉ hiển thị một đầu số duy nhất là `0912 910 101`.
- Số điện thoại bị hardcode phân tán tại Header, Footer, Fab, Modal mà chưa có cơ chế quản lý danh sách đa hotline thống nhất.

## 5. Hành vi Đích (Target Behavior)

- Khách hàng trên WingsGo có thể nhìn thấy và lựa chọn gọi vào bất kỳ số nào trong 3 đầu số: `0912 910 101`, `0915 250 101`, `0915 260 101`.
- Mọi vị trí hiển thị đều có link `<a href="tel:..."` click gọi ngay trên di động.
- Quản trị viên CMS có thể cấu hình thêm/bớt số hotline phụ trong `SiteSettings`.

## Acceptance Criteria

Tiêu chí chấp nhận theo thứ tự AC1–AC4; ba đầu số và định dạng được quy định tại Hợp đồng Sản phẩm.

- Hiển thị ba hotline tại menu di động, Footer, FAB và modal WingsGo.
- Gọi trực tiếp qua liên kết `tel:` chuẩn hóa và bộ quay số trên mobile.
- Giữ menu desktop gọn, gọi số chính và mở danh sách hotline phụ.
- Bảo toàn cấu hình và giao diện liên hệ của các site khác.
