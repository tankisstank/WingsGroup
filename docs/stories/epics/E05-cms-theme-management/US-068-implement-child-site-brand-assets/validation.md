# Validation

## Proof Strategy

Prove the same site-scoped source drives CMS records, public markup, metadata,
and responsive rendering. Verify failures fail closed and never substitute the
other tenant's asset.

## Test Plan

| Layer | Cases |
| --- | --- |
| Unit | Runtime code/alias mapping; logo variant and metadata resolution; exact alt text; same-site fallback only. |
| Integration | Payload branding fields resolve by site; media ownership rejects cross-tenant references; import dry-run reports provenance/checksums. |
| E2E | WingsGo and WingSide homepage, contact, and one content route expose correct logo, favicon, OG image, `data-site-code`, and canonical URL; no 404s or console errors. |
| Platform | Desktop 1440px and mobile 390px; light/dark header/footer surfaces; no distortion, layout shift, or horizontal overflow. |
| Performance | No extra per-component settings queries; cache keys and metadata do not cross sites. |
| Logs/Audit | Import and resolver failures are observable with sanitized site/asset identifiers. |
| Release | Typecheck, lint, Prettier check, production build, related unit/integration tests, and browser smoke evidence. |

## Fixtures

- `wings-go` with WingsGo manifest assets.
- `wing-side` with WingsSide manifest assets and `/wingsside` compatibility alias.
- A negative fixture attempting to reference the other tenant's media.
- Desktop viewport 1440x900 and mobile viewport 390x844.

## Commands

```text
cd app
pnpm run import:brand-assets -- --dry-run
pnpm exec tsc --noEmit --pretty false --incremental false
pnpm run lint
pnpm exec prettier --check .
pnpm run test:int
pnpm run test:e2e
pnpm run build
```

## Acceptance Evidence

Worker implementation evidence (2026-08-29):

- `app/public/brand/wingsgo/` and `app/public/brand/wingsside/` contain the
  approved PNG assets and tenant manifests with provenance/checksums.
- Focused unit proof: 4/4 tests passed.
- Focused component proof: 5/5 tests passed, including primary/reverse
  cross-tenant rejection and same-tenant static fallback.
- TypeScript, targeted ESLint, targeted Prettier, `git diff --check`, and an
  independent SHA-256 manifest verifier passed.
- Webpack production build completed sufficiently to create `app/.next/BUILD_ID`
  and standalone server output; `scripts/prepare-standalone.mjs` then copied all
  12 public brand files into `.next/standalone/public/brand`.
- Standalone runtime now boots after explicitly packaging `libsql`,
  `@neon-rs/load`, and `detect-libc`; direct favicon asset smoke returns HTTP
  200. The local unseeded database returns 404 for the homepage, so tenant
  route browser proof still requires a seeded staging fixture.
- No production deploy, import, CMS write, migration, credential use, or
  commit was performed.

Staging/cutover checkpoint (2026-08-29):

- Added fail-closed `--dry-run` / explicit `--apply` modes to
  `scripts/import-brand-assets.ts`; dry-run completed for `wings-go` and
  `wing-side` with no writes.
- Seeded an isolated local staging clone at `app/payload-brand-staging.db`;
  source local SQLite remained unchanged.
- Host-routed HTTP smoke against the seeded runtime returned 200 for
  `wingsgo.vn` and `wingside.vn`, with matching `data-site-code` and exact
  logo alt text. Domain-routed `agent-browser` responsive evidence remains
  blocked because no reachable staging host/URL is configured.
- Production PostgreSQL backup, production CMS apply/deploy, rollback against
  production and cutover approval remain intentionally open: no production
  host, release path, database secret, encryption recipient or rollback point
  is present in the workspace.
- Detailed checkpoint: `output/us-068-staging-cutover-checkpoint.md`.

Open evidence before acceptance:

- changed-file list and tenant-to-asset mapping;
- SHA-256 checksums for every deployed asset;
- import dry-run and staging result;
- 1440px/390px screenshots or agent-browser evidence;
- test/typecheck/lint/Prettier/build results;
- explicit list of any human approvals still required.

## Production deployment checkpoint (2026-08-30)

- VPS preflight resolved `ubuntu@168.110.212.116` (`instance-20260604-2317`),
  compose project `wingstravel`, and release root `/home/ubuntu/wings-travel`.
- Encrypted PostgreSQL backup completed before CMS mutation:
  `wingstravel-2026-08-29T17-18-22Z.dump.age`, SHA-256
  `6468d14c8dfe21135171b1575475075634dd47c3ef09426a2b32db3cb825a898`.
- Production dry-run then apply completed for `wings-go` and `wing-side`.
- ARM64 runner image digest
  `sha256:52850180f55ce12442b83fcdb0a80b56df4f351c81f7e3dfb16e111f12a30917`
  is running; `current` points to `releases/wings-brand-20260830`.
- Public domains and direct tenant assets return HTTP 200 with matching
  tenant code, logo alt text, favicon and manifest. Responsive screenshots:
  `output/us-068-browser-production/`.
- Browser content renders, but `agent-browser` reports a server-component
  error during the public session; E2E acceptance and final human cutover
  sign-off remain open until that runtime error is triaged.

## Production remediation and contact cleanup (2026-08-30)

- Rebuilt from the complete WingsGroup production source after the earlier
  partial overlay caused a root-site regression; production now runs
  `releases/wings-brand-20260830-r8` with rollback retained.
- WingsGroup, WingsGo, and WingSide public home routes return HTTP 200 and
  `/api/health/live` returns HTTP 200.
- WingsGo and WingSide use their approved static brand-kit logo/favicon assets
  on the public edge, avoiding the Payload media edge 403 while preserving
  site-scoped CMS provenance and ownership checks.
- Removed Zalo from child-site top navigation and added a shared bottom-right
  contact FAB. The FAB links to the tenant contact route and the approved
  WingsGroup contact details: `0912910101`, `info@wingsgroup.vn`, and
  `sales@wingsgroup.vn`.
- Production `site-settings` for `wings-go` and `wing-side` now contain the
  same support phone/email/sales email. A pre-cleanup PostgreSQL backup was
  created at `wingstravel-content-cleanup-pre-20260830T164307Z.dump` with
  SHA-256 `27a9f4151eff758752d9199e4a0c945262c29b67c8c65e729f60d4a3e686e727`.
- CMS text cleanup removed the legacy WingSide/WingsGo phone and email strings;
  production `/lien-he` and `/contact-us` contain zero matches for the old
  values. Browser assertions confirm no Zalo in either child header, one
  contact FAB per page, correct tenant route, and the new phone/email links.
- Production build passed TypeScript, route generation, and standalone output;
  browser smoke for all three domains remains HTTP 200.
