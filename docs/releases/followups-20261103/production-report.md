# Production delivery — 2026-11-03

User explicitly authorized push/deploy and production CMS updates. Technical delivery is complete; stakeholder acceptance is separate.

## Published source and active runtime

- Branch: `work/followups-20261102-us081-088-005`, pushed to origin.
- Application commit: `5b81a19d663f2f78a04d0e411fcfa0afbd416c4a`.
- Active release: `/home/ubuntu/wings-travel/releases/release-5b81a19`.
- Previous release retained: `/home/ubuntu/wings-travel/releases/release-us093-8efdbbf`.
- App image: `sha256:3097df8f8542cf245a2fd2abe52df77b0b6cbc9e4e916e5260a775339a995d50`.
- Operations image: `sha256:20effe744739ed6a2699c4bed634425c9a4aa1ca194a0cd34c24db862dd0f333`.
- Final readiness: database up, Redis up, lead delivery configured. Exact running image and canonical current/previous release paths were verified after cutover. Own preview containers removed; shared services and unrelated work retained.

The later documentation commit records delivery only; the application image is exactly the code commit above. The main working tree remains separate and includes unrelated pre-existing changes.

## Delivered scope

| Story | Production result |
| --- | --- |
| US-081 AC5 | Bounded Payload update changed legacy primary hotline in CTA copy, button label and `tel:` on WingsGo `/`, `/campaign`, `/thi-truong` to `0948 786 775` / `tel:0948786775`. Rerun reports zero changes. Secondary hotlines, drafts and other tenants preserved. |
| US-088 AC7 | Shared Feature Grid descriptions and detail accordion/tabs preserve textarea newlines with `pre-line` and long-word wrapping. Four real WingsPlus descriptions retain 7/4/6/7 newlines at 1440px and 390px without paragraph or document overflow. CMS text unchanged. |
| US-005 AC4–AC5 | Guarded VI H1 content update to “Tour theo mùa: Khám phá vẻ đẹp thế giới”. Campaign caption absent in VI/EN, EN heading unchanged. Default caption on a public WingsPlus medium hero remains visible. Video plays, CTA navigates to `/lien-he#contact-form`. |

## Data safety and recovery evidence

Protected prewrite CMS journals are on VPS only:

`/home/ubuntu/wings-travel/shared/artifacts/followups-642b857/{cta-apply,heading-apply}.json`

They were created exclusively and synced before transactional writes. Production target draft checks passed across supported locales. The independent comparison inspected **556 page-locales across 6 sites**, including published and latest draft data. Exactly **3 locale records** changed according to the permitted CTA/H1 transformation; all **1399 media** and remaining page/draft content were unchanged. The verifier was corrected to compare JSON-serialized values consistently (`undefined` is omitted by JSON) and preserve null layouts in its expected transform. Both corrections affect the read-only verifier only. See `production-content-verify-final.log` (exit0).

Fresh encrypted PostgreSQL backup and isolated restore were verified for the final release:

- Directory: `shared/backups/release-5b81a19-fd64d70e-d7f5-412d-8654-5542dfea5ffb`.
- Backup SHA256: `d4ac05283ab748eb724a7efd7a30a4d8d3252cf8f6cc0a2ebf0e2f0a8083c4c6`.
- Backup evidence SHA256: `a375971f7d4955ce5552b376c5289dd092f820a2b9573c341641f3fa704afa25`.
- Restore evidence SHA256: `9972755149e69a013de3d8d732e98532da1ed1329a88eab9f6045f73f05766e2`.
- Decryption key retained protected at mode600 on VPS. No credentials, key or CMS snapshots were copied into source control.
- The earlier verified pre-CMS backup is retained at `shared/backups/release-642b857-0fca2217-7d5e-453e-baaf-cd8c825de72f`, SHA256 `87488f30361a95954719bc55266564ac7783df188c275696c4941d28a4161ec9`.

All28 registered migrations were already applied. `migrate` and `migrate:status` exited0; no new schema, migration or dependency was introduced. Payload's old development marker prompt was handled only after the status confirmed no pending migration; installed migration code ignores the marker in memory and performs no pending migration writes.

## Findings resolved before final delivery

1. Production campaign uses slug `wings-go-campaign` with pathname `/campaign`. The updater now queries exact site/path/published status, checks actual slug/path against snapshot, and refuses forged route identity. Real PostgreSQL integration covers namespaced slug, conflicts, drafts, noop and targeted rollback.
2. Standalone packaging previously replaced traced `@libsql` namespace directories and missed dynamically imported client dependencies. The packager preserves existing traced children, adds missing installed packages and supplements `promise-limit`, `js-base64`, `ws`. Regression fixture, actual client ESM import and repeated postbuild passed.
3. Initial code image642b857 returned404 for mounted media because the default media directory depended on a source module URL embedded at build time. Public browser QA caught it; root immediately restored the previous app image and verified video200/readiness. Commit5b81a19 resolves the directory from runtime app-root cwd, preserving preview-store guards and site-scoped delivery. Three unit cases, typecheck, ESLint and build passed. The final ARM64 preview served a1024-byte206 video range before cutover; production browser confirms video readyState4, playing, no media error.

Packaging retries encountered an incomplete ZIP extraction, a missing explicit verifier file and occupied preview port. These were corrected in the new release/own preview only. The final successful image build, preflight, gates and cutover are recorded below. No failed build or HTTP200 alone is used as release evidence.

Independent Codex reviews: `final-codex-review.md`, `production-supplemental-codex-review.md`, `production-pathname-codex-review.md`, `production-final-packaging-codex-review.md`, `production-media-codex-review.md`. All P1/P2/P3 findings from earlier passes were resolved and regression checked; final passes have no unresolved findings.

## Commands and fresh results

| Command / operation | Result and evidence |
| --- | --- |
| Focused Vitest original follow-ups and packaging | 50 passed, exit0; `production-unit-final.log` |
| Namespaced campaign PostgreSQL integration | pass, exit0; `production-namespaced-slug-final-pg.log` |
| `pnpm run test:unit -- tests/unit/localPreviewMedia.unit.spec.ts` | 3 passed, exit0 |
| `pnpm exec tsc --noEmit` / scoped ESLint | exit0; `candidate/production-media-typecheck.log`, `candidate/production-media-eslint.log` |
| `pnpm run build --webpack` | exit0 including postbuild; `candidate/production-media-build.log` |
| `deploy/oracle/package-release.ps1` | exit0,38.8MB, no public/media; `production-media-package.log` |
| ARM64 `docker buildx build` operations image | exit0; `production-media-ops-build.log` |
| VPS standalone Docker build and operations load | exit0, Sharp ARM64 runtime probe passes; `production-media-runtime-build-4.log` |
| Encrypted dump + disposable PostgreSQL restore | exit0; `production-media-backup.log` |
| Operations migration/status and dry-run | exit0,28/28 and noop; `production-media-migrate.log`, `production-media-preflight.log` |
| `python3 production-media-gates.py` | exit0; `production-media-gates-2.log`, immutable gate marker on VPS |
| `bash production-media-cutover.sh` | exit0; `production-media-cutover-2.log` |
| `node production-browser-qa.mjs` | 8 browser checks pass, empty console/errors; `production-browser-qa-final.log`, `production-browser-qa.json` |
| Actual CTA click after scrolling into view | correct contact URL and form found; `production-cta-click.json` |
| Final runtime/image/readiness | exit0; `production-final-state.log` |

Browser evidence includes `production-campaign-{1440,390}.png` and `production-wingsplus-{1440,390}.png`. Lazy images outside the viewport can remain placeholders in full-page screenshots; description text/newline checks use live browser DOM and computed styles. Internal card image frames extend into clipped decoration; the text and document do not overflow. Public caption control is another site's medium hero; same-media default caption behavior is independently covered by the candidate component/browser fixture, and production media hashes prove caption data retained.

## Tracking and limits

Harness:3 stories implemented with fresh evidence. Plane mapping remains US005→Core/E02, US081→WingsGo/E07, US088→Core/E09. Parent and4 new follow-up tasks move to **Đã bàn giao / Full**; follow-up start2026-11-02, delivery2026-11-03. Earlier child task dates/states and historical delivery evidence are preserved. Preview expects3 stories/17 tasks. API verification is recorded in `plane-production-verify.json`; sync logs are `plane-production-preview.log` and `plane-production-sync.log`.

Rollback instructions and protected journal usage are in `CONTENT-RUNBOOK.md`. No production content rollback or whole-database restore was performed. No real telephone/Zalo call, lead submission, physical device or Safari/iOS verification. Application startup must retain app-root cwd (`WORKDIR /app`).


Final Plane result: preview3stories/17children; sync patched20/missing0. API independently verifies3correct Epic parents,17children,zero missing child dates/zero generic criterion titles,all owners,4new start2026-11-02/target2026-11-03 and delivered states; historical child dates/states unchanged. Parent starts retain original story dates and targets reflect delivery2026-11-03. Plane plan lacks Initiatives; project/Epic/US sync succeeded and archived projects were left unchanged. Final sync log: plane-production-sync-final.log.
