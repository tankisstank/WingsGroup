# Validation

## Proof strategy

Proof must show that the operator surface is truthful as well as visually
usable: failures remain failures, role gates are presentation only, real routes
remain reachable, and no mobile layout overflows. Test accounts and fixtures
must be sanitized; tests and screenshots must not emit credentials, API tokens,
or lead contents.

## Test matrix

| Layer | Required proof |
| --- | --- |
| Static | TypeScript and lint confirm the updated custom views and styles build without generated-file edits. |
| Component | Typed Console request-state rendering covers loading, successful-empty, no-access, failure/unavailable, and per-panel retry without a `0` fallback. |
| Integration | Existing Payload access rules reject disallowed collection/global operations for editor and site-manager while allowing their documented scope. |
| E2E routes | `/admin`, `/admin/console`, `/admin/page-wizard`, `/admin/site-review`, and `/admin/theme` render without an unhandled error. The 24 operational entries resolve to their real Payload custom, collection, or global surface. |
| E2E roles | Editor sees no import/export/advanced shortcuts; site-manager sees only assigned-site context and permitted data links; super-admin sees advanced links. |
| E2E actions | `Tạo trang nháp` reaches Page Wizard; review and lead actions reach valid Payload routes; Search uses the actual search collection. |
| E2E accessibility | Skip link and visible focus work; each new dialog has Escape close, focus restoration, and Tab trapping; status/error messages are announced correctly. |
| E2E responsive | At 360, 390, 430, 600, 768, 820, 1024, 1366, 1440, and 1920px there is no horizontal overflow. Mobile exposes only triage navigation; tablet keeps labelled sidebar targets at least 44px. |
| E2E themes | URL and localStorage bootstrap retain both `finexy-soft` and `ats-compact`. |
| Manual visual | Desktop validates queue-first plus context rail; mobile validates triage-first order, no clipping, non-gradient panels, and meaningful focus state. |

## Required fixtures

- Super-admin with access to at least two sites.
- Site-manager assigned to exactly one fixture site.
- Editor assigned to an allowed content site.
- One site with known locale configuration and one scoped content record.
- Sanitized recent page, form-submission, import/export, and scheduled/draft
  data only where the metric definition has been approved.
- Mocked transport failures and 401/403 responses for Console state tests; no
  production lead payloads.

## Commands

Run from `app/` after the relevant implementation. Do not mark a command as
passed until it has actually completed in the target environment.

```powershell
pnpm lint
pnpm test:component
pnpm test:int
pnpm test:e2e
```

If a component import path was added or changed:

```powershell
pnpm payload generate:importmap
```

Use `agent-browser` for the manual desktop/mobile verification. Record the
viewport, route, theme, role fixture, and sanitized screenshot path in
implementation evidence.

## Completion evidence

The implementation record must include:

- the approved definitions for every displayed metric and context selector;
- results for all mandatory commands and any documented environment blockers;
- E2E assertions matching this story's route, role, state, keyboard, responsive
  and theme cases;
- manual screenshots at representative desktop, tablet, and mobile widths;
- confirmation that generated Payload files and public-site tokens were not
  modified manually; and
- explicit follow-on stories or accepted decisions for every deferred prototype
  behaviour.

## Implementation record — 2026-08-05

### Contract decisions implemented

- Dashboard and Console are aggregate read models over all sites and locales
  visible to the authenticated Payload session.
- `Trang nháp` and `Bài viết nháp` use `_status=draft`.
- `Tổng lead` is the accessible `form-submissions` count; `Lead gần đây` sorts
  accessible submissions by `createdAt` descending and makes no new/unread or
  time-window claim.
- Site Review remains read-only and Page Wizard retains default locale `vi`.
- Dashboard metrics share the same names/query contract as Console; errors,
  no-access, loading, unavailable, empty, and ready states remain distinct.
- Prototype-only approval/publish, comments, assignment, diff, rollback,
  schedule, lead retry, invitation, TourProduct readiness, media dependency,
  and import dry-run/recovery behaviours remain excluded. The authority map is
  recorded in `prototype-implementation-guide.md`.

### Automated proof

| Check | Result |
| --- | --- |
| `pnpm exec tsc --noEmit` | Pass. |
| Focused ESLint for changed TypeScript/JavaScript | Pass with no errors. SCSS is outside the configured ESLint matcher. |
| Focused lifecycle unit regression | New PostgreSQL/standalone seed lifecycle tests pass, 2/2. |
| `pnpm test:unit` | 82/83 files and 728/729 tests pass. The unrelated `wingsSideGroupCommercePayloadAdapter` preimage-drift case evaluates its expired-plan guard first and expects `Preimage conflict`; this time-sensitive existing failure is outside US-059. |
| `pnpm test:component` | Pass, 16 files and 97/97 tests. |
| `pnpm test:int` | Pass. Configured opt-in suites remain skipped by their existing gates. |
| `pnpm lint` | Pass with zero errors and 150 existing repository warnings. |
| `pnpm build` | Pass, including static generation and postbuild. |
| SQLite Admin E2E | Pass, 19/19 in 3.2 minutes. |
| Disposable PostgreSQL Admin E2E | Pass, 19/19 in 3.1 minutes after all committed migrations and deterministic fixtures. Disposable container cleanup completed. |

The Admin E2E proof covers the 24 operational routes, valid CTA destinations,
role presentation plus underlying API rejection, Site Review read-only scope,
Page Wizard locale behaviour, isolated Console transport/retry, both theme
bootstrap keys, focus/skip behaviour, ten responsive widths, no horizontal
overflow, and 44px operational targets.

A broader public frontend/hero regression run reached the browser suite after
the shared fixture lifecycle change, proving the reusable seed no longer
destroys the cached Payload instance. It exposed existing public-content
expectation drift in six WingSide assertions and was stopped during the long
broken-link case; it is not counted as US-059 acceptance proof.

### Manual visual and accessibility proof

Sanitized super-admin fixture; no credential, token, or lead payload appears in
the captured evidence:

- `evidence/dashboard-desktop-light.png` — 1440px, `finexy-soft`, `/admin`.
- `evidence/console-desktop-light.png` — 1440px, `finexy-soft`, `/admin/console`.
- `evidence/dashboard-tablet-dark.png` — 820px, `ats-compact`, `/admin`.
- `evidence/console-tablet-dark.png` — 820px, `ats-compact`, `/admin/console`.
- `evidence/dashboard-mobile-light.png` — 390px, `finexy-soft`, `/admin`.
- `evidence/console-mobile-dark.png` — 390px, `ats-compact`, `/admin/console`.

`agent-browser` confirmed no horizontal overflow at the representative widths.
Console produced zero axe-core WCAG A/AA violations after contrast correction.
Dashboard findings outside the US-owned widget were limited to existing Payload
locale/select controls; US-owned surfaces were corrected for contrast and target
size.

### Artifact and generated-file integrity

- Restored prototype SHA-256:
  `5a41fb2e77e6634d33ef19ae31787735b17b7b99b689ef0e825138ca727e3df9`.
- Prototype size: 93,537 bytes; all CSS/JavaScript is inline and there is no
  external asset bundle.
- No schema, migration, API contract, Payload generated layout/import map, or
  public-site design token was manually changed for US-059.

## Follow-up validation — 2026-08-06

### Corrective scope and proof

- The operator locale is now request-first: `proxy.ts` makes one same-URL
  redirect only for `/admin` routes missing `payload-lng=vi`, then Payload
  renders its native UI using the supported cookie. This does not alter
  localized page/post data or REST locale parameters.
- The login shell now has a real `Đăng nhập CMS` H1 and the fallback landmark
  bootstrap treats the native `.login` shell as focusable main content when
  Payload did not render a native main landmark.
- Theme Manager now retains independently successful resource data, visibly
  distinguishes no-access/error from empty data, drops stale site-context
  responses, guards dirty site/route changes, and names the impact chain
  `toàn hệ → site → page` before save.
- Hero guidance and Theme Manager operator copy have been normalized to
  Vietnamese; native Payload labels resolve from the request locale rather than
  client-side DOM mutation.

| Check | Result |
| --- | --- |
| `pnpm exec tsc --noEmit` | Pass. |
| Focused ESLint for changed source/tests | Pass. |
| `tests/unit/proxy.unit.spec.ts` | Pass, 11/11; includes one-time admin locale-cookie redirect. |
| `pnpm test:component` | Pass, 16 files and 98/98 tests. |
| `pnpm test:int` | Pass; existing opt-in suite remains skipped by its configured gate. |
| `pnpm lint` | Pass. |
| `pnpm build` | Pass, including postbuild standalone preparation. |
| PostgreSQL Admin E2E | Pass, 19/19 via `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/google-chrome pnpm test:e2e -- tests/e2e/admin.e2e.spec.ts`; the disposable container and fixture database were removed. |

### Live audit endpoint recovery — 2026-08-06

The refused connection was caused by this audit host having no process bound to
its own Tailscale address (`100.89.49.21:3000`), not by an application defect.
A disposable PostgreSQL 16 fixture was migrated and seeded locally; the app
was then started at `0.0.0.0:3000` with an audit-only Payload secret. Both
`/api/health/live` and `agent-browser` navigation to `/admin/login` returned
successfully through the approved Tailscale URL.

The role-scoped Admin E2E suite then passed **19/19** directly against that
URL with the isolated PostgreSQL database and system Chrome. It covered the
super-admin dashboard and the site-manager/editor same-site scope checks:
read-only settings access, forbidden editor settings creation, editor console
visibility, and manager assigned-scope shortcuts. The test's three fixture
users (`dev@payloadcms.com`, `phase1-site-manager@example.com`, and
`phase1-editor@example.com`) were verified absent after cleanup. Finally, the
exact audit app process and `wingstravel-us059-audit-postgres` container were
stopped and removed, leaving no business or production data behind.

The temporary reachability blocker is closed. After a subsequent external
access report, the same isolated PostgreSQL fixture was re-provisioned and is
now intentionally kept online as the transient user service
`wingstravel-us059-audit`, bound to `0.0.0.0:3000`. Its health endpoint returns
HTTP 200 through `tailscale0`, and `/admin/login` returns the expected one-time
locale-cookie redirect. It remains a non-production audit runtime. The story
remains in progress for its remaining acceptance evidence.

### Re-review remediation — 2026-08-06

The two approved medium findings are closed without expanding into the three
separately tracked high-risk items (sidebar affordance, locale context, and
Tour Product site backfill):

- Dashboard now has exactly one `Bảng điều hành CMS` H1. The metric widget's
  H2 is `Việc cần xử lý`, and the operational banner is a `role=status`
  paragraph rather than an H4.
- Page Wizard renders every governed layout preset and its preview sections in
  Vietnamese while retaining the technical English name in parentheses. Theme
  tokens, theme presets, and hero presentation labels follow the same pattern;
  stored keys and API values are unchanged.

| Check | Result |
| --- | --- |
| `pnpm exec tsc --noEmit` | Pass. |
| `pnpm lint` | Pass. |
| `pnpm test:component` | Pass, 16 files and 98/98 tests. |
| `pnpm test:int` | Pass; one configured opt-in suite remains skipped. |
| `pnpm build` | Pass, including postbuild standalone preparation. |
| Direct PostgreSQL Admin E2E at `100.89.49.21:3000` | Pass, 19/19. It asserts Page Wizard draft persistence for title, site, pathname, preset and description; removes its fixture page; and checks the 360, 390, 430, 600, 768, 820, 1024, 1366, 1440 and 1920px responsive matrix for overflow. |

### Production CMS promotion — 2026-08-07

The audited CMS changes were promoted to the production VPS as immutable source
release `e11dc84f89a677dc11aff9907c777062dd5f7375` and image
`sha256:629d8d46c8cce8a3ff09363eebf9528980b74be215c8a336bce7e35f0843cd09`.
The prior source release `627135e239e6dd13848f41330dddb177e99d2df7` remains
the single rollback release.

- A pre-migration PostgreSQL backup was written and checksum-verified before
  promotion. Migration `20260806_090000_backfill_wingsgo_legacy_tour_sites`
  completed in batch 15; the three approved legacy Tour Product slugs now have
  `site_id=2` (WingsGo).
- The production database had the historical Payload `dev` batch `-1` marker.
  The migration command required an explicit confirmation; code inspection
  confirmed that it only ignores that marker in memory, then executes the
  missing transaction. No destructive reset was run.
- Canary and post-promotion checks passed: `/api/health/live` 200,
  `/api/health/ready` 200, and `/admin/login` 307. Readiness is intentionally
  `degraded` with `leadDelivery: disabled`, accepted by the release owner;
  public lead submission remains fail-closed (503) while delivery is disabled.
- The anonymous Tour Product API check found 10 returned records with
  `invalid_scope=0` (every returned record is published and has a Site).
  The VPS retains only the current CMS release and the immediate rollback;
  16 GB disk space remained after cleanup.

## Production re-check — 2026-09-25

- Authenticated read-only review used the saved production `site-manager` profile.
  `/admin`, `/admin/console`, `/admin/theme`, `/admin/site-review`,
  `/admin/page-wizard`, `/admin/collections/pages`, and page `181` all rendered;
  page `181` opened in edit view without saving or publishing.
- With the admin rail open at 1440px, the site selector is inside the Payload
  header and the document remains 1440px wide. At 390px, Console content and its
  mobile triage navigation render within a 390px document. No browser page errors
  were reported on the checked routes. All six production `/api/health/ready`
  endpoints returned HTTP 200.
- Focused local proof passed: Admin Operator Console component 9/9, navigation
  and applied-UI unit tests 8/8, lifecycle unit tests 2/2, and TypeScript.
- The prescribed broad `pnpm test:component` gate did not pass: 174/176 tests;
  failures were `tourAuthoringReadiness` and `wingsSideHiFiChrome`, outside the
  US-059 admin surfaces. Production Editor-role UAT was not performed (the
  authenticated profile was site-manager).

The historical production shell concern is resolved for the checked routes.
On 2026-09-25, the stakeholder explicitly accepted a waiver for the missing
production Editor-role UAT. This is recorded as `waived/unverified`, not as a
claim that the Editor role passed. The waiver covers only the live-role test;
it does not waive the documented access-control contract or focused local
role/permission coverage.

The broad component gate remains `174/176`, with failures in
`tourAuthoringReadiness` and `wingsSideHiFiChrome`, both outside the US-059
admin surfaces. Harness therefore remains `in_progress` and Plane proof
remains `Partial` pending final reconciliation/acceptance of the unrelated
baseline failures.
