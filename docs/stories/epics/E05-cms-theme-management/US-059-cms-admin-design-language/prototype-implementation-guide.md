# Prototype implementation guide

## Artifact identity

- File: `cms-operator-console-prototype.html`
- Size: 93,537 bytes
- SHA-256: `5a41fb2e77e6634d33ef19ae31787735b17b7b99b689ef0e825138ca727e3df9`
- Packaging: self-contained HTML with inline CSS and JavaScript
- External assets: none; no separate image, font, stylesheet, or script bundle

Verify from the repository root:

```bash
sha256sum docs/stories/epics/E05-cms-theme-management/US-059-cms-admin-design-language/cms-operator-console-prototype.html
wc -c docs/stories/epics/E05-cms-theme-management/US-059-cms-admin-design-language/cms-operator-console-prototype.html
```

Open it as a static visual reference:

```bash
agent-browser open file:///home/docker-admin/src/WingsTravel/docs/stories/epics/E05-cms-theme-management/US-059-cms-admin-design-language/cms-operator-console-prototype.html
agent-browser snapshot -i
```

If local file access is disabled, serve only the story directory with a local
static server. The production implementation is not run from this HTML file.

## Authority map

| Prototype area | US-059 use | Authority |
| --- | --- | --- |
| Operator-first hierarchy, scope context, metrics, recent content, native route discoverability | Translate into Payload-native Dashboard and Console components. | Visual and interaction reference. |
| Desktop/tablet/mobile layout, triage navigation, focus, reduced motion, minimum target intent | Preserve through scoped admin CSS and E2E at the recorded viewport matrix. | Visual and accessibility reference. |
| Theme, site, page, collection, global, import/export route mockups | Link only to real Payload routes and retain native route ownership. | Navigation reference only. |
| Static counts, task badges, queue states, names, dates, users, lead details | Never copy as application data or test evidence. | Non-authoritative sample content. |
| Approval/publish, comments, assignment, diff, rollback, schedule, lead retry, invitation, site activation, TourProduct readiness, media dependency, import dry-run/diff | Do not implement in US-059 without a separately approved product/backend contract. | Explicitly excluded. |

## Implementation mapping

- `AdminOperatorConsole` owns authenticated REST request states, role-aware
  shortcuts, valid routes, aggregate scope labels, recent content, and local
  retry without false zero/empty fallbacks.
- `WingsGroupMetrics` keeps initial Payload Local API reads with `req` and
  `overrideAccess: false`; `WingsGroupMetricsClient` owns isolated hydrated
  state and retries against existing authenticated REST endpoints.
- `AdminMetrics/contract.ts` is the shared metric naming/query contract.
- `AdminNavIntro` remains triage-only: Console, Site Review, and Lead.
- Site Review remains read-only; Page Wizard retains default locale `vi`.
- `custom.scss` and component styles translate visual intent into the existing
  `finexy-soft` and `ats-compact` theme contracts.

## Run and verification

From `app/`:

```bash
pnpm exec tsc --noEmit
pnpm lint
pnpm test:unit
pnpm test:component
pnpm test:int
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/google-chrome pnpm test:e2e:sqlite tests/e2e/admin.e2e.spec.ts
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/google-chrome pnpm test:e2e tests/e2e/admin.e2e.spec.ts
pnpm build
```

Use `agent-browser` against the running app for visual QA of `/admin` and
`/admin/console` at representative desktop, tablet, and mobile widths under
both theme keys. Record screenshots under `evidence/`; do not place credentials,
tokens, or production lead content in screenshots or logs.
