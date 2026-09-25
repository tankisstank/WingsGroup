# US-074 — Review và tích hợp có chọn lọc `applied-cms-ui-package`

## Kết luận

Gói `applied-cms-ui-package` phù hợp để làm visual/design reference và nguồn
token cho US-074, nhưng **không phù hợp để ghép trực tiếp vào Payload CMS**.
US-074 chỉ nhận các phần đã được chuyển thành contract React/SCSS của ứng dụng;
HTML, Vanilla JS và mock data trong archive không được đưa vào runtime.

Quyết định này giữ nguyên các boundary đã có của WingsTravel:

- Payload v3.84/Next.js 16 vẫn sở hữu DOM, routing, form state và access control.
- Page Wizard tiếp tục là React component gọi `/api/page-wizard`, với server-side
  authentication, site scope, slug conflict check và tạo draft fail-closed.
- Site Review tiếp tục dùng same-origin initializer ở CMS, production preview
  origin allowlist và signed short-lived handoff; không chuyển secret thành query
  string và không lấy `site.domain` mutable làm arbitrary redirect.
- Locale metadata public/content được giữ nguyên; adapter Payload mới là nơi loại
  suffix code do Payload tự nối. Không sửa nhãn metadata dùng chung theo cách làm
  hỏng public selector.

## Archive và bằng chứng kiểm tra

| Hạng mục | Kết quả |
| --- | --- |
| Artifact | `artifacts/applied-cms-ui-package/applied-cms-ui-package.zip` |
| SHA-256 | `1399777758b09708a3bdff6290747904ea07c29b3c283ab3c91ebf265302e357` |
| Kích thước nén | 59.943 bytes |
| Số file trong archive | 22 |
| Integrity | `unzip -t` pass; archive có path separator Windows nhưng vẫn extract được |
| Runtime contract | Không có `package.json`, React/TypeScript source, Payload API, migration hoặc test suite |
| Prototype boundary | HTML/CSS tĩnh, Vanilla DOM, `shell()`/`innerHTML`, local mock state |
| Asset boundary | README tham chiếu `context/`, `assets/`, `fonts/`, `build/` nhưng các lớp này không có trong archive |
| Preview quality | Năm preview card tham chiếu `preview/_card.css` không có trong archive và phát sinh 404 khi serve |

## Browser/visual review độc lập

- `ui_kits/app/index.html` ở 1440px cho thấy hierarchy Console, metric cards,
  task queue và scope context phù hợp với định hướng operator của US-074.
- Ở 768px, rail thu gọn còn icon-only nhưng icon/navigation label không đủ rõ
  trong bản prototype.
- Ở 360px, label navigation bị ẩn, tạo các vùng button trống khó hiểu dù không
  có horizontal overflow. Vì vậy package mobile không được coi là acceptance
  proof cho CMS Payload.
- `source-examples/cms-admin-polish.html` có modal, Escape và focus return hoạt
  động trong mockup, nhưng đây vẫn là static demo, không chứng minh preview,
  access, draft mode hay persistence.
- Accessibility probe phát hiện các cặp màu eyebrow/primary orange/teal trong
  prototype chưa đạt contrast kỳ vọng cho text thông thường. US-074 xử lý bằng
  foreground role riêng và fallback surface, không chỉ đổi z-index hoặc màu
  trang trí.

### Smoke entrypoint hiện tại

Một lần smoke riêng, chỉ ở trạng thái anonymous, mở
`https://wingsgroup.vn/admin` bằng `agent-browser` tại 360×800 và 1440×900.
Cả hai kích thước hiển thị login shell và không có horizontal overflow; đây là
ảnh chụp Production hiện tại, không chứng minh candidate WP-9 đã deploy và
không thay thế authenticated CMS proof.

- [360px](../../../../../../../artifacts/cms-admin-review-20260914-package-360.png)
- [1440px](../../../../../../../artifacts/cms-admin-review-20260914-package-1440.png)

Finding về “dọn production users” trong snapshot package **bị loại khỏi US-074**.
Không user/account nào được xóa, disable, rename, reset password, rotate
credential, seed hoặc đổi role/membership.

## Compatibility matrix

| Review item | Quyết định trong US-074 | Implementation/evidence |
| --- | --- | --- |
| Prototype HTML/Vanilla JS | Không import/copy raw runtime | React/Payload hiện có tiếp tục sở hữu behavior |
| OKLCH palette | Nhận có chọn lọc, fallback-first | `custom.scss` thêm `--wings-applied-*` sRGB và `@supports` OKLCH |
| Payload theme mapping | Không map 1:1 mù vì Finexy/ATS là theme riêng | Alias package chỉ làm default/reference; theme vars hiện hành vẫn có quyền override |
| Typography | Nhận | `--wings-admin-display/body/mono` có Apple/Android fallback; Console/Dashboard đi qua shared role |
| Mobile fix | Nhận mục tiêu, loại snippet unsafe | Giữ grid `1fr`, `min-width: 0`, content `padding-top: 64px` cho nav; không dùng `padding: 0` |
| React Wizard | Đã phù hợp | Giữ component React + `/api/page-wizard` access boundary; không dựng modal bằng `innerHTML` |
| Tenant preview | Không dùng `/api/preview?url=...&secret=...` | Giữ allowlist + signed handoff; current `window.location.origin` chỉ là CMS initializer đã validate |
| Locale label | Không sửa metadata trực tiếp | Dùng `getPayloadLocaleLabel` tại Payload boundary và `localeLabelWithCode` ở compact control |
| Contrast/fallback | Nhận | Tách action/accent foreground roles và thêm fallback cho admin status surfaces |

## Kết quả tích hợp vào runtime Payload

Candidate hiện đã ghép phần UI có thể vận hành của package vào các component
React/SCSS thật của CMS, với boundary dữ liệu và quyền của Payload được giữ
nguyên:

- Admin rail dùng navigation nhóm `Vận hành`, `Nội dung`, `Cấu hình site` và
  `Hệ thống`; mobile rút gọn còn các tác vụ triage chính nhưng vẫn giữ native
  Payload navigation cho toàn bộ collection.
- Console vận hành dùng shell/metric/task language của package, bổ sung
  checkbox triage cục bộ và status badge; checkbox không ghi workflow publish
  hoặc thay đổi dữ liệu server.
- Site Review dùng bố cục preview + checklist hai cột. Hai bước scope/preview
  lấy trạng thái tự động từ server/handoff; hai mục nội dung/SEO là checklist
  thủ công trong phiên và không giả lập quyền publish.
- Page Wizard giữ flow ba bước, thêm chọn locale theo `site.supportedLocales`,
  gửi locale vào API và server kiểm tra lại locale/site trước khi tạo draft.
- Theme Manager giữ live preview, hero preset và impact context; bổ sung
  landmarks để visual/browser QA bám được các vùng chính. Native collection
  lists/forms dùng token adapter và compact locale controls đã có.

Đây là **tích hợp có chọn lọc theo đúng kiến trúc**, không phải chạy nguyên
prototype. Các màn hình demo tĩnh như User Invite, Data Import, Site Identity
dialog và các thao tác `shell()`/`innerHTML` không được đưa vào runtime vì
package không có backend, access contract, migration hoặc persistence tương ứng.
Import/export vẫn do collection Payload thật sở hữu; lead triage thật vẫn do
`LeadTriagePanel`/API hiện có sở hữu.

## Thay đổi candidate trong các lượt hợp nhất

- Thêm token compatibility layer và fallback-first color contract trong
  `app/src/app/(payload)/custom.scss`.
- Bổ sung font fallback đa nền tảng, áp dụng role chung cho Console/Dashboard.
- Tách foreground cho action/accent text để tránh dùng trắng trên nền cam/teal
  có contrast thấp.
- Thêm fallback cho các admin status surface dùng `color-mix(in oklch)` khi
  WebView không hỗ trợ color-mix.
- Port navigation rail nhóm theo package vào `AdminNavIntro`, thêm các landmark
  `data-od-id` cho Console, Site Review, Page Wizard và Theme Manager.
- Thêm task checkbox/status badge cho Console và checklist preview/content/SEO
  cho Site Review, không mở rộng quyền publish.
- Thêm locale selector vào Page Wizard; API tạo draft nhận locale, kiểm tra
  `supportedLocales` của site và trả locale đã tạo.
- Thêm unit contract tại
  `app/tests/unit/appliedCmsUiCompatibility.unit.spec.ts`.

## Trạng thái release

Đây là implementation candidate chạy local/disposable. Chưa deploy Production,
chưa đổi domain/canonical/preview config và chưa ghi dữ liệu Production. Các
screen mới cần authenticated browser proof trên candidate/staging trước khi
được coi là release. Không có account/test-account action.
