# Brief sửa Phase 1A — kết quả review của orchestrator (2026-10-30)

Commit `d53074f` **chưa được chấp nhận**. Hãy sửa đủ các mục dưới đây trong một commit mới. Không amend commit cũ.

## F1 (P1) — Integration test chưa dùng Payload thật

`tests/int/wingsGoScheduleIntegration.int.spec.ts` đang mock `payload`, `@payload-config` và `siteContext`, nên thực chất là unit test. Execplan yêu cầu chạy integration trên Payload thật.

- Viết lại theo mẫu dùng Payload thật, ví dụ `tests/int/mediaAccess.int.spec.ts` hoặc `tests/int/leadCapture.int.spec.ts`. Chạy bằng `node scripts/run-integration-tests.mjs <file>`; script này tự tạo SQLite tạm.
- Tạo fixture thật qua `payload.create`: 2 site, các tour product, media và departure. Sau đó gọi `getWingsGoScheduleSnapshot` trong ngữ cảnh site WingsGo.
- Bắt buộc có các ca:
  - hơn 200 đợt đọc qua ít nhất hai trang, đúng thứ tự, không trùng, không bị cắt;
  - populate thật lấy được `editorialBadges`, `site` và `_status` của product (đây chính là bẫy `defaultPopulate`);
  - product draft hoặc thuộc site khác bị loại;
  - media thuộc site khác thành `null`;
  - media hợp lệ (không có `_status`) vẫn được giữ;
  - relation đã bị xoá không làm lỗi;
  - D11: tour EN chưa dịch hiện nội dung VI, còn badge vẫn lấy từ bản EN strict;
  - trang chủ WingsGo dùng `getResolvedScheduleData` cho output không đổi với dữ liệu rỗng, chỉ có quá khứ, và có tương lai.
- Có thể giữ file mock hiện tại làm unit test, nhưng phải đổi tên thành `tests/unit/wingsGoScheduleSnapshotMocked.unit.spec.ts`.

## F2 (P2) — Unit test thống kê đang tự kiểm chính nó

Các test trong `wingsGoScheduleSnapshot.unit.spec.ts`, mục "Snapshot Stats logic", chỉ sort mảng ngay trong test, không gọi code sản phẩm.

- Tách các hàm thuần ra khỏi `getWingsGoScheduleSnapshot` và export chúng:
  - `computeScheduleStats(rows, tours)`;
  - `buildScheduleMonths(rows)`, trả mọi tháng từ đợt đầu tới đợt cuối, kể cả tháng trống;
  - hàm dựng một row từ departure thô đã normalize (ví dụ `buildScheduleRow`).
- Test gọi trực tiếp các hàm này:
  - `nearestDay` là ngày sớm nhất, không phải đợt rẻ nhất;
  - `yearRange`;
  - `sharedDepartureCity`;
  - `openCount` = `open + limited`;
  - `pricedCount`;
  - `verifiedDay` lấy từ `verifiedAt` lớn nhất của đợt đang xác minh;
  - tháng trống nằm giữa hai tháng có đợt.

## F3 (P2) — Kiểm tra site và trạng thái đang để lọt

Trong `wingsGoSchedule.ts` (khoảng dòng 392–396), product **thiếu** `site` hoặc **thiếu** `_status` vẫn được nhận. Phải fail closed:

- Product không có site, hoặc site khác site hiện tại, thì loại.
- Ở chế độ không phải draft, product phải có `_status === 'published'`.
- Media không có site thì loại, nghĩa là `media` thành `null`. Chỉ nhận media khi site khớp với site hiện tại.

Có test cho từng trường hợp.

## F4 (P2) — Query fallback VI của D11 không scope theo site

`payload.find` cho `tour-products` ở locale `vi` (khoảng dòng 357–366) chỉ lọc theo `id`. Phải thêm:

- điều kiện cùng site (`site: { equals: siteId }`, hoặc đi qua `appendSiteWhere`);
- `_status: published`.

## F5 (P2) — Locale chưa được truyền tới `normalizeTourProductCard`

Mọi nơi gọi trong `queries.ts` đều không truyền `locale`, nên ở trang EN badge sẽ normalize theo mặc định.

- Thêm tham số `locale` vào `normalizeDepartureCard` và truyền tiếp xuống `normalizeTourProductCard`.
- Truyền `locale` từ các caller đã có biến locale: schedule, market, detail, campaign, related fallback.
- Caller không có locale giữ nguyên hành vi cũ.
- Thêm một unit test chứng minh trang EN không lọt nhãn badge VI.

## F6 (P3) — Dọn dẹp

- Xoá dòng trống thừa sau `queryCollection` trong `queries.ts`.
- Không đưa `payload-types.ts` và các file `.snap` chỉ khác line-ending vào commit.

## Cổng và báo cáo

- Chạy lại `pnpm run lint`, `pnpm run test:unit`, `pnpm run test:component`, `pnpm exec tsc --noEmit`.
- Chạy integration bằng `node scripts/run-integration-tests.mjs tests/int/wingsGoScheduleIntegration.int.spec.ts`.
- Chép dòng tổng kết thật của từng lệnh vào mục "Vòng sửa F1–F6" trong `phase1a-report.md`.
- Commit với message `fix(wingsgo): US-093 phase 1A review fixes (real Payload integration, fail-closed scope, locale)`, kèm hai dòng:

```
Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01LPBpFfhDsGd5w6zaiq2fq4
```

Khi xong in `US093_PHASE1A_FIX_DONE`. Nếu bị chặn, in `US093_PHASE1A_FIX_BLOCKED` kèm lý do.
