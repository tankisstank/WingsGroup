# Design

## Domain Model

US-073 không thêm domain entity. Các giá trị cần bảo toàn là:

- `SeedRichText` và `RichTextSection`: hình dạng Lexical tối thiểu mà Payload
  chấp nhận cho seed content.
- Payload block snapshots: `content`, `featureGrid`, `infoStrip`, `stats`,
  `testimonial`, `cta`, `mediaBlock`, `formBlock` và `archive`.
- Relation ID: `number | string` sau khi unwrap relation object; giá trị rỗng
  phải giữ đúng semantics hiện tại của từng caller.
- Header theme intent: `light` hoặc `dark` được route client đặt qua
  `useHeaderTheme`.
- Admin row label: label của cùng một `navItems` array trong Header và Footer.

Không được biến data builder thành domain service. Helper mới chỉ nhận input
thuần, trả object serializable và không truy cập Payload, database, request,
environment hoặc filesystem.

## Application Flow

### Seed and locale builders

Tách phần builder thuần vào module `app/scripts/lib/payloadSeedBuilders.ts` trung
tính. `seed-subsites.ts` và
`wingssideLocaleBackfill.ts` import cùng implementation. API nên giữ nhỏ:

- rich-text sections → Lexical root;
- link item;
- content/feature/info/stats/testimonial block;
- cta/media/form/archive block.

`pricingTableBlock`, `faqBlock`, seed asset loading, locale copy, generated-ID
stripping và relation discovery vẫn ở module sở hữu behavior đó. `Explore` và
`Xem thêm`, cũng như `LinkAppearance` rộng hơn, phải đi qua option/type hẹp;
không dùng `any` để làm hai caller compile được.

### PostgreSQL smoke runners

Tách lifecycle tối thiểu thành helper `.mjs` nhận cấu hình rõ ràng:

- image, container prefix, database name, password/secret;
- migration command;
- proof command và args;
- success/failure label;
- output mode và exit behavior.

Helper chỉ quản lý Docker start, readiness, dynamic port, environment và
teardown. Proof semantics vẫn nằm ở `wingsSideGroupCommercePgCrudProof`,
`wingsSideHiFiPgCrudProof` và `wingsSideTaxonomyPgCrudProof`. Không gom ba proof
thành một test có branching theo tên.

### Relation ID

Trước khi thay đổi, lập bảng caller theo contract:

| Contract | Ví dụ | Quyết định |
| --- | --- | --- |
| `number|string|undefined` | access/validation path | Có thể dùng helper optional tương thích |
| `number|string|null` | catalog/audit path | Giữ adapter hoặc helper nullable |
| `string` | admin guide | Giữ stringify adapter |
| passthrough/assumed-valid | legacy importer | Không thay bằng generic normalizer |

Nếu cần helper mới, đặt nó ở utilities/type-neutral layer, không dùng
`access/roles.ts` làm dependency của mọi script/domain. `normalizeRelationID`
hiện có thể tiếp tục phục vụ access-layer callers.

### Frontend and admin deduplication

Tạo một client component nhỏ nhận `theme: 'light' | 'dark'`, hoặc shared light
component nếu đó là implementation ngắn hơn. Ba file giống hệt của posts/search
phải dùng cùng implementation; catch-all light page có thể nhập cùng component.
`posts/[slug]` giữ `dark` bằng prop/config rõ ràng.

Tạo một shared `NavItemRowLabel` cho Header/Footer nếu type structural tương
thích. Hai config vẫn có thể giữ path mapping riêng nếu Payload importMap cần
đường dẫn ổn định; không đổi output label.

### Dead code and dependency removal

Xóa theo allowlist sau khi static reference scan pass:

- unregistered Payload template seed modules/assets, không xóa guard/test khi
  chưa thay thế security proof;
- `BeforeDashboard/SeedButton` và stylesheet;
- `components/ui/card.tsx`;
- inert `next-sitemap.config.cjs` và config-only include/test nếu route-level
  sitemap proof đã thay thế;
- deprecated site URL aliases và breadcrumb alias không có caller;
- `@types/escape-html` và `autoprefixer` khỏi package manifest/lockfile.

`next-sitemap` runtime dependency vẫn giữ vì public sitemap routes import
`getServerSideSitemap`.

## Interface Contract

- Không thay đổi public URL, HTTP method, status envelope hoặc API response.
- `GET`/`POST /next/seed` tiếp tục trả `404`; không mở destructive seed qua HTTP.
- CLI name/args của `seed-subsites.ts`, locale backfill và ba smoke runner không
  đổi nếu không có migration note riêng.
- Header client và RowLabel là internal components; rendered theme/label phải
  tương đương trước/sau.
- Shared helper không export API public từ package và không tạo dependency
  ngược từ `src/access` sang scripts.

## Data Model

- Không tạo migration và không đổi Payload collection schema.
- Mọi seed/backfill validation dùng disposable SQLite hoặc PostgreSQL.
- Không chạy apply/reset trên production database trong story này.
- Các fixture bị xóa khỏi source phải được chứng minh không phải dữ liệu CMS
  đang được tham chiếu; không xóa record/media trong database.

## UI / Platform Impact

- Browser: posts, paginated posts, search và catch-all page giữ header theme.
- Admin: Header/Footer nav row label giữ text và row numbering.
- Docker/PostgreSQL: runner dùng ephemeral container, dynamic localhost port và
  cleanup trong `finally` trên Linux/macOS/Windows shell mode.
- Build: Next standalone output, importMap và TypeScript include phải không còn
  tham chiếu file đã xóa.

## Observability

- Mỗi smoke proof giữ prefix/log riêng để xác định proof nào fail.
- Harness trace ghi các phase, số dòng trước/sau, dependency diff và exceptions.
- Validation artifact ghi command, exit code, test count, database target (chỉ
  disposable) và checksum nếu có.
- `git diff --check`, static reference scan và `git diff --stat` là evidence bắt
  buộc trước khi chuyển trạng thái.

## Alternatives Considered

1. Giữ nguyên mọi duplicate vì “chỉ là scripts”: bị loại vì hai seed path đã
   diverge và sẽ tiếp tục drift.
2. Tạo một generic framework cho mọi smoke test: bị loại; chỉ chia sẻ lifecycle
   Docker, không chia sẻ proof logic.
3. Thay mọi `relationID` bằng `normalizeRelationID` trong `access/roles.ts`:
   bị loại vì khác biệt `null`/`undefined`/stringify và sai layering.
4. Xóa toàn bộ seed security guard/test: bị loại vì đây là hard gate fail-closed.
5. Inline mọi builder: bị loại khi làm mất một nguồn truth; chỉ inline helper có
   đúng một caller như `infoStrip` nếu diff thực sự ngắn hơn.
