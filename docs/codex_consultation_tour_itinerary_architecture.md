# Codex Architectural Checkpoint — Tour Itinerary Editorial & Formatting

- **Ngày:** 2026-10-15
- **Phạm vi:** `app/src/collections/TourProducts.ts`, `app/src/tours/StructuredPages.tsx`, renderer itinerary, Lexical configuration/renderer hiện có, hooks revalidation TourProduct/TourDeparture, và các script import/export được tìm thấy.
- **Quyết định kiến trúc:** tách hotfix hiển thị xuống dòng khỏi nâng cấp Rich Text. Hotfix thuộc US-077/TASK-13; Rich Text là Story mới US-080 trong Epic E07. Không đổi schema hiện tại trong hotfix.

## Kết luận điều hành

Nên đưa xử lý `whitespace-pre-line` vào US-077 ngay. Đây là thay đổi nhỏ, không đổi database, cứu ngay 51 tour WingsGo và 22 tour WingSide đang lưu chuỗi plain text, và có thể rollback độc lập.

Không nên mở rộng US-075 chỉ để chứa Rich Text itinerary. US-075 nên tiếp tục giữ vai trò tour authoring/preview integrity; Rich Text thay đổi schema, editor contract, renderer, import/export và dữ liệu nên được theo dõi bằng US-080 riêng. US-080 có thể phụ thuộc vào US-075 ở các kiểm tra publish/preview dùng chung.

## 1. Phân định scope và rollout

### US-077 — hotfix hiển thị

Áp dụng cho cả hai nhánh render itinerary trong `StructuredPages.tsx`:

- giữ `summary` là string;
- thêm class `whitespace-pre-line` vào vùng nội dung chi tiết;
- giữ teaser ở dạng rút gọn, không cố biến `\n\n` thành HTML;
- kiểm tra desktop/mobile và cả WingsGo/WingSide.

Không cần migration, không cần backfill, không đổi API. Đây là cách ít rủi ro nhất để sửa lỗi hiện tại.

### US-080 — Rich Text Itinerary & Editorial Formatting

Story mới nên bao gồm:

- field Rich Text mới trong mỗi `itineraryDays`;
- renderer Lexical an toàn;
- fallback về `summary` cũ;
- generated Payload types;
- migration/backfill tùy chọn;
- preview/publish, localized content và acceptance tests;
- cập nhật import/export contract;
- revalidation sau khi nội dung itinerary đổi.

US-075 chỉ nhận các thay đổi dùng chung như validator publish/preview hoặc test harness. Không đưa schema Rich Text vào US-075 vì sẽ làm mờ ownership và khó đo rủi ro.

## 2. So sánh phương án schema

| Phương án | Migration safety | Backward compatibility | Admin UX | Đánh giá |
|---|---|---|---|---|
| P1 — đổi trực tiếp `summary` sang `richText` | Thấp. String hiện tại không phải Lexical state; localized array lồng nhau làm migration phức tạp. | Thấp. Consumer, export và API đang kỳ vọng string. | Một field dễ hiểu sau migration, nhưng dữ liệu cũ phải chuyển đổi trước. | Không chọn cho release đầu. |
| P2 — thêm field Rich Text | Cao. Không phá cột/string hiện tại; có thể rollout theo từng tour/site. | Cao. Fallback rõ ràng về `summary`. | Editor thấy teaser và nội dung đầy đủ; cần mô tả rõ field nào là nguồn chính. | **Khuyến nghị.** |
| P3 — một tên field nhận string hoặc Lexical object | Trung bình đến thấp. Mọi consumer phải xử lý union runtime; generated types yếu. | Có vẻ cao nhưng lỗi thường chỉ xuất hiện lúc render/import. | Admin khó hiểu, cùng field có hai wire shape. | Không chọn. |

### Schema khuyến nghị

Giữ nguyên:

```ts
{
  name: ''summary'',
  localized: true,
  required: true,
  type: ''textarea'',
}
```

Thêm field không bắt buộc:

```ts
{
  name: ''content'',
  label: ''Nội dung chi tiết trong ngày'',
  localized: true,
  type: ''richText'',
  editor: lexicalEditor({
    features: [
      ParagraphFeature(),
      BoldFeature(),
      ItalicFeature(),
      ListFeature(),
      LinkFeature(),
    ],
  }),
}
```

Tên `content` ngắn và nhất quán với các collection hiện có. Nếu business muốn tên rõ hơn trong API, dùng `itineraryContent`; không nên duy trì cả hai tên.

Resolver:

1. Nếu `content` có Lexical state hợp lệ, render bằng component `RichText`.
2. Nếu `content` rỗng hoặc không có, render `summary` với `whitespace-pre-line`.
3. Không nhận object tùy ý hoặc HTML raw từ request.
4. Không xóa `summary` trong giai đoạn đầu; nó tiếp tục làm teaser, fallback và nguồn export plain text.

Không cần chuyển đổi ngay 73 record hiện hữu. Có thể thêm script backfill riêng sau khi renderer đã ổn định; script phải idempotent, có dry-run, checksum/count trước-sau và không ghi đè nội dung editor mới.

## 3. Lexical toolbar tối thiểu

Nên bật:

- Paragraph;
- Bold;
- Italic;
- Bullet list;
- Numbered list;
- Link;
- tùy chọn Underline nếu đội nội dung thực sự dùng.

Không nên bật trong mảng ngày:

- Blocks;
- Upload/Media;
- Code;
- Horizontal rule;
- Heading nhiều cấp;
- table hoặc custom embeds.

Mỗi ngày đã có `title`, nên Heading trong summary tạo cấu trúc lặp và làm editor panel nặng hơn. Link nên dùng field mặc định có validation URL và renderer `RichText` hiện có. Không thêm toolbar riêng nếu `defaultLexical` hoặc helper tương đương đã đáp ứng; nhưng không dùng cấu hình Posts nguyên xi vì Posts bật Blocks, Heading và các tính năng không cần cho itinerary.

## 4. Rủi ro dữ liệu và tương thích

### P1 — đổi type trực tiếp làm hỏng dữ liệu nếu không có staged migration

Payload Lexical lưu state object, trong khi 73 tour hiện là string. Đổi type in-place có thể làm migration generated không đọc được string, làm admin form lỗi hoặc renderer nhận shape không hợp lệ. Đây là release blocker nếu chọn P1.

### P2 — localized data

`summary` và field mới đều localized. Migration/backfill phải xử lý từng locale thực tế, không biến object locale này thành fallback cho locale khác. Public renderer phải giữ behavior fallback locale hiện có của Payload.

### P2 — API/export shape

Các script hoặc snapshot đọc `summary` như string sẽ hỏng nếu đổi field in-place. Với P2, giữ summary giúp export cũ chạy tiếp; export mới nên chọn rõ:

- `summary`: plain text;
- `content`: Lexical JSON hoặc text đã flatten, theo version của export contract.

Không serialize Lexical JSON vào CSV/Google Sheets mà không có version/schema marker.

### P2 — render an toàn

Chỉ đưa Lexical state vào `@payloadcms/richtext-lexical/react` qua component `RichText` hiện có. Không dùng `dangerouslySetInnerHTML`, không nhận HTML tùy ý và không bypass link converter hiện tại.

## 5. Cache, ISR và multisite

Hiện các hook TourProduct và TourDeparture đã revalidate các base route, trang tour, market/campaign và locale public. Khi thêm `itineraryContent`, thay đổi TourProduct phải tiếp tục đi qua hook `revalidateTourProduct`; không tạo đường ghi riêng bỏ qua hook.

Checkpoint cần xác nhận:

- sửa itinerary của WingsGo chỉ revalidate route WingsGo cần thiết;
- sửa itinerary của WingSide không làm invalidation nhầm surface WingsGo;
- localized paths của cả site được revalidate;
- nếu có Redis cache cho tour detail, key phải chứa site, tour ID/slug và locale;
- invalidation phải chạy cho `summary` và `content` cùng lúc;
- lỗi Redis không được làm mất bản ghi CMS; phải có metric/log và TTL giới hạn stale data;
- nếu dùng page cache/ISR theo tag trong tương lai, thêm tag tour/site thay vì chỉ path enumeration.

Không thấy trong phần mã đã rà soát một pipeline Google Docs/Sheets chuyên biệt cho itinerary. Vì vậy US-080 phải coi import/export là boundary: plaintext importer chỉ điền `summary`, còn Rich Text importer cần schema version và validator riêng.

## 6. Acceptance criteria cho US-080

- Tour cũ chỉ có `summary` vẫn hiển thị nguyên xuống dòng.
- Tour có `content` hiển thị paragraph, bold, italic, bullet/numbered list và link.
- `content` rỗng fallback đúng về `summary`.
- Payload không render draft/private content ở public route.
- WingsGo và WingSide không đọc chéo tour khác site.
- Mỗi locale có thể có content riêng và fallback đúng.
- Preview và published output giống nhau về cấu trúc.
- Import/export cũ không mất `summary`.
- Revalidation cập nhật tour detail sau khi save.
- Có test cho string cũ, Lexical state, null, malformed state, locale fallback và XSS/link behavior.

## 7. Checkpoint quyết định

1. **Chấp thuận ngay:** US-077 thêm `whitespace-pre-line` cho hai renderer.
2. **Tạo US-080:** P2 additive field, fallback dual-read, không migration destructive.
3. **Không chọn:** P1 in-place và P3 polymorphic field.
4. **Trước khi merge US-080:** chốt wire contract import/export, locale policy, toolbar feature list và test matrix.
5. **Trước release:** chạy unit/typecheck, render preview/public, multisite matrix, migration rehearsal PostgreSQL và cache/revalidation smoke.

**Khuyến nghị cuối:** Ship hotfix US-077 trước để sửa lỗi hiển thị hiện tại; phát triển Rich Text như US-080 độc lập với schema additive. Đây là phương án giữ nguyên dữ liệu production, giảm blast radius và cho phép rollback bằng cách ngừng đọc field mới.


