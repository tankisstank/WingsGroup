# Codex review — US-093 Phase 2 + Phase 3

**VERDICT: GO có điều kiện.** Không thấy P1 mới. Có thể tiếp tục Phase 4, nhưng cần xử lý các P2 dưới đây trước khi chốt Story/phát hành. K1–K3 đã giải quyết findings review 1B.

Review đúng `9644801..e018547`, không review implementation Phase 4. HEAD hiện là `3870f3c`; để tránh dùng nhầm code mới, đã nạp source/test tại `e018547` trực tiếp từ Git vào Vite trong bộ nhớ. Không checkout, không sửa code/test, không commit. Thực hiện lúc 00:01–00:11 ngày **31/10/2026 (+07)**; tên file giữ ngày 30/10 theo yêu cầu. Số dòng dưới đây thuộc `e018547`.

## 1. Findings mới

### 1. P2 — Thẻ thị trường đổi nhãn USD thành VND

`app/src/tours/WingsGoScheduleMarketCards.tsx:210` gọi `formatShortTourPrice(value, locale)` mà bỏ `row.price.currency`. Helper này chỉ định dạng VND. **Đã tái hiện:** row `{ value: 1200, currency: 'USD' }` hiển thị **“From VND 1,200”**. Quy tắc USD đã được design chấp nhận dù baseline hiện chỉ VND.

**Sửa:** kiểm currency; VND dùng formatter ngắn hiện có, USD dùng formatter có currency (`formatTourPrice`/`PromotionPrice`). Thêm test thẻ USD ở VI và EN; không quy đổi tỷ giá.

### 2. P2 — Sắp theo giá làm mất tháng/năm khởi hành nhìn thấy

`app/src/tours/WingsGoScheduleDateList.tsx:67` bỏ tiêu đề nhóm tháng, nhưng `app/src/tours/WingsGoScheduleRow.tsx:41` và `:78` chỉ hiện ngày trong tháng + thứ. **Đã tái hiện:** hai đợt `2026-11-15` và `2027-08-15`, cùng dữ liệu khác và không có ngày về, có toàn bộ nội dung row nhìn thấy giống nhau; chỉ `aria-label` chứa ngày đầy đủ. Người dùng nhìn màn hình không phân biệt được ngày đi.

**Sửa:** ở danh sách phẳng, render ngày đi có tháng/năm bằng formatter business-calendar hiện có; không chỉ để ngày trong accessible name. Thêm test hai tháng/năm khác nhau có cùng ngày/thứ.

### 3. P2 — Tự gán nơi khởi hành Hà Nội khi thiếu dữ liệu

`app/src/tours/WingsGoScheduleRow.tsx:100`: `{row.departureCityCode || 'HAN'}` tạo thông tin hành trình không có trong DTO. **Đã tái hiện:** `departureCityCode: null` vẫn hiện `HAN`.

**Sửa:** không có nơi đi thì bỏ đoạn nơi đi/mũi tên, hoặc dùng copy trung tính theo locale. Thêm test null; không suy nơi đi từ thị trường hay tên tour.

### 4. P2 — D9 bỏ sót tham số whitelist có giá trị rỗng

`app/src/app/(frontend)/cmsPage.tsx:544` trả false cho `''`, nên `?market=` hoặc `?q=` không kích hoạt `noindex`. D9 yêu cầu có bất kỳ key whitelist nào, kể cả giá trị sai. `app/tests/unit/wingsGoScheduleMetadata.unit.spec.ts:109` hiện còn khẳng định hành vi sai này.

**Sửa:** phát hiện sự hiện diện của key/value khác `undefined`, độc lập parser giá trị; giữ tracking ngoài whitelist không ảnh hưởng robots. Đổi test rỗng và thêm metadata assertion VI/EN cho `?market=`/`?q=`.

### 5. P2 — URL mất hash và parser popstate khác parser SSR

`app/src/tours/WingsGoScheduleBrowser.tsx:65` dựng URL không có `window.location.hash`; `:78` dùng `Object.fromEntries(params.entries())` làm tham số lặp thành giá trị cuối. **Đã tái hiện:** đổi tháng giữ `utm_source=review` nhưng mất `#results`; popstate tới `?market=korea&market=japan` chỉ còn Japan, trong khi parser SSR nhận array và bỏ filter này.

**Sửa:** bảo toàn hash khi tạo URL; dùng chung adapter query giữ repeated params dạng array cho SSR/popstate. Thêm test tracking + hash và reload/popstate với key lặp. Đây là hai sai lệch khác với finding lịch sử replaceState orchestrator đã giao Phase 4.

### 6. P3 — Cuộn tới kết quả chưa trừ chiều cao thanh lọc sticky

`app/src/tours/WingsGoScheduleMarketCards.tsx:105`, `:114` gọi helper không truyền offset; `app/src/tours/wingsGoScheduleScroll.ts:9`, `:18` mặc định offset 0. **Probe:** target top 300, thanh lọc cao 120 vẫn cuộn tới 300, khiến đầu danh sách nằm dưới thanh sticky. Reduced motion được xử lý đúng (`behavior: 'auto'`).

**Sửa:** đo thanh lọc bằng `getBoundingClientRect()` rồi trừ chiều cao tại thời điểm cuộn, kể cả mobile khi thanh lọc xuống dòng. Kiểm vị trí kết quả trong browser thật.

### 7. P3 — Vạch ngăn tháng trống không hoạt động với DTO thật

`app/src/tours/WingsGoScheduleMonthChart.tsx:86` chỉ phát hiện gap khi thiếu key tháng. Nhưng `buildScheduleMonths` (`wingsGoScheduleModel.ts:559`) luôn điền đủ tháng trống. **Đã tái hiện:** `[2026-11, 2026-12, 2027-01]`, counts `[2,0,3]`: cột 12 disabled nhưng không có vạch ngăn. Test Phase 2 dùng mảng thiếu tháng nên che sai lệch hợp đồng này.

**Sửa:** phát hiện khoảng tháng có count 0 giữa hai tháng có dữ liệu; giữ đủ keys DTO. Test bằng output của `buildScheduleMonths` và counts thực tế.

### 8. P3 — Nút xóa tìm kiếm còn accessible name tiếng Việt ở EN

`app/src/tours/WingsGoScheduleFilterBar.tsx:93` hard-code `aria-label="Xóa tìm kiếm"`. **Đã tái hiện** với locale EN và query khác rỗng. Test EN hiện chỉ tìm một số text nodes nên bỏ sót aria-label.

**Sửa:** đưa nhãn vào copy VI/EN, test bằng `getByRole('button', { name: 'Clear search' })` khi input có giá trị.

### 9. P3 — Vùng chạm chưa đạt 44px theo yêu cầu

`app/src/tours/WingsGoScheduleRow.tsx:193` đặt CTA 38/40px; `WingsGoScheduleFilterBar.tsx:111`, `:180`, `:219` đặt select 42px, toggle/chip 34/36px; `WingsGoScheduleBrowser.tsx:216` đặt chip xóa 30/32px. Link “Xem tour” không có padding/min-height bù vùng chạm. Đây là sai lệch source/layout so với brief, chưa phải số đo browser mới.

**Sửa:** bảo đảm vùng tương tác thực tế tối thiểu 44×44px (có thể tăng padding/vùng bấm mà giữ hình dáng chip), rồi đo tại 390px và 1440px.

### 10. P3 — Giá sold-out chưa có gạch nhạt theo design

`app/src/tours/WingsGoScheduleRow.tsx:172` luôn render `PromotionPrice` giống row mở bán. Với sold-out, governance bỏ `original`, nên giá còn lại không có gạch; CSS sold-out chỉ đổi nền/viền/màu cuống ngày. `PromotionPrice` chỉ tạo `<del>` cho giảm giá, không cho trạng thái sold-out.

**Sửa:** thêm kiểu gạch riêng cho giá sold-out, không giả original/promo để tạo `<del>`. Kiểm tương phản token trên nền thực tế sau khi áp opacity; hiện chưa có phép đo 4,5:1 mới.

## 2. Hợp đồng đã kiểm và các điểm chuyển tiếp

- **Boundary/K1:** client import runtime từ `wingsGoScheduleModel`; model và dependency runtime đã đọc không kéo Payload/`next/headers`. Các import snapshot server trong component là `import type`. Hero thuần, không query lại dữ liệu. DTO giữ bảng tours dùng chung, rows chỉ có dữ liệu hiển thị/ngữ cảnh CTA; không thấy Date/Set/Map/hàm trong output. Chưa có số đo payload/HTML trước–sau trên DB thật trong hai report, cần bổ sung trước chốt D5.
- **K2/K3:** nhãn thị trường có dấu/không dấu và `other` đã tìm được; test expiry và override trên inquiry đã bổ sung. Bộ unit snapshot/helper chạy đạt.
- **D8:** probe `renderToString` + `hydrateRoot` thật với 12 rows: SSR đủ 12, không `hidden`; sau effect có 4 hidden, không recoverable hydration error. Test có sẵn kiểm “Xem thêm”/thu gọn đúng. Chưa kiểm Tab/focus bằng browser native; không suy ra từ việc chỉ có attribute hidden.
- **D9/SSR:** wiring truyền `searchParams` tới snapshot đúng; browser khởi tạo từ `initialFilters`, không đọc window trong render đầu. AND/facet, giá VND→USD→null và empty relaxation được gọi từ model thật. Debounce 250ms có cleanup. Canonical dùng path sạch và locale của `generateMeta`; test metadata mock `generateMeta`, nên không coi canonical assertion đó là bằng chứng HTTP thật.
- **Row:** dùng `PromotionPrice`/`PromotionBadge`, giữ urgency, hot là nhãn tĩnh + icon, CTA qua `SiteLink` và `row.ctaHref`, không tự nâng inquiry lên hold-seat. Link locale theo pattern hiện có. Ngày VN do server điền, client không tính lại ngày tới khởi hành.
- **Hero/chart/cards:** stats không phụ thuộc filter; cột có aria-pressed/aria-label, count 0 disabled; card xử lý Enter/Space. Helper cuộn dùng `window.scrollTo`, reduced motion đúng. Test tên “keyboard” của chart tại `tests/component/wingsGoSchedulePhase2.component.spec.tsx:168` thực tế gọi `fireEvent.click`; chưa phải bằng chứng thao tác bàn phím.
- **Gỡ đường cũ:** `cmsPage.tsx:766`, `:774` chỉ WingsGo gọi snapshot và không gọi `getResolvedScheduleData`. Site khác còn nhánh legacy. `ScheduleInteractiveDepartures` vẫn được `StructuredPages.tsx:4080` dùng ở nhánh đó nên giữ file là đúng.
- **Ba lỗi đã được orchestrator giao Phase 4:** xác nhận ở `e018547` có năm lặp trong heading tháng, chip “Tất cả” dùng count sau market filter, và chỉ replaceState nên không tạo lịch sử từng lần lọc. Không mở finding trùng; không dùng code Phase 4 để tuyên bố đã đóng chúng. `view=tour` còn dùng date list là phần chuyển tiếp đã ghi cho Phase 4.

## 3. Bằng chứng tự chạy

Trong `app/`, dùng **`node --input-type=module` nhận script stdin**, gọi API `startVitest` của Vitest đã cài. Vite plugin `enforce: 'pre'` nạp `git show e018547:app/<src-or-test>` trong hook `load`; không ghi source/fixture mới. Unit dùng `config:false` + `vite-tsconfig-paths`, jsdom và `vitest.setup.ts` để plugin áp dụng thật (195 module đã nạp). Component dùng config component hiện có (32–33 module đã nạp).

| Lệnh/API và phạm vi | Kết quả |
| --- | --- |
| `startVitest('test', [wingsGoSchedulePhase2.component.spec.tsx, wingsGoSchedulePhase3.component.spec.tsx], …)` | Exit 0, **31/31** test có sẵn, 2 files. |
| `startVitest` cho unit metadata, modelBoundary, scheduleHelpers, scheduleSnapshot, scheduleSnapshotMocked, cộng 1 probe metadata rỗng trong bộ nhớ | Exit 0, **66/66** = 65 test có sẵn + 1 probe. |
| `startVitest` với `testNamePattern: 'READ ONLY REVIEW'`, thêm 9 probe component trong bộ nhớ | Exit 0, **9/9**, 14 test gốc bị skip có chủ ý (đã chạy ở lượt 31/31). |
| `git diff --check 9644801..e018547 -- app` | Exit 0. |

Probe kiểm implementation/component thật tại revision đã ghim; các assertion “CONFIRMED” chứng minh hành vi sai đang tồn tại, **không có nghĩa đã sửa lỗi**. Một lượt probe đầu thất bại vì dự đoán nhầm chuỗi VND là `0M`; output thật là `VND 1,200`, đã sửa riêng assertion trong bộ nhớ và chạy lại 9/9. Không thay đổi implementation.

Theo report/orchestrator: integration schedule 5/5, lead 9/9; build exit 0; tsc còn hai baseline `wingsGroupCorporateRoutes.unit.spec.ts`; curl SSR 39 rows không lọc và 18 rows Korea, robots/canonical đúng. **Không ghi các kết quả này là tự chạy mới.** Đã xem ảnh mobile EN Phase 3 đã lưu; đó là artifact cũ, không phải phiên browser kiểm chứng mới.

Chưa chạy lại build/integration/tsc/full suites hoặc browser E2E trên checkout `e018547`; không đổi checkout đang có Phase 4. Chưa đo payload, tương phản, overflow hay Tab/focus thực tế. Cần sửa P2 và kiểm lại bằng browser VI/EN trước chốt phát hành.

US093_3_REVIEW_DONE
