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

Before-fix browser screenshot:
`app/artifacts/cms-save-crash-20261022/before-fix.jpg`.

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

Independent Codex release review has **not completed**. Attempts through
`codext exec`/`codex exec` returned revoked OAuth, invalid configured fallback
API key, or `Selected model is at capacity`. A retry after the user's login
confirmation still returned capacity at 08:42 UTC. Failed review attempts
are not approval. Production cutover and post-fix browser SAVE verification
remain pending this mandatory repository gate.

Production remains `/home/ubuntu/wings-travel/releases/release-66aaaf424fad`,
app image `sha256:cc2a212cedf0a0505df539062f3b293298f992098457b39882016435e894cc36`.
Readiness reports database/Redis up and lead delivery configured; no restart
or OOM was observed. VPS had 16 GB free. No migration or global cache flush
is needed. On eventual release, tag the candidate as both immutable release
and `wingstravel-app:latest`, verify the running image digest, retain the
previous image/current symlink for rollback, and repeat authenticated SAVE
with live preview enabled before declaring completion.

Separate duplicate `inventory_identity` errors return HTTP 400 on departure
creation. This is not the reproduced client crash; uniqueness must remain
enabled. Main tour SAVE, creation/deletion and publication are not yet
browser-verified against this patch. No production business values were
changed; reproduction created a same-content draft version only.
