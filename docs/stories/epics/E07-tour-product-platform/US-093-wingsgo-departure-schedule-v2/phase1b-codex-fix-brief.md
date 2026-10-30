# Brief sửa sau Codex review 1B (2026-10-30)

Nguồn: `docs/consultations/2026-10-30-us093-phase1b-codex-review.md` (GO có điều kiện, 2 P2 + 1 P3). Làm **sau khi Phase 2 đã commit** và **trước Phase 3**. Một commit mới, không amend.

## K1 (P2) — Tách helper thuần khỏi module server

`wingsGoSchedule.ts` import runtime `@payload-config`, `payload`, `siteContext` (kéo theo `next/headers`). Client browser của Phase 3 cần gọi filter/facet/sort/group, nên không được import module này.

- Tạo `app/src/tours/wingsGoScheduleModel.ts` (thuần, không import `payload`, `@payload-config`, `siteContext`, `next/*`, không `server-only`), chứa:
  - các type DTO (`WingsGoScheduleRow`, `WingsGoScheduleTour`, `WingsGoScheduleSnapshot`, `ScheduleFilters`, `ScheduleFacetCounts`, `WingsGoScheduleTourGroup`, …);
  - `foldVietnameseText`, `parseScheduleFilters`, `filterScheduleRows`, `countScheduleFacets`, `sortScheduleRows`, `groupScheduleRowsByTour`, `compareScheduleIds` và helper thuần khác mà client cần.
- `wingsGoSchedule.ts` import từ module thuần và **re-export** để caller và test cũ không gãy. Không đổi shape DTO.
- Mọi component client (kể cả của Phase 2) chỉ import từ `wingsGoScheduleModel.ts`, hoặc `import type` từ `wingsGoSchedule.ts`.
- Thêm một unit test kiểm ranh giới: đọc nội dung `wingsGoScheduleModel.ts` và assert không có import `payload`, `@payload-config`, `siteContext`, `next/`.

## K2 (P2) — Tìm kiếm theo nhãn thị trường

`searchText` chỉ chứa enum (`japan`), nên "Nhật Bản" / "nhat ban" không khớp.

- Khi dựng row, thêm nhãn thị trường theo locale của snapshot (VI hoặc EN, đúng label đã dùng cho chip; `other` dùng `copy.marketOther`) vào `searchText`, vẫn giữ enum.
- Fallback trong `filterScheduleRows` cũng dùng nhãn nếu có.
- Test: tour "Osaka - Kyoto", market `japan`: `q=Nhật Bản`, `q=nhat ban` (VI) và `q=Japan` (EN) đều ra row; `q=thi truong khac` khớp tour `other`; facet đếm đúng khi `q` đang áp dụng.

## K3 (P3) — Bổ sung test CTA của `buildScheduleRow`

- Đợt có giá hợp lệ nhưng verification hết hạn đúng bằng `now`: `availability === 'quote'`, `price === null`, `canHoldSeat === false`, `intent=inquiry`.
- Đợt quote và đợt sold-out có `ctaLabelOverride`: chỉ nhãn đổi, `intent` vẫn `inquiry`.

## Cổng, commit, báo cáo

- `pnpm run lint`, `pnpm run test:unit` (chỉ còn lỗi baseline), `pnpm run test:component`, `pnpm exec tsc --noEmit` (2 lỗi baseline), `pnpm run build`.
- Integration qua `node scripts/run-integration-tests.mjs`: `wingsGoScheduleIntegration`, `wingsGoLeadCompatibility`.
- Không commit `payload-types.ts` hay `.snap` chỉ khác line-ending.
- Commit `refactor(wingsgo): US-093 split client-safe schedule model, market label search` kèm:

```
Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01LPBpFfhDsGd5w6zaiq2fq4
```

- Ghi mục "Vòng sửa K1–K3" vào cuối `phase2-report.md`.

Khi xong in `US093_K_FIX_DONE`. Nếu bị chặn, in `US093_K_FIX_BLOCKED` kèm lý do.
