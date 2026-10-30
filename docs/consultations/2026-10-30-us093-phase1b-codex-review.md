# Codex review — US-093 Phase 1B và vòng sửa Phase 1

**VERDICT: GO có điều kiện.** Không thấy P1 mới trong phạm vi Phase 1. Phase 2 có thể tiếp tục với DTO hiện tại; cần xử lý hai P2 dưới đây trước khi nối browser Phase 3. Chưa coi đây là cổng đóng Story/phát hành.

Phạm vi: `git diff 512025e..HEAD -- app`, implementation `158e663` và fixes `349e9c5`. HEAD lúc kiểm tra là `34c5bc3` (chỉ thêm brief Phase 2; code commit không đổi). Đã đọc design, execplan, hai brief, report và review 1A. Các chỉnh sửa Phase 2 xuất hiện đồng thời trong working tree không thuộc kết luận này.

## 1. Findings

### 1. P2 — Helper cho browser còn kéo dependency server

`app/src/tours/wingsGoSchedule.ts:1`, `:4`, `:308`, `:348`: các helper filter/facet/sort/group nằm cùng module có import runtime `@payload-config`, `payload`, `siteContext`; `app/src/utilities/siteContext.ts:4` import `next/headers`. Theo design, client browser phải trực tiếp tính facet và lọc rows. Import runtime các helper từ module này sẽ kéo graph server vào client, chặn cách tích hợp Phase 3 đã định. Unit test mock Payload không kiểm được ranh giới bundle này.

**Sửa:** đưa các helper dùng trên client sang module thuần, chỉ `import type` DTO từ module hiện tại; có thể re-export helper ở module server để giữ caller cũ. Client import trực tiếp module thuần. Giữ nguyên shape DTO, cập nhật brief về vị trí helper và kiểm bằng Next production build khi nối browser. Đây là blocker tích hợp sắp tới, không phải kết luận build hiện tại đang hỏng.

### 2. P2 — Tìm kiếm thị trường không nhận nhãn người dùng nhìn thấy

`app/src/tours/wingsGoSchedule.ts:220`, `:336`, `:703`: `searchText` và fallback chỉ chứa enum thị trường (`japan`, `korea`...), thiếu nhãn locale. Trong khi `app/src/tours/wingsGoScheduleCopy.ts:91` hứa “Tìm tour, thị trường, hãng bay…”, tour “Osaka - Kyoto”, market `japan` không khớp truy vấn “Nhật Bản”/“nhat ban”. Tương tự nhãn “Thị trường khác” không khớp enum `other`.

**Bằng chứng:** chạy chính các hàm được trích bằng TypeScript AST, transpile và thực thi trong bộ nhớ: `searchText = "osaka - kyoto japan vietnam airlines"`; query `Nhật Bản` → **0** row, `Japan` → **1** row. Không ghi fixture mới hoặc viết lại thuật toán trong probe.

**Sửa:** khi dựng row, thêm nhãn thị trường theo locale (và giữ enum để tương thích); nhánh `other` dùng copy riêng. Thêm test tour không chứa tên nước: tìm bằng nhãn có dấu/không dấu, kiểm cả kết quả lẫn facet đang áp dụng `q`.

### 3. P3 — C4 chưa đủ bằng chứng cho nhánh CTA hết hạn/override inquiry

`app/tests/unit/wingsGoScheduleSnapshot.unit.spec.ts:339`: đã kiểm hold-seat, quote thiếu giá, sold-out và override trên đợt đang giữ chỗ được; chưa kiểm row có verification hết hạn, hoặc override trên row không được giữ chỗ. Test verification riêng không chứng minh kết quả CTA của `buildScheduleRow`.

**Sửa:** thêm fixture `expiresAt === now` có giá hợp lệ, assert `quote`, `price === null`, `canHoldSeat === false`, `intent=inquiry`; thêm quote/sold-out có `ctaLabelOverride`, assert chỉ nhãn đổi, intent vẫn inquiry. Logic hiện tại phù hợp; đây là phần test còn thiếu của C4, không phải lỗi commerce đã tái hiện.

## 2. Kết quả đối chiếu hợp đồng

- `canHoldSeat` đúng bốn điều kiện D3: verified nghiêm ngặt, không sold-out, ngày VN không quá khứ, giá hữu hạn dương thuộc tiền tệ được phép; input ngày không hợp lệ bị loại. `DepartureStrip` dùng helper chung. `deriveScheduleAvailability` đúng thứ tự năm bước; row dùng ngày VN, intent theo `canHoldSeat`, override không điều khiển intent.
- Airline: assertion độc lập đủ 21 chuỗi baseline, ra 11 hãng; quote/empty → null; mã chỉ nhận chữ hoa; tên không phân biệt hoa thường; hãng lạ/multiple-match giữ `raw:`. Title giữ duration/allowlist, không tách dấu nối không có khoảng trắng; test cũ vẫn pass.
- Parser có whitelist, loại array/giá trị ngoài facts; snapshot truyền facts đúng. Filter AND, facet bỏ chính chiều đang đếm, giá VND → USD → không giá, tie-break ID số và group chọn giá/promo của đúng row `canHoldSeat` đều phù hợp. Còn lỗi tìm nhãn thị trường ở finding 2.
- Selector giữ hành vi caller không truyền `now`; có `now` dùng ngày VN. Snapshot lọc `canHoldSeat` trước selector, thẻ tối đa ba, `other` dùng copy riêng. Không suy rằng selector tự loại sold-out: hợp đồng yêu cầu caller lọc trước.
- D6: module resolver riêng, route chỉ export POST/GET; ngày VN/UTC cũ đều tính từ departure đã resolve trên server, kiểm site/tour và lưu VN; sai ngày/quan hệ/missing record trả null. Giữ chính sách cho departure draft/unpublish và yêu cầu tour published đúng quyết định D6.
- Callers detail/dialog truyền timestamp đầy đủ sẽ được URL ngày VN; WingSide giữ đường dẫn liên hệ/site và các context không có ngày. Một số caller cũ cắt `.slice(0,10)` trước helper vẫn gửi ngày UTC cũ, được resolver chấp nhận. Link tương đối vẫn cần `SiteLink` để thêm locale/site theo pattern hiện có; không coi đó là lỗi mới của DTO.

## 3. Đóng findings trước

| Mục | Kết quả |
| --- | --- |
| C1 — other | Đóng: assertion VI/EN đúng copy schedule, không đổi bảng `/tour`. |
| C2 — verifiedDay | Đóng: tính verification độc lập với giá/availability; fixture quote và sold-out cùng chứng minh timestamp lớn nhất. |
| C3 — pagination | Đóng: DB thật đúng 260 ID fixture, unique, thứ tự đúng; spy chứng minh page 1 và 2. Overlap/dedupe vẫn do mock test riêng chứng minh, không gọi đó là DB overlap. |
| C4 — fail-closed/CTA | Invalid now/no site không query; VN day/hold/quote/sold-out/override đã kiểm. Còn hai assertion tại finding 3. |
| C5 — media URL | Đóng phạm vi đã giao: trim, normalize path Payload, whitespace/malformed bị loại, path/HTTPS hợp lệ được giữ. |
| B1–B5 | Module route, POST thật, mã hãng hoa/thường, allowlist và ID số đã sửa đúng; không thấy blocker cũ còn tồn tại. Build B1 có bằng chứng orchestrator, không phải build tự chạy trong vòng này. |

Test gọi implementation thật, không thấy assertion tự tính lại kết quả bằng cùng implementation. Tuy nhiên mock Payload ở unit không chứng minh bundle client; mock Redis/site context ở lead integration không chứng minh vận hành Redis/proxy thật. Hai test POST ngày VN/UTC đã đi qua handler thật và đọc `form-submissions` từ SQLite thật, khắc phục thiếu bằng chứng D6 của review 1A.

## 4. Kiểm chứng tự chạy ngày 30/10/2026, giờ +07

Trong `app/`, khoảng 20:13–20:18:

```text
pnpm run test:unit -- tests/unit/wingsGoScheduleHelpers.unit.spec.ts tests/unit/wingsGoScheduleSnapshot.unit.spec.ts tests/unit/wingsGoScheduleSnapshotMocked.unit.spec.ts tests/unit/wingsGoDisplay.unit.spec.ts tests/unit/tourPricing.unit.spec.ts
→ exit 0; 4 file thực sự khớp, 52/52 test pass.

pnpm run test:unit -- tests/unit/wingsGoPriorityMarketDeparture.unit.spec.ts
→ exit 0; 3/3 pass.

pnpm run test:unit -- tests/unit/lowestPrice.unit.spec.ts
→ exit 0; 5/5 pass. Tổng unit: 60/60.

node scripts/run-integration-tests.mjs tests/int/wingsGoLeadCompatibility.int.spec.ts tests/int/leadSubmissionRoute.int.spec.ts tests/int/leadCapture.int.spec.ts tests/int/wingsGoScheduleIntegration.int.spec.ts
→ exit 0; lần lượt 9/9, 21/21, 3/3, 5/5; tổng 38/38.

pnpm run test:component -- tests/component/retailTourConsultationDialog.component.spec.tsx tests/component/retailTourDecisionHeader.component.spec.tsx tests/component/structuredWingsSideTourDetail.component.spec.tsx tests/component/highImpactRetailDeparturesSnapshot.component.spec.tsx
→ exit 0; 4 files, 30/30 pass.

pnpm exec tsc --noEmit --incremental false
→ exit 1; đúng hai lỗi baseline wingsGroupCorporateRoutes.unit.spec.ts:
  (116,21) TS2353: property 'type' không thuộc { richText?: unknown; }.
  (155,9) TS2322: locale "lo" không thuộc union locale được hỗ trợ.

git diff --check 512025e..HEAD -- app
→ exit 0.
```

Integration chạy qua runner chuẩn, SQLite tạm và secret test do runner cấp; không còn blocker “missing secret” do dùng sai lệnh ở review 1A. Có cảnh báo SQLite experimental/email adapter, không có test failure. Runner/component test sinh lại `payload-types.ts` và line ending snapshot; đã khôi phục đúng các artifact do lượt kiểm này sinh ra. Không chỉnh code triển khai, không commit.

Chưa tự chạy lại full lint/full suites/production build hay browser E2E. Build exit 0 trong report và `.next/BUILD_ID` lúc 20:01:13 là bằng chứng orchestrator; không thay cho build mới sau khi nối client. Chưa kiểm PostgreSQL, Redis/proxy thật hoặc ARM64/VPS. Chưa có bằng chứng hồi quy trên các cổng đã chạy; còn rủi ro Phase 3 và khoảng trống test nêu trên.

US093_1B_REVIEW_DONE
