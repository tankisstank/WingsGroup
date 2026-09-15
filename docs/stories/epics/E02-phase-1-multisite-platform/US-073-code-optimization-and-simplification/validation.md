# Validation

## Proof Strategy

Chứng minh refactor chỉ làm giảm code và giữ nguyên contract bằng ba lớp:

1. Static proof: mọi target dead/duplicate có reference inventory trước-sau,
   package/lockfile sạch và không còn import path lỗi; allowlist phải ghi rõ
   security guard được giữ lại.
2. Behavioral proof: output builder, seed/backfill, route fail-closed, header
   theme, RowLabel và smoke exit/log contract tương đương trước-sau.
3. Release proof: full test/typecheck/lint/build và disposable PostgreSQL smoke
   pass; E2E phải ghi rõ database target trước seed; không có production write.

## Test Plan

| Layer | Cases |
| --- | --- |
| Unit | Shared Lexical/block builders giữ shape, default label, nullable fields; relation adapters giữ đúng `null`/`undefined`/string semantics; unused aliases không còn symbol reference. |
| Component | Shared header-theme client giữ `light` và `dark`; Label/RowLabel output, row numbering và import contract không đổi. |
| Integration | Seed/backfill trên disposable SQLite tạo cùng normalized block output; `/next/seed` vẫn 404; seed guard vẫn yêu cầu local opt-in và từ chối production/remote DB. Nếu importer/caller được chạm, chạy riêng hai importer test ngoài glob mặc định. |
| E2E | Posts, paginated posts, search và post detail không đổi header theme, route status, locale, canonical hoặc browser error; Payload admin Header/Footer vẫn render RowLabel. |
| Platform | Ba smoke runner lần lượt pass trên ephemeral PostgreSQL 16 với migration, dynamic port, proof command, exit status và container teardown; stub proof xác nhận nhánh Docker/start/readiness/port/migration/proof và thứ tự cleanup. |
| Performance | Không thêm runtime dependency hoặc network call; build artifact không phình do helper bị import nhầm vào client bundle. |
| Logs/Audit | Harness matrix/trace, static reference report, LOC/dependency diff và validation report được lưu cùng story evidence. |

## Fixtures

- Disposable SQLite database trong `/tmp` với `PAYLOAD_DB_PUSH=true` khi cần
  bootstrap; không dùng `app/payload-tourplatform.db` production-like.
- Ephemeral PostgreSQL 16 container riêng cho group-commerce, Hifi và taxonomy;
  mỗi runner có database/container name khác nhau.
- Seed/backfill fixture cho EN/VI và ít nhất một locale `it`/`es`/`pt` để kiểm
  tra default link label và localized rich text.
- Header theme route fixture cho `light` page, `dark` post detail và paginated
  posts/search.
- Header/Footer Payload `navItems` fixture có row number, label có giá trị và
  label rỗng.
- Reference inventory snapshot trước refactor và normalized output snapshot sau
  refactor; generated output không được dùng làm source of truth.

## Commands

Chạy từ `app/` sau khi implementation hoàn tất:

```bash
pnpm exec tsc --noEmit
pnpm run lint
pnpm run test:unit
pnpm run test:component
pnpm run test:int
# This mode ignores inherited DATABASE_URL and creates a disposable SQLite file.
pnpm run test:e2e:sqlite
pnpm run build

node scripts/wings-side-group-commerce-pg-crud-smoke.mjs
node scripts/wings-side-hifi-pg-crud-smoke.mjs
node scripts/wings-side-taxonomy-pg-crud-smoke.mjs
```

Static/reference checks:

```bash
rg -n 'BeforeDashboard/SeedButton|components/ui/card|buildBreadcrumbListJsonLd|normalizeCanonicalDomain|getCanonicalURL|getAbsoluteMediaURL' src tests scripts
rg -n 'src/endpoints/seed|/next/seed|next-sitemap.config' src tests scripts tsconfig.json
pnpm install --offline --frozen-lockfile
git diff --check
git diff --stat
```

PostgreSQL E2E và smoke phải ghi target trước khi chạy:

```bash
env | rg '^DATABASE_URL=' || true
E2E_DATABASE_ENGINE=sqlite pnpm run test:e2e:sqlite
# For PostgreSQL, use only a fresh container or a database name containing
# e2e/test/ci; never pass a production-like URL to the reset/seed command.
```

Smoke failure characterization phải dùng stub/injected command runner trong
`postgresCrudSmokeLifecycle.unit.spec.ts`; không giả lập bằng cách trỏ vào
database thật. Mỗi run thực tế phải kiểm tra container name, dynamic port,
`DATABASE_URL`, exit code và `docker rm -f` sau migration/proof failure.

Nếu một implementation phase chạm các importer ngoài hai seed path, chạy thêm
test mapping riêng sau khi xác nhận chúng dùng đúng runtime/config:

```bash
pnpm exec vitest run --config ./vitest.unit.config.mts scripts/import-wingsgroup-v3-content.test.ts scripts/import-wingsgroup-v3-media.test.ts
```

Seed/backfill checks phải trỏ vào disposable database và dùng command/flag được
phê duyệt trong implementation plan; tuyệt đối không chạy apply/reset trên
production.

Harness/Plane handoff:

```bash
cd ..
scripts/harness query matrix
scripts/harness trace --summary "US-073 code simplification planning/verification" --story US-073 --agent Codex --outcome completed --actions "baseline,refactor,validation,plane-sync" --friction "none"

cd app
pnpm run plane:preview
PLANE_STORY_IDS=US-073 pnpm run plane:import:history
PLANE_STORY_IDS=US-073 pnpm run plane:sync:workitems
```

## Acceptance Evidence

Implementation evidence recorded on 2026-09-14:

- LOC baseline for the complete US-073 source allowlist was 22,407 lines. The
  same allowlist measures 19,638 lines after the refactor, a net reduction of
  2,769 source lines. This includes the shared builder, smoke lifecycle and
  frontend/admin adapters, and excludes binaries, generated output, lockfile
  lines and evidence. The deleted seed/template allowlist alone removes 2,455
  text source lines. A second cleanup then removed the unreachable
  `seedLegacyWingsGroup` function (2,837 lines) and its unused builder import;
  `rg` confirms no remaining caller.
- Direct manifest dependencies went from 37 runtime + 24 dev dependencies to
  37 runtime + 22 dev dependencies. `next-sitemap` remains because runtime
  sitemap routes import it. Frozen offline install passed.
- Static reference scan found no unexpected imports of the deleted seed
  templates, `SeedButton`, UI card or sitemap config. `guard.ts`, `/next/seed`
  404 behavior and the security proof remain. `generate:importmap` reported no
  changed import-map paths.
- Full unit proof passed 128 files / 967 tests and component proof passed 26
  files / 143 tests. The integration runner exited 0 with all configured
  non-conditional files passing. TypeScript, lint (0 errors; existing warnings
  remain), `git diff --check`, and import-map generation passed.
- Production Turbopack build completed compilation, type generation and 20/20
  static-page generation; standalone postbuild completed successfully.
- All three real PostgreSQL 16 runners passed against separate ephemeral
  containers and dynamic ports: group-commerce exact 22-tour CRUD,
  WingsSide HiFi EN/VI CRUD, and taxonomy scoped has-many CRUD. The lifecycle
  unit proof covers migration/proof ordering, proof failure cleanup and the
  Hifi environment exit code. A final Docker container-name check returned no
  matching runner containers.
- Selective `wings-group` seed passed on the disposable SQLite database after
  the dead-code deletion. Direct Playwright against the same disposable DB
  (system Chrome because the bundled Chromium binary is absent) passed the
  frontend smoke 42/42, link-audit 1/1, locale continuity 3/3, all seven hero
  structural fixtures, and the hi-fi/core/hostname/sitemap/JSON-LD checks.
  The visual snapshot suite remains unclaimed because this Linux workspace has
  no matching baseline; tracked baselines are Windows-only.
- Manual visual remediation verification on 2026-09-14 used system Chrome at
  1440x900 and 390x844. WingsGo hero media, all seven hero presentation
  fixtures, the WingsGroup CTA, and WingSide home rendered without broken
  images or horizontal overflow. Public media requests returned HTTP 200 after
  bypassing the server-side Next Image optimizer for the trusted `/media/`
  route; the only browser console entry was the expected COOP warning caused
  by local HTTP under Xvfb. Screenshots are retained under
  `app/output/playwright/us073-*fixed.png`.
- Stakeholder acceptance recorded on 2026-09-14: the Windows-only visual
  snapshot baseline exception is accepted for this release. It is an
  environment reproducibility limitation, not an observed production visual
  defect; the manual desktop/mobile proof above is the accepted visual gate.
- The final link audit also exposed and fixed a real tenant regression: the
  compatibility `/posts` redirect is now constrained to the WingsGroup host,
  so local `wingsgo`/`wing-side` aliases no longer fall to `/tin-tuc`. The
  root `/search` route remains intentionally fail-closed under the governed
  WingsGroup inventory and is excluded from the public crawl matrix.
- Importer tests remain conditional because no importer caller was changed;
  they are outside the default test globs. WingSide hi-fi seed still reports
  its known content-contract gaps for the absent approved `home-creds` proof
  records; no synthetic evidence was added.
- Harness and Plane handoff is updated after this evidence refresh; Harness
  is eligible to move to `implemented` because the stakeholder accepted the
  Windows-only visual baseline exception. Plane maps the fully proved four
  proof flags to `Đã bàn giao`; sync returned `patchedCount=7`,
  `missingCount=0`, with only the known unrelated Initiatives/archived-project
  and E09 API warnings.
