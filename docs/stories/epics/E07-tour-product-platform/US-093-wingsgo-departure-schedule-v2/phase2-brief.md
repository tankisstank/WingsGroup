# Brief cho agy — US-093 Phase 2 (hero, biểu đồ tháng, thẻ thị trường)

Bạn là agent implement; Claude là orchestrator. Làm trong worktree `E:\repo\WingsTravel-us093`, nhánh `feat/us-093-departure-schedule-v2`. Không push, không deploy, không sync Plane, không đụng DB của repo chính hay production.

Phase 1 (1A + 1B + vòng sửa `349e9c5`) đã được orchestrator chấp nhận. Codex đang review song song hợp đồng 1B; nếu có finding ảnh hưởng DTO, orchestrator sẽ giao sửa sau. **Không đổi type DTO trong `wingsGoSchedule.ts`**; nếu thật sự cần, dừng và báo.

## Đọc trước

- Thư mục story: `handoff.md` mục 3 (điểm 7, 8, 9, 13, 14) và mục 5 (điểm 1, 2, Responsive); `design.md` mục DTO, Số liệu hero, Giao diện, D8, D12, D13; `execplan.md` mục "Phase 2".
- Prototype (chỉ để tham chiếu giao diện và câu chữ, **không copy HTML/CSS/JS, không dùng mảng dữ liệu nhúng**): `C:\Users\VIETD\AppData\Roaming\Open Design\namespaces\release-stable-win\data\projects\6ffd6d32-dc11-4cff-9cd7-7f8987c230cd\tour-page-redesign\wingsgo-departures-v2.html`.
- Mẫu cùng ngôn ngữ thiết kế đã phát hành ở US-092: `WingsGoTourCatalogSection.tsx`, `WingsGoTourCatalogClient.tsx`, `WingsGoTourCard.tsx` (ảnh fallback, `hot-rainbow-card`, sticker US-084), `WingsGoMarketTiles.tsx`, CSS liên quan trong `app/src/app/(frontend)/globals.css`.

## Việc cần làm

1. Tạo trong `app/src/tours/`:
   - `WingsGoScheduleHero.tsx` (server component): eyebrow; H1 có khoảng năm lấy từ `stats.yearRange` (một năm hoặc "2026 – 2027"); một câu mô tả, chỉ nêu thành phố khi `stats.sharedDepartureCity` có giá trị; 4 số liệu từ `snapshot.stats` theo `design.md` (đợt mở bán = open + limited, hành trình, đợt có giá, đợt gần nhất); dòng "Cập nhật dd/mm/yyyy" chỉ khi có `verifiedDay`. Không hiện giá thấp nhất. Không hard-code thành phố hay số điện thoại.
   - `WingsGoScheduleMonthChart.tsx` (client, **component trình bày**): props `months`, `counts: Record<string, number>`, `selected?: string`, `onSelect?: (month?: string) => void`, `locale`. Mỗi cột là `<button type="button" aria-pressed>` với `aria-label` gồm tháng, năm và số đợt; cột 0 đợt `disabled`; vạch ngăn khi giữa hai tháng có tháng trống; ghi năm khi đổi năm; dòng "Cao điểm" tính từ dữ liệu. Mobile: cột thấp lại, nằm trong khung, không cuộn ngang trang.
   - `WingsGoScheduleMarketCards.tsx` (client, component trình bày): props `cards` (`snapshot.marketCards`), `rows`/`tours` cần để hiện ảnh, tên tour, "Khởi hành dd/mm/yyyy", số đợt; `selected?`, `onSelect?`. Tối đa 3 thẻ. Ảnh từ `tour.media`, thiếu thì dùng fallback giống `WingsGoTourCard`. Tour hot: `hot-rainbow-card` + nhãn `sr-only`; `specialized`/`vip` là sticker theo US-084. Thẻ không có badge thì không có class hay khoảng trống thừa. Mobile: thẻ cuộn ngang trong khung.
   - Hàm cuộn dùng chung (ví dụ `scrollToScheduleList` trong file client nhỏ): dùng `window.scrollTo`, `behavior: 'auto'` khi `prefers-reduced-motion: reduce`. Không dùng `scrollIntoView`.
2. `wingsGoScheduleCopy.ts`: bổ sung đủ nhãn VI/EN cho hero, biểu đồ, thẻ. `/en` không có chữ tiếng Việt trong UI.
3. Nối vào trang: trong `cmsPage.tsx` (khoảng dòng 718–728), **chỉ với site WingsGo**, gọi `getWingsGoScheduleSnapshot` (chưa cần `searchParams`, Phase 3 sẽ truyền) và truyền snapshot vào nhánh WingsGo của `TourSchedulePage`. Nhánh WingsGo render hero + biểu đồ (cột hiện tổng số đợt của snapshot, `onSelect` chưa nối) + thẻ thị trường, sau đó **tạm giữ** danh sách cũ bên dưới cho tới Phase 3. Site khác không đổi.
4. CSS trong scope `.wingsgo-schedule` (đặt cùng chỗ CSS WingsGo hiện có). Tiêu đề dùng `.wingsgo-display`; màu từ `--site-brand`, `--site-accent` và token theme; không thêm font. Vùng chạm ≥ 44px, focus ring rõ, tôn trọng reduced motion. Radius thẻ khác 24px thì đồng bộ `::before` của viền cầu vồng.

## Test component (đặt trong `app/tests/component/`)

- Hero: dữ liệu một năm và hai năm; một thành phố và nhiều thành phố; có và không có `verifiedDay`; EN không có chữ VI.
- Biểu đồ: dùng được bằng bàn phím (Tab, Enter/Space gọi `onSelect`), `aria-pressed` theo `selected`, cột 0 đợt `disabled`, vạch ngăn tháng trống, nhãn năm khi đổi năm, "Cao điểm".
- Thẻ thị trường: hot + sticker + promo; không badge thì không có class thừa; không có ảnh thì dùng fallback; tối đa 3 thẻ.
- Test phải render component thật, không tự viết lại logic trong test.

## Cổng, commit, báo cáo

- `pnpm run lint`, `pnpm run test:unit` (chỉ còn lỗi baseline `wingsGroupV3Shell`), `pnpm run test:component`, `pnpm exec tsc --noEmit` (2 lỗi baseline), `pnpm run build`.
- Chạy dev server local, mở `/lich-khoi-hanh` và `/en/lich-khoi-hanh` của WingsGo trên DB copy của worktree, chụp ảnh 1440 và 390 vào thư mục story `artifacts/phase2/` (tạo nếu chưa có). Ghi URL/host đã dùng.
- Không commit `payload-types.ts` hay `.snap` chỉ khác line-ending.
- Commit một lần với message `feat(wingsgo): US-093 phase 2 schedule hero, month chart and market cards`, kèm:

```
Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01LPBpFfhDsGd5w6zaiq2fq4
```

- Ghi `phase2-report.md`: file đã sửa, quyết định nhỏ, output test thật, ảnh chụp, điểm còn mở.

Khi xong in `US093_PHASE2_DONE`. Nếu bị chặn, in `US093_PHASE2_BLOCKED` kèm lý do. Điều kiện dừng theo `execplan.md`, thêm: phải đổi DTO, hoặc phải đổi giao diện `/tour`, trang chủ hay site khác.
