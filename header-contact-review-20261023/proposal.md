# Đánh giá header WingsGroup VI/EN và hợp nhất liên hệ

Ngày: 23/10/2026. Phạm vi: xác định US, kiểm tra hiện trạng, đề xuất UX và tham vấn agy. Chưa phải quyết định triển khai.

## 1. US liên quan

| Vai trò | US / Epic | Bằng chứng |
| --- | --- | --- |
| Thay đổi hotline gần nhất và regression cần theo dõi | US-081 / E07 | `docs/stories/epics/E07-tour-product-platform/US-081-wingsgo-multi-hotlines/overview.md` yêu cầu desktop gọn, gọi số chính trực tiếp và mở hotline phụ; `validation.md` mục 5 ghi đã thêm explicit hai hotline phụ cho `wingsgroup.vn`. Harness vẫn `in_progress`; tài liệu ghi bàn giao kỹ thuật, chờ stakeholder UAT. |
| Hợp đồng bố cục header WingsGroup | US-072 / E09 | `docs/stories/epics/E09-wingsgroup-v3-public-experience/US-072-header-brand-and-section-alignment/overview.md` yêu cầu không va chạm, clipping, overflow; giữ logo rõ và responsive. |
| Chữ và kích thước menu/ngôn ngữ | US-071 / E09 | `docs/stories/epics/E09-wingsgroup-v3-public-experience/US-071-wingsgroup-ux-copyedit-layout-social-proof/overview.md` có scope Header/Footer, font điều hướng và nhãn ENGLISH (en). |
| Luồng tư vấn phải bảo toàn | US-062 / E09 | `docs/stories/epics/E09-wingsgroup-v3-public-experience/US-062-homepage-fidelity-responsive-consultation.md` quy định header/hero/FAB mở chung dialog, Escape và trả focus. |

Đề nghị ghi nhận lỗi bố cục là follow-up của US-081, liên kết US-072. Phần thay đổi trải nghiệm hợp nhất liên hệ thuộc WingsGroup/E09 và có thể là một work item follow-up riêng liên kết các US trên nếu được chọn triển khai. Không gộp toàn bộ trách nhiệm vào story WingsGo chỉ vì dùng chung component. Chưa tạo US hay thay đổi trạng thái/tiến độ.

## 2. Đã kiểm chứng hiện trạng

Ảnh người dùng cung cấp được đối chiếu với browser live `https://wingsgroup.vn/` và `/en`, ngày 23/10/2026. Bằng chứng trong `live-measurements.json`, `live-vi-1280.png`, `live-en-1280.png`.

| Viewport | Menu lấn vào vùng logo VI | Menu lấn vào vùng logo EN |
| --- | ---: | ---: |
| 1440px | 33.61px | 99.28px |
| 1280px | 60.38px | 126.05px |
| 1200px | 134.19px | 199.86px |
| 1024px | Không dùng desktop nav | Không dùng desktop nav |
| 390px, 320px | Không dùng desktop nav | Không dùng desktop nav |

Đo bằng bounding box logo và mép trái nội dung con trực tiếp trong nav. Đây là đo va chạm các khối, không phải số pixel nét chữ bị che. Ảnh 1280px xác nhận chữ menu đè logo. `documentWidth` không lớn hơn viewport trong cả 12 trường hợp: kiểm tra horizontal overflow của toàn document sẽ bỏ sót lỗi này.

Nguyên nhân có bằng chứng source:
- `app/src/Header/Nav/index.tsx`: desktop nav chứa 6 link điều hướng, CTA tư vấn, nhóm gọi số chính/dropdown, Zalo và language switcher cùng hàng. CTA, hotline và Zalo là ba lối vào cùng mục tiêu liên hệ nhưng thao tác thực tế khác nhau.
- `app/src/app/(frontend)/wingsgroup-v3.css`: thanh header tối đa 1240px, nav `nowrap`, nhiều phần tử không co; nội dung nav tràn ra khỏi chính hộp nav về phía logo.
- Copy EN dài hơn làm va chạm tăng. Hai nhãn ngôn ngữ dài cũng chiếm chỗ.
- `headerHotlines.component.spec.tsx` hiện kiểm hành vi WingsGo, không có đo bố cục WingsGroup VI/EN. Component test DOM không thay được browser layout QA.

Live interaction: dropdown hotline mở được hai số phụ; Escape đóng. CTA EN mở dialog hiện hữu gồm Zalo, đủ 3 hotline, nút dẫn đến form; Escape đóng và trả focus đúng CTA. `agent-browser errors` không có page error trong phiên quan sát. Hai nhãn hotline phụ vẫn tiếng Việt trên EN: cần dịch nếu đưa vào cụm liên hệ mới.

Không có phân tích lịch sử commit đầy đủ để kết luận commit duy nhất gây lỗi. Tài liệu US-081 và cấu trúc hiện tại xác nhận đây là khu vực regression phù hợp để theo dõi.

## 3. Đề xuất Codex: một cụm liên hệ, ưu tiên gọi trực tiếp

Desktop, sơ đồ ý tưởng:

```text
[Logo] [Trang chủ · Dịch vụ · Hệ sinh thái · Về WingsGroup · Cẩm nang · Liên hệ]
                                  [☎ Gọi ngay 0912 910 101 | ▾] [VI | EN]
```

Sơ đồ hiển thị thứ tự khối; bản triển khai desktop là một hàng khi đủ chỗ.

- Dùng một cụm màu vàng thương hiệu với hai vùng tương tác rõ: phần số là link gọi `tel:0912910101`; phần mũi tên là button mở lựa chọn liên hệ. Không lồng button trong anchor, không làm toàn bộ cụm chỉ mở menu.
- Gộp CTA Trao đổi nhu cầu / Speak with a specialist và Zalo OA độc lập vào cụm này.
- Dropdown có hai hotline phụ, `Chat Zalo` / `Chat on Zalo`, `Gửi nhu cầu` / `Send an inquiry`. Chọn form đi thẳng tới form hiện hữu, không mở thêm một hộp chọn kênh nữa.
- Có thể nhắc hotline chính trong danh sách để người dùng đọc bằng công nghệ hỗ trợ dễ hiểu, nhưng ngoài header chỉ có một cụm liên hệ.
- VI dùng `Gọi ngay`; EN dùng `Call now`. Số CMS hiện ra trực tiếp trên desktop. Không dùng hứa hẹn miễn phí hay tốc độ phản hồi khi chưa có xác nhận vận hành.
- Đề xuất thu gọn nhãn ngôn ngữ thành `VI | EN`, giữ tên đầy đủ cho accessible label và trạng thái ngôn ngữ. Đây là thay đổi copy cần ghi nhận so với US-071.
- Giữ menu `Liên hệ / Contact` dẫn tới nội dung/trang liên hệ: đây là đích điều hướng riêng. Không tự xóa chỉ vì có CTA liên hệ.
- Hero và FAB tiếp tục dùng dialog hiện hữu. Cần cập nhật hợp đồng US-062 nếu header chuyển sang tương tác gọi trực tiếp này.

Số thao tác, không tính hộp xác nhận của hệ điều hành hay thời gian nhập form:

| Mục tiêu | Cụm đề xuất |
| --- | ---: |
| Gọi số chính | 1 lần bấm |
| Gọi số phụ | 2 lần bấm |
| Mở Zalo OA | 2 lần bấm |
| Đến form gửi nhu cầu | 2 lần bấm |

Mobile/tablet: `[Logo] [☎ Gọi ngay | ▾] [☰]`, EN `[Logo] [☎ Call now | ▾] [☰]`. Chỉ hiện số nếu đo thực tế còn đủ chỗ; số đầy đủ luôn có trong bảng chọn và drawer. Language switcher nằm trong drawer ở khung hẹp. Mũi tên mở panel nằm gọn trong viewport, không buộc người dùng mở hamburger trước khi gọi. Không thêm thanh sticky/FAB mới.

Ưu điểm dự kiến: còn một điểm nhấn liên hệ; giữ gọi chính một lần bấm; ngắn hơn hai CTA riêng hiện có. Đây là giả thuyết UX, chưa có dữ liệu chứng minh tăng cuộc gọi hoặc conversion.

Đánh đổi: Zalo từ một lên hai lần bấm. Nếu dữ liệu hiện có cho thấy Zalo là kênh chính, cần đánh giá lại thứ tự ưu tiên trước khi triển khai.

## 4. Phương án nhỏ hơn để so sánh

Một nút vàng duy nhất `Tư vấn ngay / Get advice` mở dialog hiện hữu với ba số, Zalo và form. Ít đổi code hơn, dễ đồng nhất header/hero/FAB; nhược điểm là gọi chính cũng cần hai lần bấm và không nhìn thấy số trên header. Phù hợp khi ưu tiên chọn kênh trung lập. Codex ưu tiên cụm gọi trực tiếp vì người dùng nhấn mạnh kích thích gọi/click.

## 5. Phạm vi triển khai nếu được chọn

- Header server copy và HeaderNav desktop/mobile/drawer; CSS chỉ scope WingsGroup.
- Dùng `resolveSiteHotlines` và shared Zalo OA hiện hữu; không thay schema, CMS data hoặc hotline tenant khác.
- Tái dùng luồng form/focus hiện hữu; không dựng form hay hệ thống liên hệ mới.
- Cập nhật test HeaderNav với WingsGroup VI/EN, số phụ rỗng/CMS custom; giữ regression WingsGo/WingSide; kiểm form context, dialog focus nếu đụng luồng này.
- Hợp đồng US-062, US-071 và proof US-081/US-072 cần ghi nhận khi triển khai. Khi thay story/proof/tracking phải chạy sync Plane và kiểm missingCount/dates/Epic mapping theo skill.

## 6. Tiêu chí nghiệm thu đề xuất

1. VI/EN ở 320, 375, 390, 768, 1024, 1199, 1200, 1279, 1280, 1440 và 1536px: logo, menu, CTA và locale không giao nhau, không clipping, không mất link điều hướng. Kiểm cả homepage và trang nội dung.
2. Khi khung không đủ tổng bề rộng logo + khoảng cách + nav + liên hệ + locale, chuyển sang compact nav; đo trên font đã tải xong. Không chỉ cố định breakpoint theo tên thiết bị. Kiểm 200% zoom và reflow tới 320 CSS px.
3. Chỉ một cụm liên hệ nổi bật trên header; gọi chính một bấm; tất cả số có `tel:` đúng dữ liệu CMS; Zalo đúng OA chung; form giữ locale và focus.
4. Dropdown mở bằng click/keyboard, Tab đi đúng, Escape đóng và trả focus, click ngoài đóng; nút có tên rõ và `aria-expanded`/`aria-controls`. Không cần ARIA menu phức tạp cho danh sách link thông thường.
5. Mục tiêu thiết kế vùng bấm 44x44 CSS px, đặc biệt mũi tên. Đây là lựa chọn thiết kế cho sản phẩm, không tuyên bố 44px là mức tối thiểu WCAG AA. WCAG 2.2 SC 2.5.8 có ngưỡng 24px hoặc điều kiện khoảng cách/ngoại lệ.
6. Console/page errors không có lỗi phát sinh; kiểm cả document overflow và giao nhau từng nhóm. Xác nhận dialer trên thiết bị thật trước khi nghiệm thu khả năng gọi; browser automation chỉ xác minh link và tương tác.
7. So sánh bằng chứng mới trước/sau cùng viewport/font. Không suy ra tăng conversion từ ảnh đẹp hơn; dùng dữ liệu click/call/Zalo/form hiện có nếu có, không tự thêm phạm vi analytics mới.

Tham khảo kỹ thuật sơ cấp: W3C WAI APG Disclosure Navigation, WCAG 2.2 Reflow (1.4.10), Target Size Minimum (2.5.8).

## 7. Lệnh và kết quả

- `scripts/harness.ps1 query matrix`: exit 0; xác nhận US-081 in_progress, US-071 implemented; đối chiếu trực tiếp story US-072/062.
- CodeGraph đã được dùng trước tra source; truy vấn đầu trả nhầm AdminNavIntro nên dùng rg giới hạn Header/WingsGroup source để xác định đúng file.
- `agent-browser --session header-review-20261023 open https://wingsgroup.vn` và `/en`: thành công.
- `agent-browser ... set viewport <width> 900` + `eval -b <measure-header.js>`: thành công, 12 bản đo ở live-measurements.json.
- `agent-browser ... click '@e40'`: dropdown EN mở đủ hai hotline phụ; `press Escape`: đóng.
- `agent-browser ... click '@e29'`: CTA EN mở dialog; `press Escape`: dialogClosed=true, focus về Speak with a specialist. Snapshot trong live-contact-flow.txt.
- `agent-browser ... screenshot <path>`: 3 ảnh live trong thư mục này.
- `agent-browser ... errors`: không có page error được ghi nhận.
- Herdr: xác nhận HERDR_ENV=1, workspace WingsTravel, pane agy wP:p1; đã gửi yêu cầu bằng pane run. Lệnh herdr wait không được phiên bản cài đặt hỗ trợ; dùng pane read lấy kết quả.
- Hai lỗi công cụ đã khắc phục: eval --stdin nhận null trong PowerShell nên dùng base64; ref @e40 thiếu nháy bị PowerShell coi là splat nên dùng '@e40'. Bằng chứng sau đó là lần chạy mới thành công.

## 8. Giới hạn và trạng thái

Chỉ tạo artifact trong thư mục header-contact-review-20261023. Chưa sửa app, source strategy, story, Harness status hay Plane; chưa sync vì chưa thay tracking/proof chính thức. Chưa deploy/push. Chưa gọi hotline thật, mở OA hoặc submit lead. Chưa triển khai/kiểm thử phương án mới và chưa chạy suite app vì không có thay đổi app.

Ý kiến agy lưu riêng trong agy-review.md; phần tổng hợp cuối được bổ sung sau khi nhận báo cáo.

## 9. Kết quả tham vấn agy và quyết định đề xuất cuối

Đã nhận báo cáo `agy-review.md` từ pane agy hiện hữu `wP:p1` qua Herdr. Agy đọc source/story và sử dụng ảnh/số đo live do phiên Codex tạo; đây là góc nhìn phân tích độc lập, không phải lượt browser QA độc lập thứ hai.

### Điểm đồng thuận

- US-081 là story liên quan bổ sung hotline; US-072/071/062 là các hợp đồng header, copy và consultation cần đối chiếu.
- Vấn đề là thiếu chiều ngang giữa logo/nav và nhóm liên hệ; cần kiểm riêng collision, không chỉ document overflow.
- Nên bỏ Zalo đứng riêng, thu gọn language switcher, giữ số chính gọi một lần bấm và bảo toàn tenant khác.

### Khác biệt đáng cân nhắc

Agy ưu tiên giữ **hai phần tử**: pill hotline + một nút vàng ngắn `Nhận tư vấn / Consultation` mở dialog chứa Zalo/form. Mobile theo agy chỉ hiện logo, icon gọi và hamburger; CTA đầy đủ nằm trong drawer. Đây là phương án tận dụng luồng hiện có, thay đổi tương tác ít hơn.

Codex ưu tiên **một cụm màu vàng có hai vùng bấm**: phần số gọi thẳng; mũi tên mở hotline phụ + Zalo + form. Mobile vẫn có nhãn Gọi ngay / Call now khi đủ chỗ. Lựa chọn này đáp ứng sát hơn ý muốn hợp nhất cả ba điểm liên hệ và tạo một điểm nhấn trên header.

| Cách chọn | Hotline chính | Zalo | Đến form | Điểm liên hệ thường trực trên header |
| --- | ---: | ---: | ---: | ---: |
| Codex: cụm gọi + mũi tên | 1 | 2 | 2 | 1 cụm |
| Agy: hotline + CTA ngắn | 1 | 2 | 2 | 2 phần tử |
| Một CTA mở dialog | 2 | 2 | 2 | 1 nút |

Khuyến nghị cuối: chọn cụm gọi + mũi tên, dùng phương án agy làm phương án đối chiếu khi review hình ảnh/interaction. Không kết luận tăng conversion khi chưa đo.

### Những nhận định trong báo cáo agy chưa thể chốt

- Con số tiết kiệm chiều ngang và khẳng định hết va chạm từ 1200px tới 4K là ước lượng; chưa có implementation hoặc browser test của phương án mới.
- Không tính Zalo là một bấm qua FAB: trên WingsGroup v3, FAB hiện hữu mở dialog chọn kênh; thường cần thêm bấm chọn Zalo. Source còn ẩn FAB khi hero đang hiện. Không coi FAB là đường dự phòng luôn có và gọi/chat trực tiếp.
- Không dùng `overflow-x: hidden` làm tiêu chí sửa lỗi: cần đo hộp không va chạm/cắt nội dung thật.
- Agy gợi ý mã US-085, nhưng chưa kiểm cấp số đồng thời/Plane; đó chỉ là mã đề xuất, chưa tạo hay dành chỗ. Nếu triển khai sẽ cấp ID hợp lệ theo backlog thực tế.
- Vai trò US-082 là tham chiếu localization bổ trợ; CTA EN đã có trong contract/header hiện tại, chưa có commit analysis để quy toàn bộ nguyên nhân cho US-082.

Không sửa báo cáo độc lập của agy. Các giới hạn được giữ tại đây để người duyệt thấy rõ mức chứng cứ của hai góc nhìn.

## 10. Quyết định triển khai ngày 2026-10-23

Người dùng đã chọn **phương án A: một cụm vàng, gọi chính + mũi tên kênh phụ** và yêu cầu giao agy triển khai. Hotline chính WingsGroup đổi thành **0948 786 775** (`tel:0948786775`), thay `0912910101`; dữ liệu các site con giữ theo CMS của từng tenant.

Đã kiểm mã hợp lệ và tạo **US-085 / E09**, contract tại `docs/stories/epics/E09-wingsgroup-v3-public-experience/US-085-wingsgroup-header-contact-consolidation/overview.md`, kế hoạch tại `execplan.md` cùng thư mục. Giao pane agy hiện hữu `wP:p1` qua `header-a-implementation-20261023/agy-task.md`; agent đang triển khai local. Mục tiêu review kỹ thuật 2026-10-26, chưa có ngày production.

Prototype so sánh đã đổi số; browser kiểm lại 300 assertions/24 cases PASS và kiểm riêng link tel mới. Đây là bằng chứng prototype, chưa là QA app. Chưa push/deploy/ghi CMS production.
