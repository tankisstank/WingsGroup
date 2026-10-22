# CMS departure SAVE crash — 22 October 2026

## Reproduction and cause

Authenticated browser reproduction on TourProduct 161, live preview enabled,
at 2026-10-22T08:29:03Z: edit departure 311 (25 November 2026), leave its
values unchanged, select **Lưu lịch khởi hành**. The request succeeds, then
the CMS shows **This page couldn’t load**. Console reports
`TypeError: Cannot read properties of undefined (reading 'id')` in the
relationship input's document update handler. Reload restores the editor;
departure 311 is still present as a draft at 20,590,000 VND. No publication
was performed during diagnosis.

The custom departure refresh callback emits a Payload document event without
`doc`. The installed Payload 3.84.1 Relationship/Input.js reads
`mostRecentUpdate.doc.id` before checking the event collection. Readiness
actions also emit this malformed event. TypeScript permits optional `doc`,
and the old mocks asserted that same incomplete event, so earlier tests did
not detect the runtime consumer requirement.

Before-fix browser screenshot: `save-crash-before.jpg`.

## Fix and scope

- Refresh the owning `tour-products` document after a successful departure
  save or delete, supplying the complete current document and canonical ID.
- Supply the same document contract after successful readiness actions.
  Missing/mismatched identity is rejected; numeric and string representations
  of the same route ID are accepted.
- Preserve existing stale response guards, error handling, readiness reload,
  locale and site scopes. LivePreview still receives the document event and
  performs its server refresh. No collection, access, pricing or schema changes.
- Update the two preview refresh component suites to require `doc.id`,
  preserved title/site, matching collection/ID, and no events on failed/stale
  mutations or invalid identity.

The product event deliberately targets the owning preview rather than a
deleted departure. A deleted document must not be represented as a newly
updated selectable relationship option.

## Verification and release state

- `pnpm exec tsc --noEmit`: exit 0 after source correction.
- `pnpm run test:component`: 53 files, 293 tests passed at 15:39 +07.
  AGY subsequently added identity boundary cases; root reran both affected
  suites at 15:45 +07, 2 files / 15 tests passed, exit 0.
- `pnpm run build` and postbuild: exit 0 for the final application source;
  BUILD_ID `J8S1JEJCCJN96WuCFCEcW`.
- Final TypeScript and scoped ESLint after AGY edits: exit 0, no lint warnings.
- `git diff --check`: exit 0.
- `deploy/oracle/package-release.ps1`: exit 0; 111,503,449 bytes,
  SHA256 `794006c41d1a07988d1cc62c7f1002107a7856f0a2fcc650a31d2f4ad4ac0d8a`.
  Archive inventory: 17,209 entries, no public/media or environment files.
- Plane preview/sync scoped to US-083: exit 0, `patchedCount: 1`,
  `missingCount: 0`; mapped to WingsGo / E07. Existing delivery status is
  retained for prior released scope; this incident follow-up is unreleased.

Initial independent Codex release review attempts failed. Calls through
`codext exec`/`codex exec` returned revoked OAuth, invalid configured fallback
API key, or `Selected model is at capacity`. A retry after the user's login
confirmation still returned capacity at 08:42 UTC. A subsequent call launched
from idle Herdr pane `wP:pA` completed successfully and approved commit
`b63181c`, with no confirmed P1/P2/P3 findings. Report: `codex-review.md`.
Reviewer independently ran 15/15 component cases and executed the installed
Relationship handler/label reducer and LivePreview iframe/popup event effects,
including the original missing-doc failure and mismatching relationships.
The gate is now passed; production browser verification remains pending.

Review limits: server authorization was not retested; code changes do not
modify server authorization. Same-ID site reassignment was not exercised;
the existing CMS fixes the site for an existing tour, and the patch keeps
that rule. These limits are not represented as verified cases.

Before cutover, production is `/home/ubuntu/wings-travel/releases/release-66aaaf424fad`,
app image `sha256:cc2a212cedf0a0505df539062f3b293298f992098457b39882016435e894cc36`.
Readiness reports database/Redis up and lead delivery configured; no restart
or OOM was observed. VPS had 16 GB free. No migration or global cache flush
is needed. On eventual release, tag the candidate as both immutable release
and `wingstravel-app:latest`, verify the running image digest, retain the
previous image/current symlink for rollback, and repeat authenticated SAVE
with live preview enabled before declaring completion.

## Production result

Activated `release-b63181ce14db` at **2026-10-22T08:59:21Z** (15:59:21 +07).
The running image is
`sha256:0b695486ddf16fad24fedec0a65a7ae72d7620bf3f5f2d140db2f14e573ea338`,
matching the immutable candidate, and BUILD_ID matches the local package.
Operations image was built from a clean `git archive` of commit `b63181c`;
its revision label was checked before use. All registered migrations report
`Ran: Yes`; no migration command that writes schema was run.

Fresh encrypted backup: 4,748,214 bytes, SHA256
`06f00d57b7c62aa313a4d80ab69b4f46332b1439881a9f4aa3d5ab198adcac84`,
under `shared/backups/release-b63181ce14db/`. Full decryption and archive
decode via `pg_restore --file=/dev/null` passed. This is archive validation,
not a database restore drill. Rollback tag `wingstravel-app:rollback-b63181ce14db`
pins the previous image `cc2a212cedf0...`; previous release remains available.

The first candidate native probe imported the general `@libsql/client`
entrypoint and failed on an untraced WebSocket dependency, `promise-limit`.
The standalone native check was corrected to use the packaged `libsql`
driver directly: actual in-memory CREATE/INSERT/SELECT and exact row assertion
passed, as did sharp/libvips PNG generation (90 bytes). This did not alter
application dependencies or claim the general WebSocket entrypoint works.
The candidate was healthy before promotion, then removed after live checks.

Authenticated post-cutover browser check on TourProduct 161:

- Reloaded the editor to load the new application assets.
- Confirmed live preview iframe is enabled, edited departure 311 without
  changing its existing values, then clicked **Lưu lịch khởi hành**.
- Received **Đã lưu bản nháp lịch khởi hành**. The form closed, all four
  departures remain listed, and no crash screen or new console errors occurred.
- Screenshot: `save-success.jpg`. Draft 311 remains 20,590,000 VND.
- Preview in a separate tab renders the saved-draft banner, correct tour
  heading, all four departures including 311, and the same price.

Final readiness at 09:05 UTC: database/Redis up, delivery configured;
running app has zero restarts and OOM false. Only the app was recreated;
PostgreSQL/Redis were not restarted and no global cache flush occurred.
Commands/logs are under `deploy/oracle/cms-save-b63181c-20261022/`.
Harness trace **308** records a partial outcome because embedded preview is
not browser-passed. Plane sync of US-083 under WingsGo/E07 completed with
`patchedCount: 1`, `missingCount: 0`; there are no manifest child tasks for
this item, so no generic child titles are introduced.

## Remaining limits

The embedded preview remains blank (`about:blank`) even after reinitializing
its view; the separate preview window works. WingsGo public responses have
`X-Frame-Options: SAMEORIGIN`, consistent with blocking cross-origin embedding
from WingsGroup. This is an existing header policy, unchanged by this hotfix;
the exact browser block message was not captured, so the header explanation
is an inference. No broader framing/security policy was relaxed. Embedded
preview rendering and automatic refresh are **not** marked as browser-passed.

Separate duplicate `inventory_identity` errors return HTTP 400 on departure
creation. This is not the reproduced client crash; uniqueness remains enabled.
Main tour SAVE, creation/deletion and publication were not browser-exercised
against this patch. Component tests cover those custom event emitters. No
production business values were changed; browser checks created same-content
draft versions only, and did not publish.
