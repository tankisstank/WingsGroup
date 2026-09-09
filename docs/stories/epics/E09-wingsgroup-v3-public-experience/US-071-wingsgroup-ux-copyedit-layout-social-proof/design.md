# Design

## Domain Model

Mô hình trải nghiệm công chúng của WingsGroup v3 được xây dựng dựa trên sự liên kết 5 thương hiệu chuyên biệt:
- **WingsTravel**: Du lịch Quốc tế & Outbound toàn cầu.
- **WingsGo**: Du lịch Nội địa Việt Nam & Tour trọn gói.
- **WingSide**: Du lịch Inbound cao cấp & Trải nghiệm bản địa.
- **WingsPlus**: Dịch vụ Sân bay & Hỗ trợ thủ tục bay VIP.
- **WingsCare**: Hành trình Riêng, Khách đoàn doanh nghiệp & MICE.

Toàn bộ thông điệp được chuyển dịch từ việc liệt kê đơn thuần sang mô hình giải pháp trọn gói: "Một đội ngũ — Trọn hành trình" với "Một đầu mối duy nhất: Đỡ việc, dễ quản lý".

## Component Architecture

1. **`EditorialHero` & `model.ts`**:
   - Eyebrow: `HỆ SINH THÁI DỊCH VỤ DU LỊCH WINGSGROUP`.
   - Heading H1: `Một hệ sinh thái - Trọn vẹn hành trình.`
   - CTAs: `Tham khảo dịch vụ` (cuộn tới `#he-sinh-thai`) và `Nhận tư vấn 🎧` (dẫn tới contact intake).

2. **`EcosystemExplorer`**:
   - Tuyên ngôn: `MỘT HỆ SINH THÁI. NĂM CÁCH ĐỒNG HÀNH`.
   - Cơ chế 5 lớp: `CƠ CHẾ VẬN HÀNH 5 LỚP: Một đội ngũ — Trọn hành trình`.
   - Lợi ích một đầu mối: `MỘT ĐẦU MỐI DUY NHẤT: Đỡ việc, dễ quản lý`.
   - Banner CTA: `Bạn chọn điểm đến. WingsGroup lo phần còn lại!` kèm nút tư vấn 24/7.

3. **`JourneyInquiryGrid` (New Component)**:
   - Hiển thị lưới 5 card tương tác theo nhu cầu du khách (`Tôi muốn đi nước ngoài`, `Tôi muốn khám phá Việt Nam`, `Tôi cần dịch vụ sân bay`, `Tôi cần hành trình riêng / MICE`, `Tôi cần được hỗ trợ`).
   - Mỗi card có icon trực quan, mô tả ngắn và CTA hành động trực tiếp.

4. **`TestimonialsSection` (New Component)**:
   - Hiển thị 3 nhận xét từ khách hàng thực tế (đối tác doanh nghiệp, khách hàng gia đình, khách hàng VIP) với điểm đánh giá 5 sao và nhãn thương hiệu liên quan.
   - Banner chuyển đổi kép: `[XEM TOUR]` và `[NHẬN TƯ VẤN 🎧]`.

5. **`WingsGroupCapability` Block**:
   - Bố cục 2 cột: Cột 1 là 4 bước quy trình tư vấn và triển khai tour; Cột 2 là 6 tiêu chuẩn phục vụ cam kết.
   - Bổ sung 5 dòng năng lực chuyên sâu tương ứng với 5 thương hiệu (`data-service-row={1..5}`).
   - Tích hợp gallery 4 khung hình ảnh đại diện cho các dịch vụ thực tế.

6. **`WingsGroupTrust` Block & `WingsGroupCorporate`**:
   - Thông tin pháp nhân đầy đủ của Vietwings và các đơn vị thành viên.
   - 3 trụ cột phụng sự (Tận tâm, Chuyên nghiệp, Minh bạch).
   - Lưới chứng chỉ pháp lý trực quan có kiểm soát bảo chứng.

7. **Header & Footer**:
   - `Logo.tsx`: Responsive mở rộng `h-12 md:h-14 lg:h-16 max-w-[210px]`, giữ nguyên contract sizing `width={180}`, `height={60}` và `data-logo-source="wingsgroup-brand-kit"`.
   - `wingsgroup-v3.css`: Nâng font header lên `0.9375rem`, `font-weight: 600`. Khắc phục lỗi CSS lọt cột giữa trang bằng bố cục responsive `:has(> :nth-child(2))` và `:has(> :nth-child(3))`.
   - `Footer/Component.tsx`: Thêm địa chỉ VP Du lịch Hà Nội (Ngọc Khánh Plaza) kèm `MapPinIcon`, link `tel:`, link `/chinh-sach-bao-mat`, CTA liên hệ 24/7.

## Data & Migration Strategy

- Không yêu cầu migration cơ sở dữ liệu PostgreSQL.
- Dữ liệu tĩnh và block content được xây dựng linh hoạt, tương thích ngược hoàn toàn với dữ liệu CMS Payload hiện có.
