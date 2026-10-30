# Brief cho agy — US-093 Phase 5: giảm markup HTML (AC6)

Orchestrator đo trên **cùng inventory** (39 đợt, 17 tour, DB local), cả hai đều chạy `next dev`: bản cũ là repo chính ở `58cbd24`, cổng 3101; bản mới là worktree ở `71661e3`, cổng 3100.

| Trang | HTML cũ | HTML mới | Flight cũ | Flight mới |
|---|---|---|---|---|
| `/lich-khoi-hanh` | 251.262 | 242.267 (−3,6%) | 138.241 | 73.651 (−47%) |
| `/en/lich-khoi-hanh` | 225.109 | **230.764 (+2,5%)** | 117.901 | 69.428 (−41%) |

AC6 yêu cầu HTML **và** Flight đều nhỏ hơn. Ở trang EN, markup không tính script là 156.502 byte. Trong đó thuộc tính `class` chiếm **94.239 byte**, gồm 968 chuỗi Tailwind dài, và mỗi row (`<article>`) trung bình 3.494 byte.

## Việc

- Chuyển các chuỗi class Tailwind lặp lại theo row/chip/thẻ sang class ngữ nghĩa có scope `.wingsgo-schedule` trong `globals.css` (CSS thuần hoặc `@apply`, theo cách file đang làm). Làm cho: `WingsGoScheduleRow`, `WingsGoScheduleDateList`, `WingsGoScheduleTourList` (thẻ tour, chip ngày), `WingsGoScheduleFilterBar` (chip thị trường), `WingsGoScheduleMarketCards`.
- Ưu tiên phần tử lặp theo số row. Phần chỉ xuất hiện một lần (hero, empty state) có thể giữ nguyên.
- Giữ nguyên giao diện ở 1440, 768 và 390; giữ trạng thái hover/focus/disabled, reduced motion, vùng chạm 44px, D8 (`hidden` chỉ sau enhance), Q3 và các `data-*` mà test dùng. Có thể bỏ thuộc tính `data-od-id` lặp theo row nếu không test nào dùng.
- Không đổi DTO, logic hay câu chữ.

**Mục tiêu:** trung bình mỗi row ≤ 1.600 byte; tổng HTML EN và VI đều nhỏ hơn bản cũ ít nhất 15%.

## Cổng

- `pnpm run lint`, `pnpm run test:unit` (chỉ còn lỗi baseline), `pnpm run test:component`, `pnpm exec tsc --noEmit` (2 lỗi baseline), `pnpm run build`.
- **Không chạy dev server ở cổng 3100 hoặc 3101.** Orchestrator đang dùng hai cổng đó và sẽ tự đo lại. Nếu cần chụp ảnh thì dùng cổng 3200.
- **Không** sửa `app/payload-tourplatform.db`. Orchestrator đang seed DB này cho QA.
- Ảnh trước/sau ở 1440 và 390 VI (Theo ngày, Theo hành trình) vào `artifacts/phase5-markup/`, chứng minh giao diện không đổi.
- Không commit `payload-types.ts` hay `.snap` chỉ khác line-ending.
- Commit `perf(wingsgo): US-093 move repeated schedule utility classes into scoped CSS`, kèm:

```
Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01LPBpFfhDsGd5w6zaiq2fq4
```

- Ghi `phase5-markup-report.md`: số byte mỗi row trước/sau (đo bằng HTML SSR), file đã sửa, kết quả test thật.

Khi xong in `US093_MARKUP_DONE`. Nếu bị chặn, in `US093_MARKUP_BLOCKED` kèm lý do.
