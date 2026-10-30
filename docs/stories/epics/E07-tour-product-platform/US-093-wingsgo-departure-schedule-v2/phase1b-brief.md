# Brief cho agy — US-093 Phase 1B (helper dùng chung và tương thích lead)

Bạn là agent implement; Claude là orchestrator. Làm trong worktree `E:\repo\WingsTravel-us093`, nhánh `feat/us-093-departure-schedule-v2`. Không push, không deploy, không sync Plane, không đụng DB của repo chính hay production.

## Đọc trước

Trong thư mục story:

- `design.md`: các mục Bảng trạng thái, `canHoldSeat`, Giá và tiền tệ, Facet và bộ lọc, Hãng bay, Tên tour, D3, D6, D10;
- `execplan.md`: mục "Phase 1B";
- `phase0-baseline.md`: bảng 21 chuỗi hãng bay và danh sách tên tour dùng làm fixture;
- `phase1a-report.md` và `phase1a-fix-brief.md`: những lỗi orchestrator đã bắt ở 1A. **Không lặp lại các lỗi đó**: integration phải chạy trên Payload thật, unit test phải gọi code sản phẩm, kiểm tra phải fail closed.

## Việc cần làm

Làm đúng phần "Việc" của Phase 1B trong `execplan.md`. Các hàm thuần đặt trong `tours/wingsGoSchedule.ts`, riêng hai ngoại lệ sau đặt ở chỗ khác: `canHoldSeat` đặt ở `tours/utils.ts`, `normalizeScheduleAirline` đặt ở `tours/wingsGoDisplay.ts`.

1. `canHoldSeat(departure, now)` theo `design.md`. Thay biểu thức trong `DepartureStrip` (`StructuredPages.tsx` khoảng dòng 3512) bằng helper này. Snapshot dùng helper để điền `row.canHoldSeat`.
2. `deriveScheduleAvailability`: theo bảng 5 bước. Nếu 1A đã có hàm này thì kiểm lại cho đúng thứ tự các bước.
3. `normalizeScheduleAirline`: đủ 21 chuỗi trong `phase0-baseline.md`, cho ra 11 hãng. Chuỗi chỉ có dấu nháy trả `null`. Hãng lạ giữ chuỗi gốc đã trim, với key `raw:…`.
4. `parseScheduleFilters(searchParams, snapshotFacts)`: whitelist, bỏ giá trị lạ, mảng và tham số lặp, đặt giá trị mặc định. Snapshot điền `initialFilters`.
5. `filterScheduleRows` (AND), `countScheduleFacets` (bỏ chính facet đang đếm), `sortScheduleRows` (theo ngày; hoặc theo giá: VND, rồi USD, rồi không giá; bằng nhau thì xét ngày rồi id), `foldVietnameseText`.
6. `groupScheduleRowsByTour`: "Giá từ" chỉ xét đợt `canHoldSeat`. Ưu tiên VND, không có VND thì xét USD. Giữ `original`/promo của đúng đợt được chọn.
7. `getPriorityMarketDeparture`: thêm tham số `now` tuỳ chọn và dùng lịch VN khi có `now`. Caller cũ không truyền `now` thì giữ nguyên hành vi. Snapshot lọc trước các đợt `canHoldSeat` rồi mới điền `marketCards` (tối đa 3).
8. `getTourRouteTitle`:
   - giữ nguyên chữ hoa thường của mã thời lượng `5N4Đ`/`5N4D`;
   - chỉ coi là từ viết tắt khi nằm trong allowlist (thêm UNESCO và các mã hãng có trong bảng hãng bay);
   - không tách theo dấu `-` không có khoảng trắng;
   - test hiện có của `wingsGoDisplay.unit.spec.ts` phải vẫn pass. Nếu một kỳ vọng cũ cần đổi, ghi rõ lý do trong báo cáo.
9. Lead theo D6:
   - `getTourInquiryPath` nhận ngày VN;
   - `resolveDepartureLeadContext` trong `app/(payload)/api/lead-submissions/route.ts` chỉ chấp nhận ngày VN hoặc ngày UTC cũ, cả hai tính từ chính đợt đã resolve;
   - lead luôn lưu ngày VN;
   - fail closed khi không tính được ngày;
   - giữ nguyên mọi kiểm tra khác.
   - Snapshot điền `row.ctaHref` bằng ngày VN và `intent` theo `canHoldSeat`; `ctaLabel` lấy `ctaLabelOverride` nếu có.

## Test

- **Unit:** đúng danh sách "Test unit" của Phase 1B trong `execplan.md`. Mọi test phải gọi hàm sản phẩm, không tự viết lại logic trong file test.
- **Lead:** test lưu lead thật, chạy bằng `node scripts/run-integration-tests.mjs`, theo mẫu `tests/int/leadSubmissionRoute.int.spec.ts` hoặc `tests/int/leadCapture.int.spec.ts`. Đủ ma trận lead trong execplan: đợt `00:00Z` và `17:00Z`, ngày VN và ngày UTC cũ, thiếu ngày, thiếu `departureId`, ngày sai, sai tour/slug, khác site, đợt không tồn tại.
- Các test hiện có liên quan tới lead, departure và display phải pass.

## Cổng, commit, báo cáo

- Chạy `pnpm run lint`, `pnpm run test:unit` (chỉ được còn lỗi baseline `wingsGroupV3Shell`), `pnpm run test:component`, `pnpm exec tsc --noEmit` (chỉ được có 2 lỗi baseline), cùng integration của các file mới và các file lead hiện có.
- Không commit `payload-types.ts` hay các file `.snap` chỉ khác line-ending.
- Commit một lần với message `feat(wingsgo): US-093 phase 1B schedule helpers, CTA rule and VN lead date`, kèm hai dòng:

```
Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01LPBpFfhDsGd5w6zaiq2fq4
```

- Ghi `phase1b-report.md` gồm: file đã sửa, quyết định nhỏ đã tự đưa ra, output test thật, điểm còn mở.

Khi xong in `US093_PHASE1B_DONE`. Nếu bị chặn, in `US093_PHASE1B_BLOCKED` kèm lý do. Điều kiện dừng giống Phase 1A, và thêm một điều: nếu sửa lead API buộc phải đổi hợp đồng ngoài phạm vi D6 thì dừng.
