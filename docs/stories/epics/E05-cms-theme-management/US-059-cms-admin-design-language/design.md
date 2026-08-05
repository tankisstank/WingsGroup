# Design

## Operating model

The operator console is a read model over existing Payload REST resources. It
does not become a second admin application. The view owns presentation,
per-request state, context communication, and valid links; Payload collections,
globals, plugins, and access control own data and commands.

```text
Payload session and assigned sites
  -> aggregate read context (all permitted sites, all locales, role)
  -> independent query panels
  -> visible state: loading | empty | error | no-access | ready
  -> native Link to custom view, collection, or global
```

The Console preserves the existing `fetchJSON` plus `Promise.all` loading
pattern, but wraps each independent request group in a typed result. A non-OK
response must retain enough status to render `no-access` separately from an
operational `error`. Retrying a failed group must not refetch or reset panels
that already succeeded.

## Console data contract

| Surface | Existing source | Display rule | Decision required |
| --- | --- | --- | --- |
| Current role | `/api/users/me` | Name only the current role; handle unauthenticated/no-access explicitly. | None. |
| Assigned site context | `/api/sites?depth=0&limit=20&sort=name` | List only returned/allowed sites; Console and dashboard label the aggregate read scope as all permitted sites/all locales. | None. |
| Recent content | `/api/pages?depth=0&limit=5&sort=-updatedAt` | Show recency as recently updated, not review state. | None. |
| Recent lead | `/api/form-submissions?depth=1&limit=5&sort=-createdAt` | Show immutable submission data only as allowed. | Define “new lead” window. |
| Metrics | Existing count endpoints | `Trang`, `Bài viết`, `Media`, `Tổng lead` are unfiltered collection counts; drafts filter `_status=draft`; show unavailable state on unknown data. | Review/schedule/import semantics. |

An unavailable metric shows an em dash and `Chưa có dữ liệu`. It never uses a
zero fallback. An empty successful response may show zero only when the metric
definition says a successful count of zero is meaningful. The native
`WingsGroupMetrics` widget uses this same contract; it is not a second source
of ambiguous zero values.

## Route and navigation contract

The operational route inventory is deliberately traceable rather than
duplicated:

| Family | Routes |
| --- | --- |
| Custom workflow | `/admin/page-wizard`, `/admin/site-review`, `/admin/theme` |
| Content | `/admin/collections/pages`, `/posts`, `/categories` |
| Tours | `/tour-products`, `/departure-variants`, `/tour-departures`, `/tour-campaigns` |
| Media and leads | `/media`, `/forms`, `/form-submissions` |
| Data exchange | `/imports`, `/exports` |
| Advanced | `/sites`, `/theme-presets`, `/hero-presentation-presets`, `/site-settings`, `/users`, `/redirects`, `/search`, `/globals/header`, `/globals/footer` |

The routes in a table above are shorthand for the `/admin/collections/` or
`/admin/globals/` Payload prefixes shown in the corresponding family. E2E uses
the full route. `/admin/console` is an additional operational landing surface,
and `/admin` remains the native Payload landing surface.

`AdminNavIntro` presents only Console, Review, and Lead. Native Payload
navigation continues to expose the collections and globals permitted to the
user. Mobile may prioritise those three links but does not add a drawer or
claim that heavy editors are mobile-ready.

## Write and review contract

Each existing write-capable control uses the narrowest truthful surface:

| Need | Existing entry point | Allowed story behaviour |
| --- | --- | --- |
| Start page draft | `/admin/page-wizard` | Require the supported site and layout-preset inputs; show current locale behaviour until the locale decision is approved. |
| Inspect/review page | `/admin/site-review` | Read-only preview, existing status/scope, and link to the record. No approval, comments, assignment, diff, publish, or rollback claim. |
| Theme/hero configuration | `/admin/theme`, `theme-presets`, `hero-presentation-presets` | State whether the change is a global preset, site default, or page override; show current impact evidence and confirmation before a supported save. |
| Content and media | Native collections | Link to Payload list/detail commands. Only show rename/delete dependency warnings if a real dependency query exists. |
| Leads | `form-submissions` | Immutable inspection and existing delivery fields only. |
| Import/export | `imports`, `exports` | Use plugin-native scope/mapping/status surfaces. Do not promise dry-run, diff, or rollback without backend proof. |
| Advanced | Native collections and globals | Make scope/impact and role gate explicit before supported writes. |

Every confirmation identifies site scope, locale, consequence, and the next
review step. It must be task-specific, not a universal modal. Where a dialog
is needed, the implementation follows the accessibility contract in the product
design-language document.

## Visual and responsive implementation

The prototype establishes hierarchy: current work in the main rail, scope and
warnings in the supporting rail, orange reserved for the next action, and navy
navigation. Implementation reuses the two existing theme keys and semantic
admin tokens in `custom.scss`.

At 681--1050px the Payload sidebar remains labelled and target sizes are at
least 44px. At 680px and below, the triage links remain Console, Review, and
Lead, the Console presents the queue before secondary context, and no surface
creates horizontal scroll. No raw component-level palette and no decorative
gradient may be added.

## Accessibility and observability

Each custom view supplies a skip link, a labelled `<main>`, native controls,
and focus-visible states. Dialogs trap focus, close with Escape, and restore
focus. Toasts announce via a polite live region; form errors are text and use
`aria-describedby`. Motion respects `prefers-reduced-motion`.

Client errors may be surfaced to the user at the affected panel but must not
log credentials, API tokens, or form-submission contents. Validation records
only sanitized fixtures and status evidence.

## Alternatives rejected

- Copying the prototype into a standalone client-only shell: rejected because
  it disconnects from Payload route and access behaviour.
- Rendering synthetic counts/statuses for visual parity: rejected because it
  misleads operators.
- Expanding schema or API implicitly to satisfy Page Wizard, review, tours, or
  import controls: rejected until the product decisions in `overview.md` are
  approved.
