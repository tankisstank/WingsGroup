# Brief sửa Phase 3–4 — Codex review Phase 2–3 và orchestrator review Phase 4 (2026-10-31)

Nguồn: `docs/consultations/2026-10-30-us093-phase3-codex-review.md` (GO có điều kiện, 5 P2 + 5 P3) và mục "Phase 4 — Review của orchestrator" trong `validation.md`. Codex review tại `e018547`; một số dòng có thể đã dịch sau Phase 4 (`6692f8c`), hãy tìm theo nội dung. Sửa tất cả trong **một commit mới**, không amend. Ảnh chỉ lưu trong thư mục story `artifacts/`.

Ranh giới module giữ nguyên: client chỉ import runtime từ `wingsGoScheduleModel.ts`, client không tính lại ngày/`canHoldSeat`/giá.

## P2

- **R1 — Giá USD trên thẻ thị trường.** `WingsGoScheduleMarketCards.tsx` gọi `formatShortTourPrice(value, locale)` bỏ currency nên USD thành "VND 1,200". VND giữ formatter ngắn; USD dùng formatter có currency (`formatTourPrice`/`PromotionPrice`). Rà cùng lỗi ở `WingsGoScheduleTourList.tsx` ("Giá từ") và `WingsGoScheduleRow.tsx`. Test USD VI/EN, không quy đổi.
- **R2 — `sort=price` mất tháng/năm.** Danh sách phẳng phải hiện ngày đi có tháng/năm (formatter business calendar hiện có), không chỉ trong `aria-label`. Test hai đợt cùng ngày/thứ khác tháng/năm.
- **R3 — Tự gán "HAN".** `WingsGoScheduleRow.tsx` `row.departureCityCode || 'HAN'`: thiếu nơi đi thì bỏ đoạn nơi đi và mũi tên. Không suy từ thị trường hay tên tour. Test null.
- **R4 — D9 với giá trị rỗng.** `hasWingsGoScheduleFilterParams` phải trả true khi key whitelist **có mặt** (kể cả `''`, giá trị sai, mảng). `utm_*` và tham số ngoài whitelist không ảnh hưởng. Sửa test đang khẳng định hành vi sai; thêm assertion VI/EN cho `?market=` và `?q=`.
- **R5 — URL hash và parser popstate.** Giữ `window.location.hash` khi ghi URL. Dùng **một** adapter chung chuyển `URLSearchParams` thành `Record<string, string | string[]>` giữ key lặp dạng mảng (để `parseScheduleFilters` bỏ như ở SSR); dùng cho popstate. Đặt adapter trong module thuần. Test: tracking + hash được giữ; popstate với `?market=korea&market=japan` bỏ filter market giống SSR.
- **O1 — Tên tour chưa chuẩn hoá (orchestrator).** Chưa component nào dùng `tour.routeTitle`, nên tên chữ hoa "TOUR HÀN QUỐC 5N4Đ: …" hiện nguyên. Row, thẻ thị trường, thẻ tour hiển thị `tour.routeTitle` (fallback `tour.title`); tên đầy đủ `tour.title` đặt trong `title`/accessible name khi khác. `WingsGoScheduleRow` không được fallback sang `row.searchText`; thiếu tour thì dùng copy trung tính. Sắp xếp/tìm kiếm không đổi. Test với tên chữ hoa thật trong `phase0-baseline.md`.

## P3

- **R6 — Cuộn chưa trừ thanh lọc sticky.** Khi cuộn tới danh sách, đo chiều cao thanh lọc (`getBoundingClientRect()`) tại thời điểm cuộn và trừ đi, kể cả mobile khi thanh xuống dòng. Giữ reduced motion.
- **R7 — Vạch ngăn tháng trống.** `buildScheduleMonths` luôn điền đủ tháng, nên vạch ngăn phải dựa trên tháng có count 0 nằm giữa hai tháng có dữ liệu. Test bằng output thật của `buildScheduleMonths`. Sửa test Phase 2 đang dùng mảng thiếu tháng.
- **R8 — Nhãn VI ở EN.** `aria-label="Xóa tìm kiếm"` trong filter bar: đưa vào copy VI/EN. Rà mọi `aria-label`/`title`/`alt` hard-code trong các component `WingsGoSchedule*`. Test `getByRole('button', { name: 'Clear search' })`.
- **R9 — Vùng chạm 44px.** CTA row, link "Xem tour", select, toggle chế độ xem, chip thị trường, chip xoá bộ lọc, chip ngày (Phase 4), nút "+N ngày khác": vùng bấm thực tế ≥ 44×44px (có thể dùng padding/pseudo-element để giữ hình dáng). Đo bằng trình duyệt ở 390 và 1440, ghi số đo vào báo cáo.
- **R10 — Giá sold-out.** Row sold-out có kiểu gạch nhạt riêng cho giá (không giả `original`/promo). Chữ vẫn đạt tương phản 4,5:1 trên nền thật; ghi màu và tỷ lệ đo được.
- **O2 — Ảnh lỗi (orchestrator).** Ảnh `tour.media` tải lỗi (`onError`) phải chuyển sang ảnh fallback giống khi không có media, ở thẻ thị trường và thẻ tour. Test component kích hoạt `error` trên `<img>`.
- **R-test — Bàn phím biểu đồ.** Test tên "keyboard" của biểu đồ đang dùng `fireEvent.click`. Đổi sang thao tác bàn phím thật (`userEvent.tab` + `{Enter}`/`{ }`) nếu `@testing-library/user-event` có sẵn; nếu không, ghi rõ.

## Cổng, commit, báo cáo

- `pnpm run lint`, `pnpm run test:unit` (chỉ còn lỗi baseline `wingsGroupV3Shell`), `pnpm run test:component`, `pnpm exec tsc --noEmit` (2 lỗi baseline), `pnpm run build`.
- Integration: `node scripts/run-integration-tests.mjs tests/int/wingsGoScheduleIntegration.int.spec.ts`.
- Trước khi chụp ảnh: worktree chỉ có 30 file trong `app/public/media`, repo chính có ~17.700. Tạo **junction** (không copy) tới thư mục media của repo chính, ví dụ `cmd /c mklink /J E:\repo\WingsTravel-us093\app\public\media-main E:\repo\WingsTravel\app\public\media` rồi đổi hướng hợp lý, **hoặc** báo orchestrator nếu không chắc. Không commit media, không sửa `.gitignore`. Ghi cách đã làm vào báo cáo.
- Ảnh 1440 và 390 (VI, EN) cho: Theo ngày, `sort=price`, Theo hành trình, thẻ thị trường — vào `artifacts/phase34-fix/`.
- Không commit `payload-types.ts` hay `.snap` chỉ khác line-ending.
- Commit `fix(wingsgo): US-093 phase 3-4 review fixes (currency, titles, D9, URL, a11y)`, kèm:

```
Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01LPBpFfhDsGd5w6zaiq2fq4
```

- Ghi mục "Vòng sửa R1–R10, O1–O2" vào cuối `phase4-report.md`.

Khi xong in `US093_PHASE34_FIX_DONE`. Nếu bị chặn, in `US093_PHASE34_FIX_BLOCKED` kèm lý do.
