# CMS embedded preview and production lifecycle — 2026-10-22

User authorized fixing the remaining preview error and creating, publishing,
and deleting NEW production test data. Existing business records are excluded.

## Reproduction before changes

- Active production release: `b63181ce14dbedf39596aee30ec1cc76f9480c48`.
- Logged-in Edge, TourProduct 161, enable **Xem trước**.
- Embedded frame ends at `chrome-error://chromewebdata/`.
- Browser error DOM: `ERR_BLOCKED_BY_RESPONSE`, `wingsgo.vn refused to connect`.
- Separate preview tab renders the expected saved-draft tour.
- Fresh signed grant sent through the real production handoff endpoint returns
  HTTP 307. Both Next draft and handoff cookies are Secure, HttpOnly,
  SameSite=None, without Partitioned.
- Manually supplying both cookies to the destination, with CMS origin Referer,
  returns HTTP 200 and the saved-draft banner for GET and POST. It includes an
  enforced `frame-ancestors 'self' https://wingsgroup.vn` policy alongside the
  global SAMEORIGIN X-Frame-Options header. Without a valid grant, only the
  default SAMEORIGIN protection is present.

The current hypothesis is loss of preview cookies in the cross-site iframe;
the server-side signed rendering flow works when cookies arrive. This remains
a hypothesis until a fresh browser run proves the correction.

## Scope and gates

Inspect the handoff cookie writer, Next draft cookie, exit cleanup, scoped frame
authorization, and their route/security tests. Keep the signed tenant, locale,
path and expiry validation. No schema changes or broad frame-policy exception.

Independent Codex consultation attempts initially stopped with provider model
capacity errors. No deployment was performed on those failed reviews.

The subsequent design review completed and accepted the proposed approach,
conditional on actual browser proof. Its contract is saved in
`codex-design-review.md`: partition both cookies, preserve Next's exact bypass
value, use a fresh grant name without legacy fallback, match partitioned exit
and published-mode cleanup, and retain the existing framing authorization.

Implementation follows that contract through `previewCookies.ts`, the two
preview route handlers, and the shared grant cookie name. The grant cookie now
expires with its signed lifetime instead of remaining stored for five minutes.
This does not extend the authorization window. Existing preview tabs must start
a fresh handoff after the release; legacy grants are not accepted.

Focused validation: five unit files / 62 tests passed at 17:04 local time,
including real Next cookie-header serialization, wrong tenant rejection, legacy
grant rejection, scoped framing, and the ordinary security header baseline.
Scoped ESLint exited 0. Root typecheck identified runner errors and sent them
back to AGY; the preview helper's cookie-store type was narrowed to its actual
get/set requirements. Final typecheck/build remain pending.

AGY owns an isolated production lifecycle proof runner. Root reviews it before
execution; fixture names/IDs and cleanup evidence must be recorded. The runner
must not edit or delete pre-existing tour, departure, page, or media records.

Root rejected a local-Payload-only proof design: standalone operations processes
do not supply Next's request cache context, and publication can commit while
reporting a revalidation failure. The runner must call the real authenticated
production HTTP APIs so hooks/cache behavior are exercised in the app server.
Protected existing admin credentials were verified with a login request:
HTTP 200, super-admin ID 1; no credentials or tokens were printed.

## Runtime release 784f823 and remaining browser gap

Production cutover completed 2026-10-22T10:21:03Z, image
`sha256:34ebd115735c87460d8aa26fa3e01bc729d92e13c8a225f5651ba59d00b54139`,
BUILD_ID `wjFtBi0WPOJweLP-_diGO`. Fresh encrypted backup
`wingstravel-2026-10-22T10-18-50-582Z.dump.age`, 4,771,274 bytes,
SHA256 `2ed1a857b439ad2f55bb724f344deea4fcb0a0e1f8b6262756be14adb9e5c4a7`;
full age decrypt / pg_restore decode passed, not a restored database drill.
All 52 migrations applied; no schema writes. Native libsql CRUD and sharp passed.
Real candidate HTTP probe confirmed serialized Partitioned cookie attributes,
signed preview rendering, ordinary SAMEORIGIN protection, rejection of expired
and wrong-site grants, and partitioned exit cleanup. Root TypeScript, ESLint,
production build and postbuild completed with exit 0.

Fresh authenticated Edge still showed an empty/loading iframe. Separate preview
works. The initial handoff HTML submits while the iframe document is parsing;
commit `aa1ffc6` defers explicit form requestSubmit until window load and adds a
visible submit fallback. Its real HTML is executed by a JSDOM regression test,
including no early submit and a single load submission. Independent code review
found no confirmed preview-code P1/P2/P3. Browser rendering and refresh remain
unproved until the new candidate is deployed and exercised.

## Production lifecycle proof

Runner commit `ca3a7cf` uses the real authenticated CMS HTTP APIs, exact allowed
origins, site2, a unique UUID ownership marker, and finally cleanup. Credentials
stay in protected environment files and memory. Redirects are rejected for
credential-bearing requests. No new user or media record is created.

Independent review found P1 credential forwarding on redirect and P2 lost-create
response orphan risk. Both were fixed: redirect:error and nonce-scoped recovery.
A follow-up found P2 false cleanup certification when recovery fails; an explicit
failure flag now prevents cleanupVerified=true. Mock regressions cover recovery
success/failure and attempt-all cleanup after delete failure. The stale hub mock
was corrected from slug to pathname=/tour. Final root targeted tests: 31 passed;
runner/recovery 20 passed after supplying required itinerary fixture. Final
TypeScript exit 0. Provider capacity prevented one later follow-up review attempt;
prior independent review confirmed the recovery code fix, and the test gap was
subsequently fixed and executed by root.

First live attempt at10:43:53Z failed before create: Payload validation requires
at least one itineraryDays row. Server log identified that exact missing field;
no record was created, recovery found no owned data, public404. Fixture corrected
to include a required dayNumber/title/summary row; no application validation was
relaxed.

Successful production run10:44:47Z–10:45:58Z:

- Product165 created draft, edited price18,900,000VND.
- Departure336 created draft, date2026-12-21, QA Airways, verified freshness.
- Wrapper358 provisioned through authoring API under existing hub208.
- Authoring publication committed=true, refreshFailed=false.
- Unauthenticated public tour returned200 with exact QA marker. Edge desktop
  and mobile visibly rendered the tour, price and departure; no captured console
  errors. Mobile document width375, scrollWidth375; temporary viewport reset.
- Finally deleted departure336, wrapper358, product165 through CMS DELETE hooks.
- All three authenticated GETs404 and public URL404. Result ok=true,
  cleanupVerified=true. Root repeated independent authenticated checks10:47:39Z.
- Existing business tour161 updatedAt stayed2026-10-21T14:11:11.494Z.

URL was `/tour/cms-qa-20261022-proof1744`, prominently marked
`QA ONLY / KHÔNG ĐẶT TOUR`; it existed publicly for roughly one minute.
Screenshots: production-qa-published.jpg, production-qa-mobile.jpg,
production-qa-deleted.jpg. Sanitized dry/live/postcheck logs are preserved in
this evidence directory. This proves API lifecycle and public rendering; it does
not claim browser form SAVE/embedded preview refresh passed for this delta.

Independent Codex follow-up subsequently succeeded: both remaining regression
gaps resolved, 2 files /20 tests pass; report `codex-final-disposition.md`.
Root final focused run: 7 files /82 tests pass, TypeScript exit0. These tests
cover preview/handoff, security perimeter, proxy, lifecycle and recovery.

## Final release aa1ffc6 and fresh production proof

Cutover2026-10-22T10:54:08Z (17:54:08+07), release-aa1ffc6,
app commit aa1ffc65849605f01c39b751089ac3fc23c3831e,
BUILD_ID Z0bapBD9sE-rlAWihkPzi, app image
sha256:d0bf3180bd914fcdf4ff13f9d3f9ce51816db81e218e9d6d49d147b74e8b2dd5.
Required parallel CMS search commit58633ae is an ancestor. Operations image
sha256:bfdf038f3525cbd695430a26b378decfba72afb63be9fb25b0a3858a5929d414
was built from the exact application candidate. Package111,508,834bytes,
SHA256417f0476ed665b502351c0d2f4e08072b173b74af42616e4a700cfb60e2a98f1,
no media/env. Root checked real candidate signed preview responses again.

Fresh backup wingstravel-2026-10-22T10-52-26-610Z.dump.age,
4,784,393bytes, SHA256d15b30f555d805b3c453ce465263cd6f4554c55fce74027ed821b0efec4a01d7.
Full decrypt/decode passed,52/52 migrations applied, no schema migration.
Rollback tag wingstravel-app:rollback-aa1ffc6 pins previous784f823 image.
Only app recreated; PostgreSQL/Redis retained. Candidate removed after final
verification; live readiness database/Redis up, delivery configured, restart0.

Fresh final-image lifecycle run10:59:34Z–11:00:45Z returnedok=true and
cleanupVerified=true. Product166, departure337, wrapper359 created, edited,
provisioned, published(committed=true,refreshFailed=false), publicly rendered,
and deleted via real HTTP APIs. During the60second hold root opened product166
in the production CMS, enabled/opened embedded saved-draft preview, edited the
owned departure price18,900,000→18,800,000, clicked Lưu lịch khởi hành, and saw:

> Đã lưu bản nháp lịch khởi hành. Hãy chọn lịch và xuất bản để cập nhật website.

The table showed18,800,000, draft, Cần xác minh. No CMS crash and no captured
browser errors. Clearing commercial verification after a price change was
preserved. This UI edit was intentionally not published; all owned data was then
deleted by the runner. API absence and public404 were verified again. Independent
postcheck11:02:01Z confirmed all six fixture IDs from both runs absent and
business tour161 updatedAt unchanged. No pre-existing business/media record was
edited or deleted in these two runs.

## Explicit remaining limitations

The iframe now renders WingsGo and the saved-draft banner after clicking the
visible Mở bản xem trước fallback. Document width/scrollWidth737/737, no overflow.
Automatic form transition did not complete in this Edge session. Actual CMS
initializer headers were checked: enforced CSP only permits the expected form
origins; inline scripts are not forbidden by that policy. Do not claim the new
load handler fixed automatic startup.

After the owned departure SAVE, the CMS table correctly changed to18.8M, but the
already-open preview still displayed18.9M. Therefore automatic preview refresh
is NOT accepted. Installed Payload LivePreviewProvider only accepts ready events
whose origin matches its configured initializer URL(CMS), whereas the redirected
iframe has the WingsGo origin; its standard save messages also target that CMS
URL. The child RefreshRouteOnSave currently uses the public child URL for its
serverURL. This is a concrete cross-origin protocol mismatch to address in a
separately reviewed follow-up; source evidence was inspected, but no broad
messaging or origin exception was deployed here.

Outcome: production SAVE crash regression and NEW-data lifecycle passed;
embedded rendering has a manual fallback; automatic startup/refresh remains
partial. No full repository integration/E2E rerun, production lead/email sending,
or restored-database drill was performed. Screenshots and sanitized logs are
kept alongside this audit. Browser temporary credentials were removed immediately
after normal same-service sign-in; no secret was printed or committed.

## Follow-up implementation: authenticated initializer refresh (e2ac6e4)

The remaining automatic-start/refresh defects above were investigated rather
than accepted as complete. Shared useTourPreviewRefresh reuses Payload's
setURL to re-enter the existing same-origin authenticated /next/preview
initializer after a successful departure save/delete or readiness action.
The URL must match origin, endpoint, collection, current tour ID and locale;
credentials in the URL are rejected. A non-secret refresh nonce causes a new
navigation and scoped short-lived grant. No new postMessage origin exception,
access bypass, schema change, or token TTL extension was introduced.

The initializer defers requestSubmit to the task after window load, retaining
the visible POST form fallback. Actual generated HTML is executed in JSDOM to
verify no early submit, a single scheduled task and submission of that form.

Independent Codex found P2: an async save could retain an obsolete preview
callback and navigate after preview was disabled or replaced. The hook now
reads current context at invocation and rejects changed document/locale.
Four React rerender regressions use fresh provider objects and retain the old
callback. Follow-up review resolved the P2, no further confirmed P1/P2/P3 in
scope. Reports: codex-preview-refresh-review.md and
codex-preview-refresh-disposition.md.

Application commit: e2ac6e4ca05ac05c40764a403a721f5f492ce5f2. Final build/postbuild
exited0. TypeScript and scoped ESLint exited0. Root preview/lifecycle unit run:
5files44passed; reviewer 5component files35passed, initializer11passed.
Earlier full component run54files306passed preceded the final four race cases;
those new cases and related suites were rerun successfully after the fix.
Real browser automatic start/refresh still requires verification on this exact
release; none is claimed by the above source/test evidence alone.

## e2ac6e4 production proof and remaining startup defect

Cutover completed2026-10-22T11:25:22Z; image
sha256:cde12c8cbe430dfd3d17a3b4ce5bb48dedfd2d326e25f95a07847d09e451fa33,
BUILD_ID Oht9mBBf0vw_9uKGEyZbb. Immutable ops image
sha256:3f4a3afb3dc87980125900b2d2acf39ace5cd2f7088b07cac3ede57d8090c275.
Package111514352bytes/SHA256
ca6099e448da791b53379478c92a02c2fc00334d0a93daf86e1a0c2695e61127;
17209entries, no public/media or env. Backup4784499bytes, SHA256
1fa3f1fc9b0c0cc70c8f17b8ea817f3e3f4793ba7639848016e20e3c7bb20a36,
full age/pg_restore decode passed. All52migrations already applied; no schema
writes. ARM64 libsql memory CRUD/sharp90bytes and signed HTTP handoff passed;
expired/foreign grants403, ordinary framing protected, partitioned exit cleared.
Rollback pins previous aa1ffc6 image; database/Redis not restarted.

Third real lifecycle run on this release, slug cms-qa-20261022-proof1825:
product167/departure338/wrapper360 created, edited, provisioned, published and
read publicly, then all deleted by normal HTTP API. Runner exited0 with
cleanupVerified:true. Public read11:30:03Z, cleanup11:31:05-11:31:07Z. Separate
11:35:18Z authenticated check confirms ALL9 QA records from three runs absent,
Tour161 updatedAt still2026-10-21T14:11:11.494Z.

Browser fresh CMS161 still stalls at initializer readyState complete with the
expected inline load-listener script. Manual fallback renders WingsGo. Do not
mark automatic startup fixed. On owned QA167, the edit attempt was stopped by
validation requiring an expiry after changing price/reconfirming. Browser input
DOM showed a future value but the React form had not accepted it. No successful
SAVE or fresh-price-preview claim is made for this third browser run. Existing
successfully saved QA166 proof remains valid. Do not weaken validation to make
automation pass. Third-run records were deleted by finally cleanup.

## Parser-independent handoff follow-up0701404

Top-level zero-delay timer replaces the load-event subscription and calls native
form.submit on the already parsed hidden-field form. Nonsecret data-handoff-state
scheduled/submitted exposes whether inline JS actually ran during browser QA.
Fallback and all origin/tenant/locale/TTL/POST protections remain unchanged.
Independent Codex audit: no confirmed P1/P2/P3; actualHTML JSDOM11/11 passed.
Root preview/lifecycle unit44/44, scoped lint0; final build/postbuild0.
Application commit0701404b550f65447fb5b21692c7ec44fa6f1bb5,
BUILD_ID Q-SeLifnoALhOdnPP-IwB. Browser proof is still pending.

## Production0701404: verified SAVE/CRUD, automatic navigation still partial

Cutover2026-10-22T11:44:18Z. Active release `/home/ubuntu/wings-travel/releases/release-0701404`,
image `sha256:b2625ab337b68f47029d9310e616efcc1ba9cd8680f5c8c5286eeb98b44f5458`,
BUILD_ID `Q-SeLifnoALhOdnPP-IwB`. Exact-SHA immutable ARM64 ops image
`sha256:31181496b7065dbfee7e58df805a622dbb74f302f28decb9e4c7480a311771a7`.
Archive111515472bytes/SHA256 `4c6c84ba455293a8c09f291e9103c896c5b585130075c2a34c513238176be325`,
17209entries, no media/env. Fresh encrypted backup4784633bytes/SHA256
`a7cf1959e188ab4676d442927d0c7dde816dac32ebca1f359a9eb02d9f335f67`,
full decrypt/pg_restore decode passed (not a restored-database drill).
All52migrations applied; no schema writes. Native libsql memory CRUD and sharp90bytes passed.
Signed HTTP candidate probe passed draft cookie serialization/render, expired/foreign403,
ordinary frame protection and partitioned exit-cookie clearing. Rollback retains prior e2ac6e4 image.
No database/Redis restart or global cache flush. Ancestor58633ae search change remains included.

Fourth real HTTP lifecycle: `cms-qa-20261022-proof1845`, product168/departure339/wrapper361.
Created, edited, provisioned, published (`committed:true`), public200 with exact QA marker,
then all three records deleted; cleanup verify finished2026-10-22T11:50:19.621Z,
`ok:true`, `cleanupVerified:true`, runner command exit0.

Fifth lifecycle: `cms-qa-20261022-proof1900`, product169/departure340/wrapper362.
Created11:54:40Z, publish11:54:46Z, public200/exact marker, cleanup11:55:47-11:55:48Z.
Runner JSON `ok:true`, `cleanupVerified:true`; all three API records and public route absent.
The SSH wrapper subsequently exited1 due to an extra CR-only shell line, after the successful
JSON and cleanup. This is recorded rather than claiming that command exited0. The local
wrapper was normalized to LF; no additional production writes were needed for that correction.

Actual Edge UI on owned169: first same-content departure SAVE succeeded, then changing airline
to `QA Airways SAVE 1900` and SAVE succeeded. Both showed `Đã lưu bản nháp lịch khởi hành`;
no CMS crash and captured error/warn logs empty. Hook changed initializer `refresh` twice,
proving the retained/current context path executes on production. Changing commercial metadata
correctly cleared verification. No validation weakening or publish of the browser draft.
Manual `Mở bản xem trước` rendered the saved draft with the new airline in hero, rail and
schedule. Screenshot `cms-070-preview-updated-manual.jpg`; automatic pending screenshot
`cms-070-save-success-preview-pending.jpg`.

Remaining defect: fresh initializer and SAVE refresh stop with `data-handoff-state=submitted`.
Thus the inline timer runs, but automatic cross-domain form navigation is NOT browser-passed.
Manual fallback works. Do not claim a full automatic-preview fix based on unit/build/HTTP tests.
A plain local sandboxed cross-origin dummy POST reproduction reaches `/done`; React-parent
reproduction is being used to narrow the difference. No security policy relaxed to mask this.

Independent authenticated postcheck at2026-10-22T11:57:58.487Z exited0:
all15 QA records from all five runs absent (products165..169, departures336..340,
wrappers358..362), business Tour161 updatedAt unchanged at2026-10-21T14:11:11.494Z.
Production image checked running/restart0, disk4.6GB available. Lifecycle/postcheck/cutover
logs are retained alongside this audit; no secrets are copied into proof.

## Final operational reconciliation

Root Edge local control `/` and React-parent `/react` both reached `Done / Handoff submitted`.
React diagnostic showed onLoad1/render2/loadedURL `/init`/isLoadingfalse. Therefore parent React
rerender cancellation is not established as the production cause. AGY stopped only its own
local server task2464; no app source change was made from that hypothesis.
The clearer screenshot `cms-070-preview-top-after-save.jpg` shows the saved draft banner and
`Bay QA Airways SAVE 1900`; the earlier screenshot captured the CMS scrolled below the iframe
and is not sufficient visual evidence by itself. QA tabs were closed after public404 proof.
The owned ARM64 candidate container `wings-preview-0701404` was removed after immutable-image
identity verification; active app remains0701404. Backup and rollback artifacts retained.

Harness trace309 recorded outcome `partial` explicitly for automatic preview transition.
Plane scoped preview/sync-workitems exited0: patchedCount1, missingCount0.
Authenticated readback2026-10-22T12:03:29.081Z exited0 confirms WingsGo / US-083 /
parent E07, state Đã bàn giao (existing core-story state), start/target2026-10-19,
childCount0, missingDates0, genericChildren0. This does not mark the preview follow-up accepted.
Plane plan does not support Initiatives; work-item-types endpoint returns HTTP402, so Epic
parent identity/name are verified but its unavailable type API is not reported as checked.
No project structure or customer page changes; corresponding imports were unnecessary.
Full repository integration/E2E suite and restored-database drill were not rerun for this delta.

A final fresh top-level authenticated initializer for Tour161 automatically reached the WingsGo
URL and rendered the saved-draft banner on0701404. Thus automatic navigation works outside
the CMS iframe; failure remains specific to the production embedded context. This read-only
comparison changed no business data and does not resolve the embedded finding.
