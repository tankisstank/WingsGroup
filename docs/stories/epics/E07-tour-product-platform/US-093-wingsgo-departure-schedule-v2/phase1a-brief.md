# Brief cho agy — US-093 Phase 1A (query, scope, locale, DTO, thời gian)

Bạn là agent implement. Claude là orchestrator: Claude review diff của bạn, chạy cổng kiểm tra và gọi Codex review. Chỉ làm đúng phạm vi Phase 1A.

## Môi trường

- Worktree: `E:\repo\WingsTravel-us093`, nhánh `feat/us-093-departure-schedule-v2`. Không làm ở `E:\repo\WingsTravel`.
- Trong `app/` đã có `node_modules`, `.env` và `payload-tourplatform.db` (bản copy chỉ dùng local). Không đụng DB của repo chính hay production.
- Không push, không deploy, không sync Plane.

## Đọc trước

Trong `docs/stories/epics/E07-tour-product-platform/US-093-wingsgo-departure-schedule-v2/`:

- `design.md`: mục Ràng buộc, Snapshot, DTO cho client, Giá và tiền tệ, Số liệu hero, quyết định D1, D2, D5, D11;
- `execplan.md`: mục "Phase 1A";
- `phase0-baseline.md`: dữ liệu thật và kết quả test baseline.

Đọc thêm `docs/consultations/2026-10-30-us093-departure-schedule-v2-planning.md`, mục 1, 2, 4 và R1, R3, R4, R5.

## Việc cần làm

Làm đúng danh sách "Việc" và "Test" của Phase 1A trong `execplan.md`. Tóm tắt:

1. `queryCollection` nhận thêm `populate`, `select`, `sort`, `page` và `pagination`. Caller cũ giữ nguyên hành vi.
2. `normalizeDepartureCard(departure, draft, now?)` truyền `now` vào bước kiểm verification.
3. `normalizeTourProductCard(tour, locale?)` trả `editorialBadges`/`hasHot`. Sửa `.map(normalizeTourProductCard)` ở `queries.ts:214`.
4. Tạo `app/src/tours/wingsGoSchedule.ts` với các type trong `design.md` và hàm `getWingsGoScheduleSnapshot`. Trong phase này `marketCards` là `[]`, còn `initialFilters` là giá trị mặc định.
5. Tạo `app/src/tours/wingsGoScheduleCopy.ts` (VI/EN) theo mẫu `wingsGoCatalogCopy.ts`, đủ nhãn cho trạng thái và thị trường (`other` = "Thị trường khác" / "Other destinations").
6. Sửa `getLowestPrice` để chỉ nhận số hữu hạn và > 0.
7. **Không** đổi `getResolvedScheduleData` (trừ hiệu ứng của mục 6), `TourSchedulePage` hay giao diện. Phase 1A chưa có UI.

## Test bắt buộc

- Unit test mới đặt trong `app/tests/unit/`, ví dụ `wingsGoScheduleSnapshot.unit.spec.ts` và `lowestPrice.unit.spec.ts`.
- Integration test đặt trong `app/tests/int/` theo mẫu các file `*.int.spec.ts` hiện có, đủ các ca trong execplan (hơn 200 đợt qua ít nhất hai trang, populate, scope site, media không có `_status`, D11, trang chủ với fixture rỗng/chỉ quá khứ/có tương lai).
- Các test hiện có phải pass: `wingsGoPriorityMarketDeparture`, `wingsGoDisplay`, `promotionPrice`, `editorialBadges`, `retailTourDepartureSync`, `tourPublicProjection`.

## Cổng trước khi báo xong

Chạy trong `app/` và chép output thật (dòng tổng kết) vào báo cáo:

- `pnpm run lint`
- `pnpm run test:unit`: chỉ được phép còn lỗi baseline `wingsGroupV3Shell`.
- `pnpm run test:component`
- `pnpm run test:int`, hoặc ít nhất các file integration mới và file liên quan nếu suite đầy đủ quá lâu; ghi rõ đã chạy gì.
- `pnpm exec tsc --noEmit`: ghi số lỗi trước và sau.

Trước khi commit:

- `git status` và `git diff --stat`. **Không** commit file chỉ đổi line-ending (snapshot `.snap`, `payload-types.ts`). Hoàn tác các file đó bằng `git checkout -- <file>`.
- Commit một lần với message `feat(wingsgo): US-093 phase 1A schedule snapshot, DTO and time handling`, kèm hai dòng:

```
Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01LPBpFfhDsGd5w6zaiq2fq4
```

## Báo cáo

Ghi `phase1a-report.md` trong thư mục story, theo mẫu `US-092-wingsgo-tour-catalog-v2/phase1-report.md`, gồm:

- file đã sửa;
- quyết định nhỏ đã tự đưa ra;
- output test thật;
- những điểm còn mở hoặc lệch so với `design.md`.

Khi xong in đúng dòng: `US093_PHASE1A_DONE`

## Điều kiện dừng

Dừng, ghi lý do vào báo cáo và in `US093_PHASE1A_BLOCKED` nếu gặp một trong các trường hợp:

- cần schema hoặc migration;
- hợp đồng DTO trong `design.md` không làm được như mô tả;
- test baseline khác với `phase0-baseline.md`;
- phải sửa file ngoài danh sách của Phase 1A.
