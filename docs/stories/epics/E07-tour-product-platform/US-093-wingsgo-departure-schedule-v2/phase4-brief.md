# Brief cho agy — US-093 Phase 4 (Theo hành trình, khối "Trước khi giữ chỗ", sửa nhỏ Phase 3)

Bạn là agent implement; Claude là orchestrator. Làm trong worktree `E:\repo\WingsTravel-us093`, nhánh `feat/us-093-departure-schedule-v2`. Không push, không deploy, không sync Plane, không đụng DB của repo chính hay production.

Phase 3 (`e018547`) đã được orchestrator chạy lại: component 31/31, unit 13/13, tsc 2 lỗi baseline. Codex sẽ review Phase 2–3 song song; finding sẽ được giao sau. Ảnh chỉ lưu trong thư mục story `artifacts/`, **không** lưu ở `artifacts/` gốc repo (orchestrator đã xoá bản trùng của Phase 3).

## Đọc trước

- `handoff.md` mục 3 (điểm 6, 7) và mục 5 (điểm 6, 8); `design.md` mục DTO, "Giá và tiền tệ", D12 (Q3), D14; `execplan.md` mục "Phase 4".
- Prototype (chỉ tham chiếu; không copy HTML/CSS/JS, không dùng dữ liệu nhúng): `C:\Users\VIETD\AppData\Roaming\Open Design\namespaces\release-stable-win\data\projects\6ffd6d32-dc11-4cff-9cd7-7f8987c230cd\tour-page-redesign\wingsgo-departures-v2.html`.
- Mẫu: `WingsGoTourCard.tsx` (ảnh fallback, `hot-rainbow-card` + `sr-only`, sticker US-084, `PromotionPrice`), khối 3 bước/hotline của `/tour` (US-092) nếu có.

## Ranh giới module

Component client chỉ import runtime từ `tours/wingsGoScheduleModel.ts` và module thuần; `import type` từ module server được phép. Client không tính lại ngày, `canHoldSeat`, giá.

## Việc cần làm

1. **`WingsGoScheduleTourList.tsx`** (chế độ `view=tour`), thay cho phần tạm của Phase 3:
   - Gom theo tour bằng `groupScheduleRowsByTour` trên các row **đã lọc**.
   - Thẻ tour: ảnh (`tour.media`, fallback như `WingsGoTourCard`), tên, thị trường, thời lượng; tour hot có `hot-rainbow-card` + nhãn `sr-only` (Q3: chỉ thẻ, không row); `specialized`/`vip` là sticker theo US-084; không badge thì không class thừa.
   - "Giá từ" = `group.priceFrom` theo quy tắc tiền tệ (VND, rồi USD), hiện `original`/promo **của chính `chosenRow`** qua `PromotionPrice`/`PromotionBadge`. Không có `chosenRow` thì hiện nhãn "Liên hệ báo giá" theo copy.
   - Chip ngày: 6 chip đầu; mỗi chip là link tới `row.ctaHref` của đúng đợt (qua `SiteLink`, giữ locale), có `aria-label` đủ ngày và tình trạng. Phần còn lại theo D8: render đủ ở SSR và lần render đầu, chỉ gắn `hidden` sau enhance; nút "+N ngày khác" (`aria-expanded`, `aria-controls`) mở ra.
   - Link "Xem tour" tới trang tour theo locale.
   - SSR của `?view=tour` vẫn chứa link tới mọi tour khớp bộ lọc.
2. **`WingsGoScheduleAssurance.tsx`** (khối "Trước khi giữ chỗ", D14): 3 bước theo locale (copy tĩnh trong `wingsGoScheduleCopy.ts`), hotline lấy từ cấu hình site (prop `hotlines` đã có ở `TourSchedulePage`; không hard-code số), Zalo OA nếu có cấu hình, nút "Trao đổi với chuyên viên" tới `/lien-he` theo locale. Không thêm section nền tối giữa trang. Thay khối CTA cuối trang tạm của Phase 3 bằng khối này, không để hai khối trùng nhau.
3. **Sửa nhỏ Phase 3:**
   - Tiêu đề tháng đang lặp năm ("Tháng 7/2027 2027"): giữ một lần.
   - Chip "Tất cả" trong thanh lọc: số đếm phải là tổng khi **bỏ** bộ lọc `market` (cùng cách tính facet), không phải số row đang hiển thị.
   - URL: thao tác lọc rời rạc (chọn thị trường, tháng, hãng, tình trạng, sắp xếp, chế độ xem, xoá bộ lọc) dùng `pushState` để back/forward quay lại được trạng thái trước; gõ tìm kiếm (sau debounce) dùng `replaceState`. `popstate` khôi phục state. Không gọi `history` bên trong hàm updater của `setState`; gọi sau khi tính state mới (hoặc trong `useEffect` theo state).

## Test component

- Gom đợt theo tour; chip ngày link đúng `ctaHref`; 6 chip + "+N ngày khác" (render đầu không `hidden`, sau enhance có `hidden`, bấm mở ra); "Giá từ" với tour chỉ có USD, tour có cả VND và USD, tour không có đợt `canHoldSeat`, promo của đúng đợt được chọn; hot/sticker trên thẻ tour.
- Khối assurance: có hotline, không có hotline, có/không Zalo; EN không có chữ VI.
- Chip "Tất cả" đếm đúng khi đang lọc market; back/forward khôi phục bộ lọc (mock `history`/`popstate`).
- Test render component thật, không tự viết lại logic trong test.

## Cổng, commit, báo cáo

- `pnpm run lint`, `pnpm run test:unit` (chỉ còn lỗi baseline), `pnpm run test:component`, `pnpm exec tsc --noEmit` (2 lỗi baseline), `pnpm run build`.
- Integration: `node scripts/run-integration-tests.mjs tests/int/wingsGoScheduleIntegration.int.spec.ts`.
- Ảnh `?view=tour` và khối assurance ở 1440 và 390, VI và EN, vào thư mục story `artifacts/phase4/`. Curl SSR `?view=tour` để chứng minh link tour và `noindex`.
- Không commit `payload-types.ts` hay `.snap` chỉ khác line-ending.
- Commit một lần `feat(wingsgo): US-093 phase 4 tour view, assurance block and URL history`, kèm:

```
Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01LPBpFfhDsGd5w6zaiq2fq4
```

- Ghi `phase4-report.md`.

Khi xong in `US093_PHASE4_DONE`. Nếu bị chặn, in `US093_PHASE4_BLOCKED` kèm lý do.
