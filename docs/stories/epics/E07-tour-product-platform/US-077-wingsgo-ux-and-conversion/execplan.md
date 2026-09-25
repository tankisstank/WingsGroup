# Exec Plan — US-077

## Goal

Hoàn thiện bảy hạng mục WingsGo còn lại dưới một US, giữ dữ liệu và hành vi
tenant-safe, tạo lead có ngữ cảnh tour/ngày đi, và đồng bộ trạng thái Plane sau
khi từng hạng mục có proof. TASK-01 popup lead được hoãn.

## Scope

In scope: WGO-TASK-02, 03, 04, 06, 07, 13, 14; tests, release evidence và cập
nhật Harness/Plane tương ứng.

Out of scope: TASK-01; CRM/booking/payment/loyalty engine; analytics mới; bắt
buộc nạp PDF thật hay biên tập bổ sung nội dung sản phẩm để nghiệm thu.

## Risk Classification

Risk flags: Authorization/site scope, data model, privacy/audit, external email
queue, public API/client behavior, desktop/mobile, existing behavior, weak proof,
multi-domain.

Hard gates:

- Không gửi test lead vào sales production; không ghi PII thật vào fixture.
- Không chạy migration/write trên production nếu chưa có reviewed migration,
  backup/rollback và release approval.
- Giữ API submission cũ tương thích; validate site/tour/departure tại server.
- Không mark Plane task Done khi chưa có code + test/evidence tương ứng.
- Không đổi hoặc xóa các thay đổi dở khác trong workspace.

## Saved Delivery Plan

### Phase 0 — Baseline and contracts

1. Lưu hồ sơ US-077 này trước mọi sửa code.
2. Đối chiếu Git diff/worktree và code path hiện hữu; ghi baseline các file đã
   dirty, site/locale, lead API, data model và UX public hiện tại.
3. Giữ TASK-01 ngoài US implementation scope và backlog trên Plane.
4. Chốt các field/query/API contract ở `design.md`; tái sử dụng helper/collection
   hiện hữu. Chỉ mở migration khi schema change thực sự cần.

### Phase 1 — Backend and shared contracts

1. Thêm optional data cho departure (giá gốc, điểm, hãng bay/mã chuyến, hạng
   tour) và PDF itinerary có validation media PDF; đảm bảo legacy records đọc
   được.
2. Mở rộng lead context có allowlist; resolve site, tour và ngày departure từ
   CMS server-side, persist vào `form-submissions`, bảo toàn delivery queue
   hiện hữu và submission cũ.
3. Chỉnh query/normalizer dùng chung để homepage, detail và schedule cùng áp
   freshness, date, airline, price và availability rules.
4. Chạy targeted schema/API tests. Sau khi API/backend acceptance qua, đồng bộ
   TASK-04 Plane nếu logic/form plumbing đã sẵn sàng; ghi rõ UI còn lại nếu
   chưa hoàn tất.

### Phase 2 — Tour detail and lead form (TASK-13, TASK-04)

1. Hoàn thiện accordion theo ngày, tab tháng/năm, bảng giá và optional PDF
   download trong tour detail.
2. Thêm CTA theo trạng thái departure; mở form với departure/tour đã chọn.
3. Dựng `/lien-he` banner, selling points, form sáu trường, emergency contact,
   privacy copy và khối liên hệ; gửi qua endpoint hiện hữu.
4. Xác minh validation và persisted lead/context trên local hoặc staging cùng
   mail sink; không xác nhận booking.
5. Hoàn tất regression, cập nhật Plane cho TASK-13 và TASK-04 riêng sau proof.

### Phase 3 — Shared WingsGo chrome (TASK-02, TASK-03)

1. Căn header desktop một hàng từ 1280px, mobile nav, hotline, Zalo OA và locale.
2. Sửa footer contact wrap, địa chỉ, thông điệp tư vấn, CTA Zalo và hotline.
3. Chuẩn hóa contact widget responsive, hotline/email links, dialog keyboard
   behavior và contact-page link.
4. Xác minh regression trên WingsSide/WingsGroup; cập nhật Plane từng task sau
   browser/component proof.

### Phase 4 — Homepage and schedule (TASK-06, TASK-07, TASK-14)

1. Hoàn thành lịch gần nhất Hàn/Nhật/Trung, ưu tiên theo curation/chỗ giới hạn/
   ngày gần nhất; tất cả giá/ngày/hãng cùng departure.
2. Thêm bốn curated tour hot và ba destination cards trên homepage, không suy
   đoán demand và không tạo record giá mới.
3. Cập nhật `/lich-khoi-hanh` title/intro, ba market cards và tư vấn cuối trang.
4. Hoàn tất locale, empty states, responsive/browser checks; cập nhật mỗi Plane
   child task sau proof.

### Phase 5 — Acceptance and release

1. Chạy unit/integration/component tests liên quan, typecheck/lint/build; sửa
   regressions trước khi cập nhật task.
2. Kiểm tra bốn URL public ở VI/EN và viewport 390/768/1024/1440px; kiểm tra
   keyboard, form, lead context, price/staleness, PDF fixture và cross-site.
3. Rà migration/deploy procedure. Dùng staging controlled sink; production chỉ
   read-only smoke nếu không có deploy approval/evidence.
4. Đồng bộ Harness và Plane, xác nhận child names, parent US, dates/state; giữ
   TASK-01 deferred và US ở trạng thái chưa hoàn tất nếu còn AC nào thiếu.

## Sequence and Dependencies

Backend/API → TASK-13/TASK-04 → TASK-02/TASK-03 → TASK-06/TASK-07/TASK-14 →
integrated acceptance. Có thể chỉnh chrome trước trong một nhánh nhỏ nếu không
phụ thuộc API, nhưng không đánh dấu hạng mục hoàn thành khi regression chưa qua.

## Per-Item Completion Rule

Mỗi Plane child task chỉ chuyển Done sau khi code cho phạm vi task đã merge vào
worktree, test thích hợp pass, acceptance criterion có bằng chứng, và không có
regression đã biết. Ghi evidence/status ngay sau mỗi item. Nếu một task chỉ có
một phần hoàn tất, giữ In Progress và ghi phần còn thiếu; không chuyển status
chỉ vì các task phụ thuộc đang chờ.

## Stop Conditions

- Schema cần xóa/đổi dữ liệu hoặc migration không rollback được.
- Lead API không thể xác minh tenant/departure an toàn mà không đổi contract
  tương thích.
- Cần production data/email side effect hoặc owner approval chưa có.
- Curation/field tương tự đã tồn tại nhưng contract mâu thuẫn.
- Proof cho task không thể chạy trên local/staging an toàn.

## Current Checkpoint — 2026-09-22 ICT

| Plane task | Trạng thái hiện tại | Đã có | Còn thiếu để hoàn tất |
| --- | --- | --- | --- |
| LMCONTENTU-27 / TASK-01 | Backlog (hoãn) | Không thuộc phạm vi triển khai US-077. | Chưa làm theo yêu cầu. |
| LMCONTENTU-28 / TASK-02 | In Progress | Header/footer WingsGo; hotline tel, Zalo, địa chỉ và copy tư vấn. Typecheck, ESLint mục tiêu và unit header pass. | Browser desktop/mobile và regression trên các site khác. |
| LMCONTENTU-29 / TASK-03 | In Progress | Widget responsive, liên kết hotline/email/contact và hành vi keyboard/focus. Typecheck và ESLint mục tiêu pass. | Browser responsive, keyboard và nội dung cuối cùng. |
| LMCONTENTU-30 / TASK-04 | In Progress | Form/validation, lưu ngữ cảnh tour-ngày đi ở lead context; unit 20, component 15, SQLite bootstrap 2 pass; migration PostgreSQL pass. | Cấu hình Form CMS hiện hữu chưa được cập nhật/xác nhận; browser và controlled-sink submit chưa chạy. |
| LMCONTENTU-32 / TASK-06 | In Progress | Khối lịch homepage ưu tiên Hàn/Nhật/Trung, badges và đường dẫn. | CMS chưa có đủ departure tương lai đã xác minh, hãng/mã chuyến và giá còn hiệu lực; không tự điền dữ liệu bán hàng. |
| LMCONTENTU-33 / TASK-07 | In Progress | Ba destination cards; “Hot” chỉ lấy tour có trong danh sách curated của CMS, không dùng tour dự phòng làm bằng chứng popularity. | CMS chưa curate đủ bốn tour; homepage browser proof chưa chạy. |
| LMCONTENTU-39 / TASK-13 | In Progress | Accordion itinerary, bảng/tháng, trạng thái giá và CTA giữ chỗ/gửi yêu cầu; PDF field chỉ nhận media PDF cùng site. | Chưa có dữ liệu khởi hành hiện hành và PDF fixture; browser/download proof còn thiếu. |
| LMCONTENTU-40 / TASK-14 | In Progress | Tiêu đề/trust points/CTA cuối `/lich-khoi-hanh` và ba market cards VI/EN. | Cần departure/tour CMS data còn hiệu lực và browser responsive proof. |

## Delivery checkpoint — 2026-09-23 ICT

Release `ae7ecf78942f526999c2205b01e0b7e5636b920e` is live on WingsGo after
backup, the registered PostgreSQL migration, CMS Form 16 update and four-tour
catalog curation. Browser proof covers `/`, `/lien-he`, `/lich-khoi-hanh`, the
representative tour detail, the contact widget and 390px/1440px overflow checks.

| Plane task | Current evidence | Delivery decision |
| --- | --- | --- |
| TASK-01 / LMCONTENTU-27 | Explicitly deferred. | Keep Backlog. |
| TASK-02 / LMCONTENTU-28 | Production header/footer proof: hotline, Zalo, addresses, one-line phone and CTA. | Eligible for Hoàn tất. |
| TASK-03 / LMCONTENTU-29 | Production dialog proof: responsive `📞`/`✉️`/`💼`, tel/mail/contact links. | Eligible for Hoàn tất. |
| TASK-04 / LMCONTENTU-30 | CMS form schema, browser fields, native phone validation and query prefill pass. Controlled lead persistence was not exercised in production. | Keep Chờ xác nhận/In Progress. |
| TASK-06 / LMCONTENTU-32 | Homepage block is live; release `bc2a523` now selects only departures with airline, flight code and price. Incomplete future departures render `Chưa publish`; China still has no future source row. | Keep Chờ xác nhận/In Progress until CMS-owned data is complete and verified. |
| TASK-07 / LMCONTENTU-33 | Four curated eligible tour IDs and three market links render in production. | Eligible for Hoàn tất. |
| TASK-13 / LMCONTENTU-39 | Accordion, month tabs and CTA pass; no approved production PDF asset exists. | Keep Chờ xác nhận/In Progress. |
| TASK-14 / LMCONTENTU-40 | Title, three market cards, CTA and responsive proof pass; source data still lacks complete China/flight-code coverage. | Keep Chờ xác nhận/In Progress. |

US-077 remains In Progress while the remaining external data and controlled
lead/PDF proofs are open.

Verification on this checkpoint: TypeScript, targeted ESLint, 33 targeted unit
tests, 14 component tests, 2 SQLite bootstrap integration tests, and PostgreSQL
16 empty-to-head migration smoke all passed. `git diff --check` passed after
the final SQLite bootstrap edit. Browser proof was attempted
against an existing local dev server but returned its Next.js server-error
screen before WingsGo content rendered; no lead was submitted. Do not mark a
Plane child Done until its remaining evidence/data gates above are satisfied.

After the independent frontend audit on 2026-09-22, the source-side lead form
also passes the selected-tour prefill and native Vietnamese phone-pattern check.
The public deployment still serves the older WingsGo shell/form/content, so the
seven active tasks remain `In Progress` pending a release and CMS-content
verification. The audit did not submit production leads and cannot verify CMS
persistence, webhook/email delivery, Google Sheets sync, or server-side
anti-spam behavior.

Plane was updated directly after `plane:preview` omitted US-077 from the generic
manifest mapping: US-077 and TASK-02/03/04/06/07/13/14 are `In Progress`,
TASK-01 remains `Backlog`, all seven active tasks resolve to US-077, and the
active work items have one default owner. Plane `start_date` and `target_date`
are still empty; no target date was invented. The targeted sync was retried
after this audit, but the Plane API was unreachable and no remote status was
overwritten.
