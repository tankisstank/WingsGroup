# US-046 WingSide hi-fi local implementation audit - 2026-07-22

## Decision

**LOCAL GO / PRODUCTION HOLD.** The eight official WingSide hub routes and the
consultative tour detail are wired in the isolated worktree. Deployment remains
frozen. This decision does not certify the current VPS build.

## Locked references

- Eight hubs: `wingside-hifi-fix-8pages.html`
- Tour detail: `wingside-tour-detail-hifi.html`
- Open Design project: `9f85d0db-9ebc-409a-b580-5b401e4a10b8`

## Change comparison

| Surface | Before corrective pass | Local result | Audit |
| --- | --- | --- | --- |
| Home | Hi-fi styles intermittently absent; body ownership unclear | Dedicated Home composition, planner, proof, journeys, notes, credentials | Pass |
| Plan | Planner/form composition drift; missing persisted lede/FAQ contract | Dedicated Plan composition, real Payload form, schema completion migration | Pass |
| Destinations | Generic three-card route grid | Split route map/list, six destination cards, CTA and next steps | Pass |
| Styles | Shallow three-column generic cards | Six large two-column media cards with pace, tags and working CTA | Pass |
| Packages | Three generic journey cards | Five 3+2 package cards with price posture, itinerary and customize actions | Pass |
| Guide | Static cards with no filter behavior | Working category filters, three notes and archive posture | Pass |
| About | Headings and plain step text only | Story, four step cards, promises and accountable team roles | Pass |
| Contact | Form existed but collapsed to about 106 px | One real Payload form at full column width, channels and four next steps | Pass |
| Tour detail | Legacy visibility omitted gallery, pricing, enquiry and related | Fixed consultative contract with real gallery, facts, route, itinerary, services, pricing, enquiry, related fallback and sticky CTA | Pass with data note |

## Browser proof

- Agent-browser desktop: 1440 x 1000 for all corrective B2 hubs and tour detail.
- Agent-browser mobile: 390 x 844 for all six B2 hubs and tour detail.
- Every audited route has one H1 and zero horizontal overflow.
- Contact has one real form with seven controls; desktop form width recovered
  from about 106 px to 479 px.
- Guide filter changed the visible card count from three to one.
- Tour itinerary has six disclosure rows; the second row opens after it is
  scrolled into view and clicked.
- Fresh tour browser session reported no console error.

Representative local artifacts are under `app/artifacts/` and are deliberately
not committed. Key filenames include `b2-audit-*-1440-v2.png`,
`b2-audit-contact-390-v3.png`, `tour-current-1440-v3.png`, and
`tour-current-390-v4.png`.

## Automated proof

| Gate | Result |
| --- | --- |
| TypeScript | Pass |
| Unit | 37 files, 251/251 pass |
| Component | 9 files, 29/29 pass |
| Integration | 21 pass, 2 skipped; 109 tests pass, 3 intentional skips |
| Full E2E suite | Not rerun in this corrective pass; browser acceptance was targeted to the changed WingSide routes |
| PostgreSQL empty-to-head migration + EN/VI CRUD | Pass |
| Optimized Next.js build | Pass; 16/16 static pages generated |
| ESLint tracked source | 0 errors, 143 existing warnings |
| Full repository lint | Blocked only by untracked `app/artifacts/tmp/check-sqlite.cjs`; source error fixed |

## Adversarial findings retained

1. Tour hero and gallery use imported TourProduct media. The audited North tour
   currently opens with food photography, unlike the locked prototype image.
   This is a content/media curation gap, not a CSS failure.
2. Tour enquiry uses real contextual links to Contact/Plan instead of embedding
   a second ungoverned form. This is an intentional functional deviation from
   the static prototype.
3. Related-tour relations are empty in the local imported record. The renderer
   provides truthful hub fallbacks rather than inventing tour products.
4. VPS remains outside this acceptance decision. No merge, push, migration,
   cleanup, or deployment was performed in this corrective pass.

## Tracking state

- Harness: `US-046A` is `implemented` with unit, integration and platform proof;
  E2E remains `no`. `US-046` stays `in_progress` until integration and VPS
  acceptance.
- Plane preview resolved both stories under WingsSide Epic E08 as
  `Chờ xác nhận`.
- Plane work-item sync was attempted but stopped before mutation with
  `403 Payment required` on the Initiatives API. Plane verification counts
  therefore cannot be certified from this run; repo docs and Harness remain
  the source of truth.

## Worker and review trace

Grok CLI produced the initial Home/Plan tranche and review feedback. Its weekly
quota was exhausted during B2 and alternate Botstack model tool calls failed,
so the leader completed B2 and Tour Detail, then ran independent browser,
schema, test, migration and build audits. Commits are isolated on
`feature/us-046-wingsside-hifi-tour-detail`.
