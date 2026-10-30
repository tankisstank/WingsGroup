# Brief sửa Phase 1A + 1B — Codex review 1A và orchestrator review 1B (2026-10-30)

Commit `158e663` (1B) đã được orchestrator chạy lại: unit liên quan 52/52, integration lead mới 6/6, `leadSubmissionRoute` 21/21, `leadCapture` 3/3, schedule integration 5/5, tsc 2 lỗi baseline. Chưa chấp nhận vì còn các mục dưới đây. Sửa tất cả trong **một commit mới**, không amend.

Đọc trước: `docs/consultations/2026-10-30-us093-phase1a-codex-review.md` (Codex review 1A).

## Từ Codex review 1A

### C1 (P2) — Nhãn `other`
`wingsGoSchedule.ts` (khoảng dòng 997–1004) ưu tiên `WINGSGO_MARKET_LABELS[value]` nên `other` ra "Tuyến khác". Với `value === 'other'` phải dùng `copy.marketOther` ("Thị trường khác" / "Other destinations"). Không đổi `WINGSGO_MARKET_LABELS` dùng chung (`/tour` giữ nguyên). Thêm assertion cho VI và EN.

### C2 (P2) — `verifiedDay`
Không suy từ `canHoldSeat`/availability. Trong vòng dựng row, tính `isDepartureVerificationCurrent(doc, now.getTime())` và cập nhật `maxVerifiedAt` cho mọi đợt verified hiện hành, kể cả đợt `quote` vì thiếu giá và đợt sold-out. Thêm fixture cho hai ca đó.

### C3 (P2) — Integration pagination chưa chặt
Trong `tests/int/wingsGoScheduleIntegration.int.spec.ts`: assert **đúng** số đợt fixture (không dùng `>=`), tập id unique, đúng thứ tự ngày rồi id, và chứng minh đã đọc qua trang 2 (ví dụ spy `payload.find` đếm số lần gọi với `page: 2`, hoặc ghi lại các `page` đã gọi).

### C4 (P2) — Thiếu test fail-closed và contract row
- `now` không hợp lệ và không có site: snapshot rỗng, **không** query dữ liệu.
- `buildScheduleRow` với đợt `17:00Z`: `ctaHref` có `departureDate=` là ngày VN; `intent=hold-seat` khi `canHoldSeat`, `intent=inquiry` khi quote / sold-out / ngày đã qua; `ctaLabelOverride` chỉ đổi nhãn, không đổi intent.

### C5 (P3) — Media URL
`extractTourMedia` phải trim và chỉ nhận URL hợp lệ: dùng helper chuẩn hoá media URL có sẵn trong repo nếu có (tìm trong `tours/` và `utilities/`), nếu không thì chỉ nhận path bắt đầu bằng `/` hoặc `https://`. Test: chuỗi chỉ có khoảng trắng, URL malformed, path `/media/...`.

## Từ orchestrator review 1B

### B1 (P1) — Route file export không hợp lệ
`app/src/app/(payload)/api/lead-submissions/route.ts` đang `export const resolveDepartureLeadContext`. Next.js chỉ cho route file export HTTP handler và config route; export khác làm hỏng `next build`. Đồng thời `import` đang nằm giữa file.
- Chuyển `resolveDepartureLeadContext` (và type phụ cần thiết) sang module riêng, ví dụ `app/src/lead-capture/departureLeadContext.ts`. Route import từ đó; import đặt ở đầu file.
- Test import từ module mới.
- Giữ nguyên mọi kiểm tra khác của route.

### B2 (P2) — Lead chưa đi qua route thật
Test hiện gọi resolver rồi tự `payload.create`, nên chưa chứng minh POST thật lưu được. Theo mẫu `tests/int/leadSubmissionRoute.int.spec.ts`, thêm test gọi **handler POST thật** cho:
- đợt `17:00Z`, gửi ngày VN → 2xx, bản ghi lưu `enquiryContext.departureDate` = ngày VN;
- đợt `17:00Z`, gửi ngày UTC cũ → 2xx, vẫn lưu ngày VN;
- gửi một ngày không khớp cả hai → bị từ chối như hành vi hiện tại của route.

### B3 (P3) — Mã hãng bay không phân biệt hoa thường
Trong `normalizeScheduleAirline`, `codePattern` có cờ `i` nên chữ thường như "we", "ca", "nh" trong chuỗi cũng khớp. Mã IATA chỉ khớp khi viết hoa (bỏ cờ `i` ở `codePattern`); `namePattern` giữ không phân biệt hoa thường. Thêm test: đủ 21 chuỗi baseline vẫn ra 11 hãng; một chuỗi lạ có từ thường "we"/"ca" ra `raw:`.

### B4 (P3) — Allowlist từ viết tắt so khớp không phân biệt hoa thường
`toTitleCaseWord` upper-case cả từ viết thường như "Ca" hay "Vu" nếu nằm trong allowlist. Chỉ giữ chữ in hoa khi từ **trong nguồn đã viết hoa** và nằm trong allowlist. Test: "Ca" giữ "Ca"; "VNA" giữ "VNA"; tên toàn chữ hoa vẫn cho kết quả như test hiện có.

### B5 (P3) — So id theo chuỗi
`sortScheduleRows` và `groupScheduleRowsByTour` so id bằng `localeCompare`, nên "10" đứng trước "9", lệch với sort `['departureDate','id']` của query. So số khi cả hai id là số nguyên, ngược lại mới so chuỗi. `groupScheduleRowsByTour` thêm tie-break id sau ngày. Test có id 9 và 10 cùng ngày.

## Cổng, commit, báo cáo

- `pnpm run lint`, `pnpm run test:unit` (chỉ còn lỗi baseline `wingsGroupV3Shell`), `pnpm run test:component`, `pnpm exec tsc --noEmit` (2 lỗi baseline).
- Integration bằng `node scripts/run-integration-tests.mjs` cho: `wingsGoScheduleIntegration`, `wingsGoLeadCompatibility`, `leadSubmissionRoute`, `leadCapture`.
- **Thêm:** `pnpm run build` (hoặc ít nhất `next build` type-check) để chứng minh B1; nếu build quá lâu hay cần env không có, ghi rõ lý do và lỗi thật.
- Không commit `payload-types.ts` hay `.snap` chỉ khác line-ending.
- Commit message `fix(wingsgo): US-093 phase 1 review fixes (route module, lead POST, labels, verifiedDay, tests)`, kèm:

```
Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01LPBpFfhDsGd5w6zaiq2fq4
```

- Ghi mục "Vòng sửa C1–C5, B1–B5" vào cuối `phase1b-report.md`, có dòng tổng kết thật của từng lệnh.

Khi xong in `US093_PHASE1_FIX_DONE`. Nếu bị chặn, in `US093_PHASE1_FIX_BLOCKED` kèm lý do.
