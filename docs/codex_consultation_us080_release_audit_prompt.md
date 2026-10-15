# THAM VẤN CODEX: RÀ SOÁT PHÁT HÀNH & PRE-DEPLOYMENT AUDIT CHO US-080

**Dự án:** WingsTravel (WingsGo & WingSide Multisite Platform)  
**Story:** `US-080: Rich Text Itinerary & Editorial Formatting`  
**Vòng thẩm định:** Release Review & Pre-deployment Audit (Giai đoạn Triển khai hoàn tất)  
**Thời điểm:** 2026-10-15  

---

### Bối cảnh & Mục tiêu

Editor gặp vấn đề: nội dung lịch trình ngày của tour bị dồn thành một đoạn duy nhất, mất các định dạng xuống dòng, gạch đầu dòng, mốc giờ in đậm.
Sau phiên phản biện kiến trúc và phê duyệt Kế hoạch triển khai (ExecPlan) từ Codex Reviewer, chúng tôi đã hoàn tất triển khai code theo giải pháp **Additive Schema (P2) + Dual-Read Resolver**, đồng thời hoàn thành toàn bộ các điều kiện tiên quyết (APPROVE WITH CONDITIONS).

Kính đề nghị Codex Agent thực hiện **Pre-deployment Audit** toàn diện trước khi phát hành lên Staging / Production VPS (Oracle Cloud ARM64).

---

### Tổng hợp Thay đổi Triển khai (Code Diff & Architecture)

1. **Payload Schema (`app/src/collections/TourProducts.ts`):**
   - Giữ nguyên `summary: textarea` (`required: true`, `localized: true`) làm canonical plaintext & teaser summary.
   - Bổ sung trường mới `content: richText` (`required: false`, `localized: true`) trong mảng `itineraryDays`.
   - Lexical feature set tinh gọn: `ParagraphFeature`, `BoldFeature`, `ItalicFeature`, `UnderlineFeature`, `UnorderedListFeature`, `OrderedListFeature`, `LinkFeature`.
   - **Bảo mật Link cấp CMS:** Thiết lập custom validation cho trường `url` trong `LinkFeature`, chủ động chặn triệt để giao thức nguy hiểm `^javascript:`.

2. **Frontend Component & Dual-Read (`app/src/tours/StructuredPages.tsx`):**
   - **Hotfix CSS:** Bổ sung `whitespace-pre-line` cho toàn bộ các khối render fallback của `day.summary`.
   - **Dual-Read Resolver (`renderItineraryDayContent`):**
     - Kiểm tra nếu `day.content` tồn tại và không rỗng (qua helper fail-safe `isRichTextEmpty`), render `<RichText data={day.content} />`.
     - Nếu `day.content` rỗng/null, fallback an toàn sang `<p className="whitespace-pre-line">{day.summary}</p>`.
   - **Accordion Teaser (`getItineraryDayTeaser`):**
     - Ưu tiên lấy từ `day.summary`.
     - Chỉ khi `day.summary` rỗng mới fallback trích xuất tối đa 160 ký tự plaintext từ node Lexical AST.
   - **Bảo vệ chống crash:** Helper `isRichTextEmpty` duyệt đệ quy có kiểm tra kiểu dữ liệu chặt chẽ (`typeof node === 'object'`), an toàn tuyệt đối với mọi dạng AST rỗng hoặc dị dạng.

3. **Client-side Link Sanitizer (`app/src/components/RichText/index.tsx`):**
   - Bổ sung helper `sanitizeHref(href)`: Kiểm tra `^javascript:/i`, nếu phát hiện lập tức thay thế bằng `#` để ngăn chặn XSS ở cả cấp độ render component.

4. **ViewModel WingSide (`app/src/tours/wingsSideTourViewModel.ts`):**
   - Bổ sung mapping bảo toàn trường `content`: `content: day.content ?? null`.
   - Cập nhật điều kiện lọc ngày hợp lệ: `day.title || day.summary || day.content || day.route`.

5. **Bộ gõ & Sinh kiểu:**
   - Chạy `pnpm --dir app generate:types` đồng bộ thành công `app/src/payload-types.ts`.
   - `pnpm --dir app exec tsc --noEmit` hoàn thành với **0 errors**.

---

### Bằng chứng Kiểm thử (Verification Evidence)

1. **Unit Test (`app/tests/unit/tourItineraryRichText.unit.spec.ts`):**
   - PASS 5/5 tests:
     1. Khẳng định schema `content: richText` nullable và `summary: textarea` required trong `TourProducts.itineraryDays`.
     2. Khẳng định `buildWingSideTourViewModel` ánh xạ và bảo toàn nguyên vẹn `content`.
     3. Khẳng định logic merge biến thể (variant overrides) giữ nguyên `content`.
     4. Khẳng định helper trích xuất text xử lý fail-safe khi AST rỗng/malformed.
     5. Khẳng định `sanitizeHref` chặn tất cả URL `javascript:` (`javascript:alert(1)`, `JAVASCRIPT:attack()`, v.v.).
2. **Component Tests:**
   - `retailTourItineraryAndServices.component.spec.tsx`: 6/6 tests PASS.
   - `wingsSideTourDetail.component.spec.tsx`: 3/3 tests PASS.
3. **Database & Migration Safety:**
   - Additive schema P2: Không đổi kiểu cột cũ, không DROP cột, không phá vỡ schema SQLite cục bộ lẫn PostgreSQL production. 73 tour hiện hữu (51 WingsGo, 22 WingSide) hoạt động trơn tru 100%.

---

### Câu hỏi Phản biện & Audit dành cho Codex:

1. **Bảo mật (Security & XSS):** Bộ đôi `LinkFeature URL validation` (CMS) + `sanitizeHref` (RichText Component) đã đủ chặt chẽ để phòng chống injection hay có edge case nào (ví dụ data URI `data:text/html`, vbscript, encoded HTML entities) cần lưu ý thêm?
2. **Hiệu năng & Bundle Size:** Việc nạp Lexical `<RichText />` trên trang chi tiết tour có ảnh hưởng đáng kể đến hydration performance hoặc LCP không?
3. **Multisite & Data Consistency:** Luồng bảo toàn `content` trên cả WingsGo và WingSide có rủi ro nào về cache invalidation (Next.js ISR) hay stale reads giữa hai site không?
4. **Đánh giá tổng kết (Verdict):** Codex có chấp thuận (APPROVE / REJECT / CONDITIONAL APPROVE) để đóng Story US-080 và sẵn sàng đưa vào release package không?
