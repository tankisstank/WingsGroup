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
expectation drift in six WingsSide assertions and was stopped during the long
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
