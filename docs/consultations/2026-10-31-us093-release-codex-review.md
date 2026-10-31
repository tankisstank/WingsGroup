# Codex RELEASE REVIEW — US-093

Ngày review: 2026-10-31  
Revision: `5ed5a1a` (`app` giữ nguyên so với `2064ba9`)  
Phạm vi: `git diff 58cbd24..HEAD -- app`  
Review chỉ đọc; không sửa code, không commit, không deploy.

## Verdict

**GO có điều kiện.** Không phát hiện P1, và không thấy lỗi logic mới chặn dữ liệu/locale/site isolation. Chỉ phát hành sau khi:

1. release owner chấp nhận hoặc xử lý gate baseline: `tsc --noEmit` còn 2 lỗi và unit còn 1 test baseline fail;
2. xử lý hoặc ghi nhận chấp thuận rõ ràng lỗi UX P2: nút nổi **Liên hệ** che một phần CTA lịch trên mobile khi cuộn.

## AC1–AC7

| AC | Đánh giá | Bằng chứng / giới hạn |
|---|---|---|
| AC1 | Đạt có điều kiện | Snapshot query phân trang 250, không cắt ở 200, loại ngày quá khứ theo ngày VN, dedupe ID; Phase 5 đo 39 đợt và SSR còn 38 CTA sau khi seed một đợt hôm qua (`validation.md:200-227`). Chưa có load test production với số lượng lớn hơn. |
| AC2 | Đạt | Component/unit bao phủ giá, promo, sold-out, quote, `canHoldSeat`; POST thật qua Redis tạm lưu đúng ngày VN cho `17:00Z`, ngày UTC cũ được chấp nhận, ngày sai trả 400 (`validation.md:237-249`). Chưa kiểm với Redis production/email provider. |
| AC3 | Đạt | Filter AND, whitelist URL, airline normalization, SSR, keyboard chart, empty state và back/forward đã kiểm (`validation.md:251-287`). |
| AC4 | Đạt | Component Phase 4 66/66; tour view có `Giá từ` từ row giữ chỗ hợp lệ, ngày ẩn/mở rộng sau enhance, hot/sticker; tour title dùng `routeTitle` (`WingsGoScheduleTourList.tsx:247-260`). |
| AC5 | Đạt có điều kiện | Link tour, canonical/noindex, EN UI, site scope và revalidate VI/EN đã kiểm (`validation.md:251-261`). JS off chưa chạy bằng trình duyệt; thay thế hiện có là SSR đủ row và không `hidden` (`validation.md:292`). |
| AC6 | Đạt có điều kiện | Không overflow ở 10 độ rộng VI và 2 độ rộng EN, không console/page error, keyboard/focus/reduced motion/touch/contrast và payload đã có bằng chứng (`validation.md:263-292`). Mobile còn lỗi overlay CTA của nút nổi Liên hệ (`validation.md:294`). |
| AC7 | Đạt có điều kiện | Regression WingSide/WingsGroup và các route WingsGo cũ byte-identical trên cùng DB; component 482/482, integration pass, build 20/20 (`validation.md:296-308`). Unit 1460/1461 và `tsc` 2 lỗi baseline nên chưa phải gate xanh tuyệt đối. |

## Kiểm tra các commit mới và ranh giới an toàn

- `f0d7da2`: query VI chỉ lấy `airline`/`departureCity` của đúng các `missingFactIds`, ghép với `scopedWhere`; public path vẫn dùng `_status=published` và ngày bắt đầu hiện tại (`wingsGoSchedule.ts:327-360`, `:396-429`). Không thấy đường lộ dữ liệu site khác hoặc marketing copy VI vào EN. Chế độ draft giữ chính sách preview hiện có qua `draft`/`overrideAccess`; cần giữ preview protected khi deploy.
- Fallback product VI tiếp tục ép `site=siteId`, `_status=published`, `draft=false`, `overrideAccess=false` (`wingsGoSchedule.ts:432-463`). Product/media sau đó còn fail closed theo site (`wingsGoSchedule.ts:475-510`).
- D6 lead kiểm site của departure và tour, tour phải published; ngày nhập phải khớp ngày VN hoặc ngày UTC cũ, ngày lưu luôn là ngày VN (`departureLeadContext.ts:27-82`). Route không nhận site ID từ public form (`lead-submissions/route.ts:146-181`).
- `22f5ca9`/`33bb397`/`fab4fb0`: badge, urgency, market card và CTA đều dựa trên trạng thái sellable; ảnh lỗi trước hydrate có fallback (`wingsGoSchedule.ts:149-226`, `wingsGoScheduleMarketCards.tsx:172-195`).
- Client/server boundary hợp lý: query và snapshot ở server; filter, history, progressive enhancement ở client. SSR không render `hidden`; các row/date dư chỉ ẩn sau enhance (`WingsGoScheduleTourList.tsx:290-345`).
- CSS mới có vùng `.wingsgo-schedule`, không thấy selector class `wg-*` trùng component khác qua `rg`; tuy vậy alias `wg-*` vẫn là selector global (`globals.css:5103-5304`), là rủi ro bảo trì P3.

## Handoff constraints

Đã đối chiếu: không có thay đổi schema/giá/đợt/CMS data; không thêm booking/payment; không thêm WhatsApp/Messenger; không có lọc theo giá; không đổi font; không đụng implementation site khác; không copy prototype HTML/CSS/JS/data; không hard-code số `0948 786 775`. Legacy site vẫn dùng đường render cũ trong `StructuredPages.tsx`; schedule v2 chỉ bật cho WingsGo.

## Findings còn lại

### P2 — cần xử lý hoặc chấp thuận trước release

1. **Mobile CTA bị nút nổi che.** Bằng chứng thực tế nằm tại `validation.md:294`; nút có `position: fixed` và `z-index:80` tại `app/src/components/SiteContactFab.tsx:79-90`. Fix tối thiểu: thêm vùng an toàn dưới CTA schedule hoặc ẩn/di chuyển FAB khi schedule row CTA nằm trong viewport; sau đó chụp lại 390px và kiểm click CTA. Nếu giữ ngoài scope, phải ghi chấp thuận sản phẩm và không đánh AC6 là hoàn toàn đạt.
2. **Gate kỹ thuật chưa xanh tuyệt đối.** `validation.md:301-308` ghi `tsc` 2 lỗi baseline và unit `1460/1461`; lỗi hiện tại là `wingsGroupCorporateRoutes.unit.spec.ts:116,155` theo lần chạy review. Cần sửa baseline hoặc có exemption phát hành được ghi rõ, rồi chạy lại full gate trên commit release.

### P3 — không chặn ở inventory hiện tại

1. **Quy mô snapshot/query.** `wingsGoSchedule.ts:341-385` đọc toàn bộ các trang vào memory; EN có thêm batch query VI tại `:400-429`. Batch 250 và cảnh báo >1000 đã có, nhưng chưa có production load/latency budget. Nên theo dõi thời gian query, số row và kích thước HTML/Flight; nếu inventory tăng mạnh thì thêm cache hoặc giới hạn theo policy.
2. **Bằng chứng JS off và cache production còn thiếu.** SSR đã đáp ứng D8, nhưng chưa có browser test tắt JS; revalidate đã có test VI/EN nhưng Phase 5 ghi dev không có full-route cache (`validation.md:258-261`). Bổ sung hai kiểm tra này trong pre-deploy smoke test.
3. **Class alias chưa hoàn toàn scoped.** Các alias `wg-*` tại `globals.css:5103-5304` nên được đặt dưới `.wingsgo-schedule` hoặc đổi prefix nếu sau này có component khác dùng tên tương tự.
4. **Tài liệu ma trận còn stale.** `validation.md:310-337` vẫn ghi “Chưa chạy” dù bằng chứng Phase 5 và full gate đã có. Cập nhật trạng thái AC sau khi chốt hai P2 để audit không bị hiểu sai.

## Bằng chứng đã chạy / đã đọc

- `git diff --check 58cbd24..HEAD -- app`: pass, không output.
- `git status --short`: sạch.
- ESLint mục tiêu các module schedule/cms: exit 0, 20 warning, 0 error.
- `pnpm exec tsc --noEmit --incremental false`: exit 1 với đúng 2 lỗi baseline tại `tests/unit/wingsGroupCorporateRoutes.unit.spec.ts:116,155`.
- Full evidence từ orchestrator: lint 0 lỗi, component 482/482, integration `6/6 + 9/9 + 21/21 + 3/3`, build 20/20; unit 1460/1461 (`validation.md:301-308`).
- Browser/SSR/SEO/lead/regression evidence: `validation.md:200-299`, screenshots `artifacts/phase5/`.

Không có P1. Release có thể đi tiếp sau khi đóng hoặc chấp thuận minh bạch hai P2 nêu trên.
