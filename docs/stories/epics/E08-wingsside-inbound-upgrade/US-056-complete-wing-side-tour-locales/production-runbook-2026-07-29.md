# US-056 — Production runbook

## Mục tiêu

Đưa bản sửa locale WingSide lên production an toàn, khôi phục đủ 88 cặp
`TourProduct × locale` (22 tour × `vi/es/it/pt`), giữ nguyên 22 English
baseline đã duyệt, và chứng minh 22 Journeys cards cùng 110 Tour Detail routes
hoạt động đúng trên `en/vi/es/it/pt`.

Runbook này chỉ được thực hiện sau khi có người phê duyệt production change.
Không dùng English fallback để đánh dấu đạt.

## Điều kiện đầu vào bắt buộc

- Immutable release commit và image đã được build từ cùng `WINGSTRAVEL_RELEASE_SHA`.
- Full signed plan có `englishNormalization` đủ 22 entries.
- Canary plan được sinh từ full plan đó và có `parentPlanSha256` khớp.
- Source catalog, English baseline và plan checksums đã được lưu vào release artifact.
- Production `DATABASE_URL` trỏ đúng PostgreSQL trusted target; `PAYLOAD_DB_PUSH=false`.
- Operator có quyền `super-admin` và có cửa sổ thay đổi được phê duyệt.

## Phân công và luồng song song

| Track | Người phụ trách | Phạm vi | Phụ thuộc |
| --- | --- | --- | --- |
| A — Data safety | Platform/DB | backup mã hóa, manifest, restore drill | release commit |
| B — Plan integrity | Backend/release | plan dry-run, inventory/checksum, canary | A không cần chờ restore, nhưng apply phải chờ A |
| C — QA chuẩn bị | QA/content | API assertions, browser matrix, expected evidence | B để lấy plan checksum |
| D — Release lead | Leader | quyết định go/no-go, apply, verify, rollback | A+B+C |

Chỉ Track D được chạy lệnh ghi production.

## Giai đoạn 0 — Release freeze và preflight

1. Ghi nhận release SHA, image digest, operator, thời gian bắt đầu và ticket.
2. Tạm dừng các job có thể ghi vào `TourProduct`, locale arrays, taxonomy hoặc
   cache liên quan trong cửa sổ thay đổi.
3. Kiểm tra production target:
   `NODE_ENV=production`, `PAYLOAD_DB_PUSH=false`, PostgreSQL host đúng trusted
   target và release marker hợp lệ.
4. Chạy plan read-only trên production và lưu JSON/log, không truyền cờ apply.
5. Đối chiếu đúng 22 slug, 4 locale mục tiêu và source manifest checksum.

**Stop:** inventory khác 22 tour, plan thiếu English normalization, SHA không
khớp release, hoặc phát hiện job ghi dữ liệu đang chạy.

## Giai đoạn 1 — Backup và restore drill (Track A)

1. Tạo PostgreSQL custom dump mã hóa `.dump.age`.
2. Tạo manifest kèm `database`, `file`, `format`, `encrypted` và checksum.
3. Tính checksum độc lập lần hai; so sánh với manifest.
4. Restore vào database disposable khác production; chạy kiểm tra schema, số
   site, số tour và truy vấn mẫu.
5. Ghi `restore-drill.json` với `status=ok`, checksum backup, target database
   khác production và `verifiedAt`.
6. Lưu backup, manifest, restore evidence trong release artifact có quyền hạn
   hạn chế; không ghi secret vào log.

**Gate A:** backup file tồn tại, đuôi `.dump.age`, checksum hợp lệ; manifest
khớp database/file production; restore drill thành công.

## Giai đoạn 2 — Signed plan và canary (Track B + D)

1. Sinh hoặc đọc full plan từ English production baseline hiện tại.
2. Tính và ghi `fullPlanSha256`; không sinh lại full plan sau khi canary bắt đầu.
3. Sinh canary cho `central-vietnam-adventure-4-days` và kiểm tra:
   - 4 locale entries của tour mục tiêu là các entries duy nhất có thay đổi;
   - 22 English normalization entries ở canary là no-op;
   - `parentPlanSha256` trỏ đúng full plan.
4. Chạy canary apply trong transaction.
5. Chạy canary verify và kiểm tra strict `fallbackLocale=false`.
6. Nếu canary fail, rollback canary và dừng; không chuyển sang full apply.

**Gate B:** canary verify đạt 88/88 checksums, không có English leakage mới,
không có thay đổi ngoài slug mục tiêu và log có `updated/unchanged` rõ ràng.

## Giai đoạn 3 — Full production apply (Track D)

1. Xác nhận lại approval ngay trước mutation: operator, ticket, thời gian và
   plan SHA.
2. Chạy full apply với:
   - full plan SHA;
   - canary plan path và canary SHA;
   - backup path/checksum/manifest checksum;
   - restore-drill evidence;
   - confirmation token chính xác.
3. Theo dõi transaction, database locks, error rate và application logs.
4. Không chạy migration hoặc taxonomy maintenance ngoài release scope.
5. Lưu machine-readable result: `updated`, `unchanged`, `state`, plan SHA,
   release SHA và operator.

**Expected rehearsal reference:** 84 locale entries updated, 26 entries
unchanged; 22 English entries phải được verify theo signed normalization.

## Giai đoạn 4 — Verify sau apply

### API/data

- Strict Payload/API read với `fallbackLocale=false`.
- Đủ 22 tour ở mỗi `vi/es/it/pt`.
- Đủ title, summary, route, CTA, metadata, itinerary, includes/excludes và
  service summaries.
- Không có empty localized fields, English sentence leakage hoặc checksum drift.
- Chạy full verify lần hai; kết quả phải `updated=0`/không có drift.

### Browser/public

- `/en/journeys`, `/vi/journeys`, `/es/journeys`, `/it/journeys`, `/pt/journeys`.
- 22 cards mỗi locale; không lẫn tiếng Anh ở locale dịch.
- Tối thiểu short/medium/long tour và `central-vietnam-adventure-4-days` ở cả
  5 locale.
- Kiểm tra H1, summary, includes/excludes, itinerary, CTA, price-on-request,
  duration singular/plural, accent tiếng Việt, canonical/hreflang.
- Kiểm tra desktop/mobile, keyboard focus, console errors, network 4xx/5xx.

**Gate C:** API audit pass + browser matrix pass + không có P0/P1 mới.

## Giai đoạn 5 — Idempotence và rollback readiness

1. Chạy lại full verify/apply ở chế độ an toàn; expected `updated=0`.
2. Xác nhận rollback command dùng đúng full plan và linked canary SHA.
3. Không xóa backup, plan, log hoặc evidence cho đến khi stakeholder sign-off.
4. Nếu Gate C fail hoặc có regression, dừng public announcement và rollback
   transaction bằng đúng plan đã ký.

## Go/No-Go và đóng US

**Go** chỉ khi Gate A, B, C đều đạt, stakeholder xác nhận 5 locale và tất cả
artifact đã được lưu.

**No-Go/rollback** khi checksum drift, inventory drift, backup/restore không
đạt, canary ngoài scope, API còn fallback/empty field, browser còn English
leakage, hoặc có lỗi P0/P1.

Sau Go:

- Đính kèm backup manifest, restore evidence, plan hashes, apply/verify logs,
  API report và browser screenshots vào Harness/Plane.
- Cập nhật US-056 status, acceptance evidence và thời điểm production deploy.
- Mở monitoring 30–60 phút cho Journeys, Tour Detail, API error rate và logs.
- Giữ rollback artifact theo retention policy đã phê duyệt.

## Artifact tối thiểu cần trả về

`release-metadata.json`, encrypted backup + manifest, `restore-drill.json`,
full/canary plan, plan SHA-256, apply/verify/rollback logs, strict API report,
browser evidence 5 locale và go/no-go sign-off.
