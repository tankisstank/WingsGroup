# US-080 — Nâng cấp Rich Text đa định dạng cho Lịch trình Tour (Rich Itinerary Editorial Experience)

## 1. Trạng thái (Status)

`completed`

## 2. Phân làn (Lane)

`high-risk` *(Do can thiệp schema lõi TourProducts, migration PostgreSQL/SQLite và ảnh hưởng hai site WingsGo/WingSide)*

## 3. Hợp đồng Sản phẩm (Product Contract)

Cung cấp cho Biên tập viên (Editor / Tour Operator) khả năng định dạng phong phú (Rich Text) cho từng ngày trong khối Lịch trình Tour (`itineraryDays`) của `TourProducts`, thay vì bị giới hạn trong ô văn bản thô `textarea`. 

Hệ thống phải đảm bảo:
1. **Trải nghiệm soạn thảo đa định dạng (Rich Text Editorial):** Editor có thể in đậm (bold) các mốc thời gian (ví dụ: **08h20**, **12h00**), in nghiêng (italic), gạch chân (underline), tạo danh sách gạch đầu dòng (`UnorderedListFeature`), danh sách đánh số (`OrderedListFeature`), và chèn liên kết an toàn (`LinkFeature`) trong từng ngày lịch trình.
2. **Cấu hình Lexical tinh gọn (Lightweight Lexical Toolbar):** Nhúng bộ soạn thảo Lexical tinh gọn trong mảng ngày `itineraryDays`. Tuyệt đối không bật các khối nặng (`Blocks`, `Upload/Media`, `Code`, `Table`, `Headings` lặp) để đảm bảo tốc độ và giao diện thanh thoát trong form Admin của Payload CMS 3.
3. **An toàn Kiến trúc & Tương thích ngược tuyệt đối (P2 Additive Schema & Dual-Read Fallback):**
   - Tuân thủ khuyến nghị từ **Codex Consultation Gate** ([`docs/codex_consultation_tour_itinerary_architecture.md`](file:///E:/repo/WingsTravel/docs/codex_consultation_tour_itinerary_architecture.md) & [`docs/codex_consultation_us080_execution_plan_review.md`](file:///E:/repo/WingsTravel/docs/codex_consultation_us080_execution_plan_review.md)): 
     - **Pha 1:** Giữ nguyên trường `summary: textarea` (`required: true`) làm teaser đảm bảo tính hợp lệ theo từng locale, nguồn export plain text và fallback 100%.
     - Bổ sung trường mới `content: richText` (Additive Schema, `required: false`) kiểu `richText` (Lexical) có `localized: true`.
     - Frontend ưu tiên render `content` qua component [`<RichText />`](file:///E:/repo/WingsTravel/app/src/components/RichText/index.tsx). Nếu `content` chưa có hoặc rỗng (đối với 51 tour WingsGo và 22 tour WingSide hiện hữu), tự động fallback hiển thị `summary` với `whitespace-pre-line`.
4. **Bảo toàn dữ liệu qua mọi Mapper & Consumer:**
   - Bảo toàn trường `content` qua hàm merge của biến thể khởi hành (`queries.ts` variant overrides).
   - Bảo toàn qua pipeline lọc và chuẩn hóa của WingSide view model (`wingsSideTourViewModel.ts`).
5. **Cô lập Đa site & Revalidation:**
   - Dùng chung cho cả WingsGo và WingSide nhưng tuân thủ nghiêm ngặt tính cô lập dữ liệu theo `siteField`.
   - Tự động kích hoạt hook `revalidateTourProduct` revalidate Next.js paths đúng site, đúng slug tour và đúng locale khi lưu thay đổi.

---

## 4. Hành vi Hiện tại (Current Behavior)

- Trường mô tả ngày trong `itineraryDays` là `summary` (`type: 'textarea'`). Editor không thể định dạng in đậm, gạch đầu dòng hay liên kết.
- Các tour hiện hữu chỉ có text thô (đã được hotfix CSS `whitespace-pre-line` để giữ ngắt dòng).

---

## 5. Hành vi Đích (Target Behavior)

- Trong Admin CMS: Khi mở chi tiết từng ngày của `TourProducts`, Editor nhìn thấy ô soạn thảo trực quan **"Nội dung chi tiết trong ngày" (`content`)** hỗ trợ toolbar: Đoạn văn (Paragraph), Đậm (Bold), Nghiêng (Italic), Gạch chân (Underline), Danh sách (Bullet & Numbered List), Liên kết (Link).
- Ngoài website (cả WingsGo và WingSide): Khối Itinerary Accordion render mốc thời gian nổi bật, danh sách điểm tham quan dạng gạch đầu dòng chuẩn UX thương mại du lịch.
- Dữ liệu cũ không bị lỗi hay mất mát; không yêu cầu migration xóa cột hoặc chuyển đổi dữ liệu cưỡng bức.

---

## 6. Người dùng Thụ hưởng (Affected Users)

- **Tour Operator / Editor:** Dễ dàng trình bày chương trình tour chuyên nghiệp, nổi bật các điểm nhấn và thời gian biểu.
- **Khách hàng truy cập:** Đọc lịch trình rõ ràng, mạch lạc, dễ nắm bắt thông tin chuyến đi.

---

## 7. Tài liệu & Căn cứ Kỹ thuật Liên quan

- `docs/codex_consultation_tour_itinerary_architecture.md` (Biên bản tham vấn kiến trúc Codex)
- `docs/codex_consultation_us080_execution_plan_review.md` (Biên bản review Execution Plan Codex)
- `docs/stories/epics/E07-tour-product-platform/US-023-tour-product-model.md`
- `docs/stories/epics/E07-tour-product-platform/US-024-tour-detail-builder.md`
- `docs/stories/epics/E07-tour-product-platform/US-077-wingsgo-ux-and-conversion/overview.md`
- `app/src/collections/TourProducts.ts`
- `app/src/tours/StructuredPages.tsx`
- `app/src/tours/queries.ts`
- `app/src/tours/wingsSideTourViewModel.ts`
- `app/src/components/RichText/index.tsx`
