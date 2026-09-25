# Validation — US-077

## Acceptance Criteria

1. TASK-02/03: WingsGo header/footer/widget hoạt động ở desktop/mobile, dùng
   Hotline `tel:0912910101`, Zalo OA hiện hữu và đúng email/địa chỉ WingsGo;
   keyboard/focus/escape hoạt động trong widget.
2. TASK-04: form có tên, điện thoại, điểm đến, ngày đi, số khách, tour quan tâm;
   tên/điện thoại/số khách được validate; ngày và số khách được chuẩn hóa;
   API lưu site WingsGo lead và không nhận sai tenant hoặc departure không khớp.
3. TASK-06: trang chủ hiển thị tối đa một departure hợp lệ mỗi Hàn/Nhật/Trung;
   hãng, ngày, mã chuyến, giá và tình trạng cùng nguồn departure; ba huy hiệu
   và `/lich-khoi-hanh` link chính xác.
4. TASK-07: trang chủ hiển thị đúng tối đa bốn tour do CMS curate và ba thị
   trường với URL chính xác; không dựng fake popularity.
5. TASK-13: itinerary accordion mở/đóng; bảng lọc tháng theo năm; giá gốc/ưu
   đãi/điểm/status chỉ hiện khi có dữ liệu hợp lệ; PDF download hoạt động khi
   fixture có PDF và ẩn khi thiếu; CTA truyền departure đã chọn và sinh lead.
6. TASK-14: title/intro, ba market cards và CTA cuối trang render đúng VI/EN;
   links tới tour, liên hệ, tel/Zalo hợp lệ.
7. Regression: các site WingsSide, WingsGroup và form/lead submissions hiện hữu
   giữ nguyên hành vi; request cũ vẫn được chấp nhận.
8. TASK-01 giữ trạng thái hoãn, không code hoặc cập nhật Done.

## Test Matrix

| Layer | Proof |
| --- | --- |
| Unit | departure priority/freshness, day-only Asia/Ho_Chi_Minh, month grouping, price formatting, valid PDF MIME, lead-context allowlist and server validation |
| Integration | collection config and migration compatibility; API creates WingsGo submission, persists selected departure context, rejects cross-site/mismatched IDs, preserves existing payload and queue behavior |
| Component | form errors/success state; header/footer/widget; selected departure prefills contact dialog; four curated tour and three destination cards; monthly tabs and empty/missing-data states |
| Browser | `/`, `/lien-he`, `/lich-khoi-hanh`, representative tour detail in VI/EN at 390, 768, 1024 and 1440px; navigation, dialog close/focus, download fixture, form submit to controlled sink only |
| Regression | WingsSide/WingsGroup shared chrome, existing legacy lead submissions, sitemap/canonical/page builder behavior; no invented price, airline, availability or popularity |
| Platform | typecheck, lint, targeted tests, build; staging/read-only production smoke and schema/migration health |

## Safe Test Data

- Use local or staging data and an email sink. No real customer PII and no
  submission that notifies the production sales team.
- Use test departures for all three markets, one sold-out, one limited, one
  stale/expired, one with original price/points, and one without optional data.
- Use a test PDF only to exercise MIME/download behavior. Real sales PDFs and
  production content completion are not acceptance gates.

## Release Evidence

- Commands and exit codes for targeted tests/build.
- Sanitized API proof showing site, form, tour/departure relationship and
  persisted context, with IDs redacted where needed.
- Browser screenshots/URLs for four surfaces, VI/EN and narrow/wide viewport.
- Before/after diff review proving no unrelated dirty work was reverted.
- Migration status and deployment/rollback evidence if schema changes.
- Plane child status changes only after the corresponding acceptance criteria
  and evidence pass; TASK-01 remains backlog/deferred.

## Checkpoint — 2026-09-22 ICT

- PASS: `pnpm exec tsc --noEmit --pretty false`.
- PASS: targeted ESLint on changed WingsGo, lead-form, header/footer, API, and
  local SQLite schema files; no lint errors.
- PASS: 33 targeted unit tests, 15 lead-form component tests, and 2 isolated
  SQLite bootstrap integration tests.
- PASS: `pnpm run db:migrate:smoke`; every registered migration, including
  `20260921_090000_wingsgo_departure_lead_context`, applied to an ephemeral
  PostgreSQL 16 database with no pending migration.
- INCOMPLETE: `agent-browser` reached an existing local dev server, which
  returned a Next.js server-error screen before WingsGo content rendered. No
  form was submitted. Desktop/mobile, keyboard, dialog, PDF download, and
  cross-site visual regression evidence are still required.
- INCOMPLETE: the code does not create sales inventory. Current CMS content
  needs valid future departure data, four curated tour selections, and the
  contact Form definition before TASK-04/06/07/13/14 can be accepted. No values
  were invented.
- PASS (source): WingsGo contact query context now prefills the available
  destination, departure date, tour-interest and message fields; the WingsGo
  phone field exposes native `0[0-9]{9}` validation. The lead form component
  suite passes 15/15 after this change.
- FAIL (production frontend audit): an independent read-only browser audit of
  `https://wingsgo.vn` still found the seven previously recorded gaps: missing
  homepage hot-tour/market sections, missing tour accordion/PDF/month matrix,
  incomplete contact form, missing schedule sales blocks, stale shared chrome,
  missing enquiry prefill in the deployed build, and missing widget emoji.
  This is deployment/CMS-content evidence, not proof that the current source
  lacks those renderers. Do not mark the affected tasks Done until the release
  containing the current source and the WingsGo CMS form/curation data is
  published and rechecked.
- Plane API read-after-write confirms US-077 and TASK-02/03/04/06/07/13/14 are
  `In Progress`, TASK-01 remains `Backlog`, and the seven active tasks are
  children of US-077. Existing Plane `start_date` / `target_date` values are
  null; a new target date was not provided. `plane:preview` still does not map
  US-077 (`storyCount=0`); a targeted work-item sync was attempted after this
  audit but the Plane API was unreachable, so no remote status was overwritten.

## Production checkpoint — 2026-09-23 ICT

- PASS: release `ae7ecf78942f526999c2205b01e0b7e5636b920e` is live at
  `https://wingsgo.vn`; the PostgreSQL migration
  `20260921_090000_wingsgo_departure_lead_context` applied successfully and
  `migrate:status` reports no pending migration. `/api/health/live` and
  `/api/health/ready` return HTTP 200; the previous app image is retained as a
  rollback tag.
- PASS: production Form 16 now contains `full-name`, `phone`, `destination`,
  `departure-date`, required `guests`, and `tour-interest`. Browser proof at
  `/lien-he` shows the requested banner, selling points, office addresses and
  CTA. Native phone validation rejects `abc` (`pattern=^0[0-9]{9}$`), and a
  read-only query proof prefills destination, departure date and tour interest.
  The isolated `leadSubmissionRoute.int.spec.ts` suite passes 19/19 for
  validation, persistence, site ownership, context and rate-limit paths. No
  production lead was submitted.
- PASS: production homepage renders the upcoming-departures block, three
  commitment badges, four CMS-curated `Hot` tours (IDs 22, 23, 27, 57), the
  `Xem tất cả các Tour` CTA, and market links to Hàn/Nhật/Trung Quốc. Mobile
  390px has no horizontal overflow.
- PASS: production `/lich-khoi-hanh` renders the 2026 title, three market cards,
  final consultation CTA with hotline/Zalo, and no horizontal overflow at 390px
  and 1440px.
- PASS: production tour detail has six native `<details>` itinerary days,
  month tabs and the selected-departure CTA. The PDF control is correctly
  disabled because no production PDF media is attached; no download was
  claimed.
- PASS: the shared header/footer and contact widget are visible in production;
  the widget exposes `📞`, `✉️`, `💼`, tel/mail links and contact-page CTA at
  390px without overflow.
- REMAINING: TASK-04 still needs a controlled non-production submit/lead
  persistence proof; TASK-06 and TASK-14 need CMS-owned future China data plus
  verified flight codes/prices before those data gates can be closed. TASK-13
  needs an approved PDF asset for a download proof. External email/webhook/
  Google Sheets delivery remains outside this read-only browser proof.

## Hotfix checkpoint — 2026-09-23 ICT

- PASS: release `bc2a5230e706c528d036789979a2b17b7c2678ed` is live with the
  existing media volume, PostgreSQL and Redis containers unchanged; live/ready
  health checks return HTTP 200.
- PASS: TASK-06 now treats a future departure as public only when airline,
  flight number and governed price are all present. The homepage shows
  `Chưa publish` for an incomplete future departure instead of exposing
  `Đang cập nhật`, `Liên hệ` or a misleading sales CTA. Browser proof confirms
  three market cards, no horizontal overflow and the fail-closed label.
- PASS: the priority-departure unit suite is 2/2, component regression is
  25/25, TypeScript, targeted ESLint and production build pass.
