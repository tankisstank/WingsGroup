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
