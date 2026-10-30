# US-093 — Hand-off gốc (stakeholder brief, 2026-10-30)

> Bản lưu nguyên văn prompt hand-off dùng làm đầu vào cho intake. Khi tài liệu
> story (`overview.md`, `design.md`, `execplan.md`) khác với file này, tài liệu
> story là nguồn đã chốt.

## 0. Bối cảnh

Trang `/lich-khoi-hanh` của site `wings-go` cần được làm lại theo prototype v2, cùng ngôn ngữ với trang `/tour` đã phát hành ở US-092 (`release-us092-35d85d6`).

Prototype là tham chiếu về giao diện, câu chữ và tương tác. Dữ liệu và hành vi thương mại phải đi theo code hiện có. **Khi prototype khác với mục 3, mục 3 thắng.** Không copy nguyên HTML/CSS/JS của prototype vào repo, và không dùng mảng dữ liệu nhúng trong prototype.

Prototype:
- `C:\Users\VIETD\AppData\Roaming\Open Design\namespaces\release-stable-win\data\projects\6ffd6d32-dc11-4cff-9cd7-7f8987c230cd\tour-page-redesign\wingsgo-departures-v2.html`
- Ảnh render (trước lượt sửa câu chữ cuối, nên câu chữ lấy theo file HTML): `...\tour-page-redesign\screenshots\departures-v2-preview.png`
- Audit trang cũ: `...\tour-page-redesign\audit-and-direction.md` (mục "Lịch khởi hành v2")

## 1. Đọc trước khi làm

Quy trình repo: `AGENTS.md` (Harness, Plane sync, Codex Consultation Gate), `README.md`, `docs/HARNESS.md`, `docs/FEATURE_INTAKE.md`, `docs/ARCHITECTURE.md`.

Hợp đồng phải giữ, trong `docs/stories/epics/E07-tour-product-platform/`:
- `US-092-wingsgo-tour-catalog-v2/design.md`: quyết định D1–D11, đặc biệt D3, D4, D7, D9, D11
- `US-092-wingsgo-tour-catalog-v2/validation.md`: cách lấy bằng chứng, ghi chú font và phát hành
- `US-084-wingsgo-editorial-card-badges/overview.md`: viền cầu vồng và sticker
- `US-083-wingsgo-tour-discount-promotions/overview.md`: giá gốc gạch, `promoLabel`
- `US-077-wingsgo-ux-and-conversion/overview.md`: lead có ngữ cảnh tour/ngày đi
- `US-028-schedule-browse-and-convert-ux.md`: hợp đồng gốc của trang này

## 2. Code liên quan (trong `app/src/`)

| File | Vai trò | Việc cần làm |
|---|---|---|
| `tours/StructuredPages.tsx` (`TourSchedulePage`, ~3836–4069) | Renderer trang hiện tại | Thay nội dung trang. Giữ `DepartureStrip` vì `TourMarketPage` còn dùng. |
| `tours/ScheduleInteractiveDepartures.tsx` | Bộ lọc client và danh sách | Viết lại theo v2, hoặc thay bằng component mới rồi xoá file cũ nếu không còn nơi dùng. |
| `tours/queries.ts` (`getResolvedScheduleData`, `normalizeDepartureCard`, `normalizeTourProductCard`) | Dữ liệu trang | Sửa theo mục 4. |
| `tours/types.ts` (`DepartureCardViewModel`, `SchedulePageViewModel`) | Kiểu dữ liệu | Mở rộng hoặc thêm DTO gọn. |
| `tours/utils.ts` | `getTourInquiryPath`, `getPriorityMarketDeparture`, `groupDeparturesByMonth`, `getAvailabilityLabel`, `isDeparturePublishable`, `getFutureDepartures` | Dùng lại. |
| `tours/PromotionPrice.tsx` | `PromotionPrice`, `PromotionBadge`, `isDisplayablePromoLabel` | Dùng cho mọi giá và nhãn ưu đãi. |
| `tours/wingsGoDisplay.ts` | `getDepartureStub`, `getDepartureCityCode`, `getTourRouteTitle`, `formatShortTourPrice`, `getShortDepartureDate`, `getCompactDurationLabel` | Dùng lại, không viết helper trùng. |
| `tours/businessCalendar.ts` | `toBusinessCalendarDay`, `businessCalendarMonth`, `daysUntilBusinessDay` | Nhóm tháng và đếm ngày theo lịch Việt Nam. |
| `tours/editorialBadges.ts` | `normalizeEditorialBadges` | Sticker và hot. |
| `tours/WingsGoUpcomingBoard.tsx`, `WingsGoUpcomingStrip.tsx`, `WingsGoMarketTiles.tsx` | Mẫu vé và ô thị trường của `/tour` | Tham khảo, tái sử dụng class/cấu trúc. |
| `tours/wingsGoCatalogCopy.ts` | Copy VI/EN | Theo mẫu này cho copy mới. |
| `app/(frontend)/globals.css` (~4755–5050+) | `.hot-rainbow-card`, `.wingsgo-display`, `.wingsgo-eyebrow`, `.wingsgo-board`, `.wingsgo-ticket*` | Dùng lại trước khi thêm CSS. |
| `app/(frontend)/cmsPage.tsx` (~722–729) | Route `lich-khoi-hanh`, `hotlines` | Giữ wiring. |
| `app/(frontend)/[...slug]/page.tsx` (`generateMetadata`), `tours/discoveryCore.ts` (33, 365) | Metadata, robots | noindex cho URL có bộ lọc. |
| `utilities/sharedConsultationChannels.ts`, `utilities/siteHotlines.ts` | Zalo OA, hotline | Dùng cấu hình site, không hard-code `0948 786 775`. |
| `app/(payload)/api/lead-submissions`, `lead-capture/` | Luồng lead | Chỉ đụng nếu chọn dialog (Q1). |

Test hiện có phải pass: `unit/wingsGoPriorityMarketDeparture.unit.spec.ts`, `unit/wingsGoDisplay.unit.spec.ts`, `component/promotionPrice.component.spec.tsx`, `component/editorialBadges.component.spec.tsx`, `component/retailTourDepartureSync.component.spec.tsx`.

## 3. Những chỗ prototype KHÁC hệ thống — bắt buộc xử lý đúng

1. **Thị trường.** Prototype có 9 nhóm (Đài Loan, Hồng Kông, Singapore · Malaysia, Dubai · Nam Cực) suy từ tên tour. CMS chỉ có enum `korea, japan, china, vietnam, thailand, cambodia, laos, myanmar, indochina, other`. Chip lấy từ `tourProduct.market` thật, chỉ hiện giá trị có dữ liệu, nhãn từ `WINGSGO_MARKET_LABELS`; `other` = "Thị trường khác" / "Other destinations". Không suy từ tên tour. Không thêm enum khi chưa chốt (Q2).
2. **Tình trạng chỗ.** Row hiện đủ: Mở bán, Sắp hết chỗ, Đã kín, Liên hệ báo giá; `availabilityBadge` ưu tiên. Bộ lọc: Mọi tình trạng, Mở bán, Sắp hết chỗ, Đã kín, Chờ báo giá (`commerceVerified` sai hoặc không có giá hợp lệ). Thiết kế `limited`/`sold-out` theo token; `sold-out` giảm nhấn nhưng tương phản ≥ 4,5:1.
3. **CTA.** "Giữ chỗ" chỉ khi như `canHoldSeat` trong `DepartureStrip`: `commerceVerified`, không `sold-out`, tương lai, giá hợp lệ theo `normalizeGovernedTourPrice`. Còn lại "Hỏi giá" với `intent: 'inquiry'`. Tách helper dùng chung (quy tắc chặt). `ctaLabelOverride` được ưu tiên.
4. **Liên kết CTA.** `getTourInquiryPath` với `departureId`, `departureDate`, `tourId`, `tourSlug`, `source: 'schedule'` → `/lien-he`. Dialog chỉ làm nếu chọn (Q1).
5. **Kênh liên hệ.** D4: chỉ Zalo OA và hotline cấu hình site. Bỏ WhatsApp/Messenger. "Trao đổi với chuyên viên" dùng cùng luồng tư vấn với `/tour`.
6. **Giá và ưu đãi.** `PromotionPrice` (`<del>` khi `originalPrice > priceFrom`) và `PromotionBadge` cho `promoLabel`. Danh sách hiện tại bỏ qua `originalPrice` — lỗi cần sửa. Giữ `urgencyLabel`. Không tự sinh chip giảm giá. Giá trên row là giá của đúng đợt (`priceFrom`). Ở "Theo hành trình", "Giá từ" = giá thấp nhất trong các đợt hợp lệ đang hiển thị của tour.
7. **Tour hot và sticker.** `normalizeTourProductCard` chưa trả `editorialBadges` → thêm qua `normalizeEditorialBadges` theo locale. Thẻ tour (Theo hành trình) và thẻ thị trường: `hot` = `hot-rainbow-card` + `sr-only`; `specialized`/`vip` là sticker theo US-084. Row theo ngày: Q3. Radius khác 24px thì đồng bộ `::before`. Không thêm chip "Tour hot".
8. **Thẻ thị trường chủ lực.** `getPriorityMarketDeparture` (ưu tiên `limited`, `isFeatured`, rồi ngày). Tiêu đề "Đợt nổi bật theo thị trường". Giữ dòng "Khởi hành dd/mm/yyyy". Ảnh từ `heroMedia`, cùng site, có fallback như `WingsGoTourCard`. Thị trường không có đợt hợp lệ thì trạng thái trống hoặc ẩn.
9. **Số liệu.** Tính từ dữ liệu. "Lịch khởi hành 2026 – 2027" từ đợt đầu/cuối. Không hard-code "từ Hà Nội" — `getDepartureCityCode`, chỉ nêu thành phố khi mọi đợt cùng nơi đi. "Cập nhật dd/mm/yyyy" chỉ khi tính được từ `verifiedAt`. Kiểm tra `getLowestPrice` chấp nhận `priceFrom = 0` (hero cũ "177 đợt • giá từ Liên hệ"); nếu đúng thì sửa `> 0` kèm test và rà nơi dùng. V2 không hiện giá thấp nhất ở hero.
10. **Ngày về.** `returnDate` có thật thì "Về dd/mm"; không thì không hiện gì.
11. **Tên tour.** `getTourRouteTitle` (" · "). Từ viết tắt > 3 ký tự hoặc đoạn không phân tách có thể cần tinh chỉnh helper, có test.
12. **Hãng bay.** Helper chuẩn hoá chỉ lúc hiển thị và lọc, theo mã IATA và tên (`Vietjet`, `VIETJET AIR (VJ)`, `Vietjet (về chuyến 06h25)` → `Vietjet Air`). Không nhận diện được thì giữ chuỗi gốc đã trim. Không sửa CMS. Tham khảo `AIRLINES` trong prototype.
13. **Font.** Tiêu đề `.wingsgo-display` (Playfair tự host); nội dung font theme. Không thêm Be Vietnam Pro. Màu từ `--site-brand`, `--site-accent`, token theme.
14. **Locale.** `/en` đủ copy tiếng Anh. D11: tour chưa dịch hiện nội dung VI, nhãn UI EN. Không dùng `toLocaleDateString`; dùng business calendar.

## 4. Dữ liệu

- `getResolvedScheduleData` query `where: {}` `limit: 200` rồi lọc tương lai ở JS; trang đã có 177 đợt → nguy cơ cắt. Kiểm tra `limit` khi `pagination: false`, lọc từ query theo ngày và published, ngưỡng an toàn, vẫn qua `appendSiteWhere`.
- `depth: 3` và toàn bộ view-model xuống client; HTML ~770 KB. DTO gọn (`WingsGoScheduleRow`). Ghi kích thước trước/sau vào `validation.md`.
- `daysUntilDeparture` tính server theo `Asia/Ho_Chi_Minh` (D3). Client không tính lại.
- Thay đổi `normalizeTourProductCard` ảnh hưởng trang thị trường, chi tiết tour, trang chủ.
- Revalidation: `/lich-khoi-hanh` trong `basePaths` của `collections/Tours/hooks/revalidateTourContent.ts`. Xác nhận sửa giá/đợt/badge làm mới trang.

## 5. Giao diện và tương tác

1. **Hero:** eyebrow, H1, một câu mô tả, 4 số liệu (đợt mở bán, hành trình, đợt có giá, đợt gần nhất). Phải: biểu đồ "Số đợt theo tháng" — cột `<button aria-pressed>`, `aria-label` đủ; bấm lọc/bỏ lọc; số cập nhật theo bộ lọc khác; cột 0 đợt `disabled`; vạch ngăn khi có tháng trống; ghi năm khi đổi năm; "Cao điểm" tính từ dữ liệu.
2. **Thị trường chủ lực:** tối đa 3 thẻ ảnh; bấm đặt bộ lọc và cuộn bằng `window.scrollTo` (không `scrollIntoView`), tôn trọng reduced motion.
3. **Thanh lọc dính:** tìm kiếm không dấu (debounce), hãng bay, tình trạng, sắp xếp (ngày gần nhất, giá thấp nhất; không giá xếp cuối), chuyển chế độ xem, chip thị trường kèm số đợt. `top` khớp chiều cao header WingsGo.
4. **Dòng kết quả:** số đợt, số hành trình, chip bộ lọc bỏ từng cái, xoá tất cả.
5. **Theo ngày:** nhóm tháng qua `groupDeparturesByMonth`. Row dạng vé: cuống ngày/thứ, tên tour, dòng thông tin (mã nơi đi → thị trường, hãng bay, nhãn), giá, "Xem tour", CTA. 8 đợt/tháng + "Xem thêm". Sắp theo giá thì không nhóm tháng.
6. **Theo hành trình:** gom theo tour; ngày là link/nút tới CTA đợt đó; 6 ngày + "+N ngày khác".
7. **Không có kết quả:** gợi ý bỏ từng bộ lọc kèm số đợt sẽ hiện, và lối tới chuyên viên.
8. **"Trước khi giữ chỗ"** và footer: lấy khối 3 bước/hotline của `/tour` nếu có; nếu chưa có thì copy theo locale, hotline từ cấu hình. Không thêm section tối giữa trang.
9. **URL:** `market`, `month`, `airline`, `status`, `q`, `sort`, `view` ghi lên URL và đọc lại; whitelist. URL có bộ lọc `noindex, follow`, canonical `/lich-khoi-hanh` theo locale (D9).

**SEO:** trang cũ render đủ 177 đợt trong HTML. "Xem thêm" và DTO không được làm mất link tới các trang tour trong HTML ban đầu; ghi lựa chọn vào `design.md`.

**Responsive** (390 và 768 thiết kế riêng): H1 mobile ≤ 4–5 dòng; biểu đồ thấp lại vẫn trong khung; row lưới như prototype; thẻ thị trường cuộn ngang; thanh lọc gọn. Vùng chạm ≥ 44px, focus ring rõ, không cuộn ngang tại 360/390/430/600/768/820/1024/1366/1440/1920.

## 6. Quy trình

1. Harness intake, story US-093 (overview, design, execplan, validation) theo format US-092.
2. Dừng hỏi người dùng Q1–Q3 trước khi code phần liên quan.
3. Tham vấn Codex ở điểm chốt kế hoạch, lưu vào `docs/consultations/`.
4. Phase 1: query, DTO, helper (hãng bay, `canHoldSeat`, thống kê, gom theo tour), badge trong `normalizeTourProductCard`. Phase 2: hero, biểu đồ, thẻ thị trường. Phase 3: thanh lọc, URL, theo ngày, trạng thái rỗng, metadata. Phase 4: theo hành trình, hot/sticker, khối 3 bước. Phase 5: QA đầy đủ, bằng chứng.
5. Sync Plane khi story đổi trạng thái.
6. Release review Codex và phát hành theo runbook Oracle **chỉ khi người dùng yêu cầu**. Không ghi/sửa dữ liệu production.

## 7. Câu hỏi cần chốt

- **Q1 — Form giữ chỗ:** link `/lien-he` có ngữ cảnh (khuyến nghị) hay dialog trên trang qua `/api/lead-submissions` + Turnstile?
- **Q2 — Đài Loan, Hồng Kông, Singapore, Dubai:** gộp "Thị trường khác" (khuyến nghị) hay thêm enum (migration, story riêng)?
- **Q3 — Viền cầu vồng trên row:** chỉ thẻ tour/thẻ thị trường (khuyến nghị) hay cả row? Nếu chỉ thẻ, row có nhãn hot dạng văn bản không?

## 8. Kiểm thử và điều kiện hoàn thành

Lệnh trong `app/`: `pnpm run lint`, `test:unit`, `test:component`, `test:int`, `build`.

Test mới — Unit: chuẩn hoá hãng bay (khoảng trắng, ngoặc kép thừa, hãng lạ); `canHoldSeat`; thống kê/đếm tháng theo lịch VN, gần nửa đêm; AND mọi bộ lọc; whitelist URL; query không cắt đợt. Component: row đủ trạng thái (mở bán, sắp hết, đã kín, chờ báo giá, `originalPrice`, `promoLabel`, `urgencyLabel`, `ctaLabelOverride`); thẻ hot + sticker + promo, không badge thì không thêm class/khoảng trống; biểu đồ dùng bàn phím; trạng thái rỗng và khôi phục.

Bằng chứng `agent-browser`, VI và EN, 1440 và 390: lọc rồi tải lại bằng URL có tham số; bấm CTA, `/lien-he` nhận `departureId`, `departureDate`, `intent`; sửa giá/badge trong CMS local và trang đổi theo; reduced motion; không cuộn ngang, không lỗi console.

Hoàn thành khi: mọi tiêu chí `overview.md` có bằng chứng trong `validation.md`; không hard-code số liệu/giá/thị trường/kênh liên hệ; `/tour`, trang chủ, trang thị trường, chi tiết tour WingsGo và WingSide, WingsGroup không đổi ngoài ý muốn.

## 9. Ngoài phạm vi

Không đổi giá, đợt khởi hành hay dữ liệu CMS. Không booking/payment. Không WhatsApp/Messenger. Không đổi font theme. Không lọc theo khoảng giá. Không đụng site khác.
