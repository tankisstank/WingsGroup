# Go-live Review Pipeline

## Purpose

The go-live review pipeline gives project managers and site managers a repeatable
way to decide whether a WingsGroup page or site is ready for customer-facing
launch.

It reviews rendered public pages, not only CMS records. This matters because
launch readiness depends on the combination of Payload content, site-aware
routing, frontend rendering, metadata, responsive behavior, and conversion copy.

## Scope

The first implementation is a local/release script:

```bash
cd app
pnpm run go-live:review
```

Useful focused runs:

```bash
pnpm run go-live:review -- --site wingsgo
pnpm run go-live:review -- --site wingsgo --path /wingsgo/campaign
pnpm run go-live:review -- --base-url http://localhost:3000 --out ../output/go-live-review/manual
```

The target app must already be running. For local review, use the existing
Next/Payload development or local production server.

## Review Layers

### Inventory

The script reads published Payload pages from the public API and maps them to the
repo-approved local multisite path-prefix model:

- WingsGroup: `/`
- WingsGo: `/wingsgo`
- WingsSide: `/wingsside`
- WingsPlus: `/wingsplus`
- WingsCare: `/wingscare`
- WingsPass: `/wingspass`

It also includes common app routes such as `/posts` and `/search`.

### Technical Gate

Each page is opened in Playwright on desktop and mobile. The automated gate
checks:

- HTTP response status
- browser console errors
- runtime page errors
- horizontal overflow
- document title
- meta description
- canonical URL
- H1 count
- visible images without alt text

Runtime errors, failed responses, console errors, and horizontal overflow are
launch blockers.

### Content And Copy Gate

The pipeline classifies each page by purpose:

- `homepage`
- `campaign`
- `travel-product`
- `lead-contact`
- `trust`
- `editorial`
- `brand-trust`
- `content`

It then checks whether the rendered text contains the expected launch signals
for that page type. Examples:

- Campaign pages need a clear offer/destination, a primary CTA, and trust or
  support signal.
- Travel product pages need itinerary/destination language, a conversion CTA,
  and price or inquiry path.
- Contact pages need a contact method and a lead action.
- Trust/legal pages need policy or reassurance language.

For conversion pages, a missing contact or inquiry path is a blocker. Weak CTA
visibility or missing content signals are marked as `needs_fix`.

### Artifacts

The pipeline writes:

- `review-results.json`
- `review-report.md`
- desktop and mobile screenshots

Default output path:

```text
output/go-live-review/<timestamp>/
```

## Status Model

The pipeline returns one of these statuses:

| Status | Meaning |
| --- | --- |
| `pass` | No automated launch issue detected. |
| `pass_with_notes` | Non-blocking technical/content warnings remain. |
| `needs_fix` | Content or CTA issue should be fixed before customer go-live. |
| `blocked` | Route, runtime, layout, or conversion-path issue blocks launch. |

Exit codes:

- `0`: `pass` or `pass_with_notes`
- `1`: `needs_fix`
- `2`: `blocked`

## Current Limitations

This first version is rule-based. It does not yet run Lighthouse, Pa11y, visual
diff baselines, or an AI copy reviewer. Those should be added as later layers
after the base report format is stable.

The first version also reviews rendered text heuristically. Final customer copy,
legal claims, pricing correctness, and campaign-specific business approval still
require human sign-off.

