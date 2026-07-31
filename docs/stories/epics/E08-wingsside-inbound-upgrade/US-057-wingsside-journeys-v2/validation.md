# US-057 Validation

The original production commerce delivery was accepted on 2026-07-31, then
reopened the same day for a scoped visual-fidelity remediation. The live
classification and departure data remain accepted; US057 is not complete until
the public Journeys page meets the locked hi-fi v2 visual review.

The implementation is a surgical upgrade of the existing `/journeys` route,
Payload query, URL state and tenant shell. It adds strict localized
q/type/destination/style/duration AND matching, group/private/hybrid card
posture, verified-departure commerce and structured enquiry context without
replacing the catalog data layer.

## Visual remediation exit gate

- Poster hero, desktop filter overlap, card overlays, editorial paths band,
  image-led destination rail, three decision FAQ entries and bottom CTA match
  the canonical v2 structure and visual posture with real production data.
- Desktop 1440px and mobile 390px have no horizontal overflow, clipped type or
  duration badge, console error or retail claim unsupported by data.
- Existing strict-AND URLs, zero-result recovery, group/private/hybrid CTA
  semantics, expiry fallback and enquiry context regressions remain green.
- The remediation is app-only: no migration, CMS write or production data
  mutation is permitted.

## 2026-07-31 visual remediation evidence

- Independent implementation and read-only visual reviews accepted the final
  remediation commit after a second review cycle. The review specifically
  verified the stable three-image destination rail, canonical FAQ sequence,
  full-bleed editorial band, token-only color treatment, WingSide-only scope
  and unchanged discovery/commerce/context behavior.
- Focused Journeys component suite: 16/16 pass. TypeScript, scoped ESLint
  (0 errors, 0 warnings), `git diff --check`, and production build pass.
- Local `agent-browser` startup reached the repository's local bootstrap but
  cannot resolve a WingSide tenant with production catalog data in this
  worktree; `/journeys` therefore returns its expected tenant 404. This was
  closed by the isolated VPS app-only canary below, without mutating catalog
  data or public traffic.

## 2026-07-31 app-only canary visual QA

- Immutable canary SHA `ee69e4a9e2c52ba9440805f5ecf7f44d09470403` built on
  the VPS as ARM64 image
  `sha256:1c8209a26ea472bb284da2563d7a71fe0be06e4dec8345b087a4990f762448f4`.
- The private port-3001 canary used the same PostgreSQL/Redis runtime contract
  as production, passed live/tenant Journeys probes, then was removed after
  QA. No migration, CMS write, data import, symlink switch or public traffic
  promotion occurred.
- `agent-browser` visual QA through a local tunnel/proxy verified the real
  WingSide tenant: Plus Jakarta Sans was the computed hero font; desktop and
  mobile had no horizontal overflow; mobile card grid and decision band stacked
  to one column; all three stable destination images loaded; group inventory
  exposed zero `Book` CTAs; and a strict five-filter zero result retained its
  full brief and recovery actions.
- The public rollback point was continuously preserved and rechecked after
  cleanup: `/home/ubuntu/wings-travel/releases/wingsside-us057-1dc91b0`, SHA
  `1dc91b0de859626e2ba233065117b2be61aa670d`, with live health still `ok`.

## 2026-07-31 app-only public promotion

- Approved public promotion moved only the application symlink/container to
  `ee69e4a9e2c52ba9440805f5ecf7f44d09470403` and immutable image
  `sha256:1c8209a26ea472bb284da2563d7a71fe0be06e4dec8345b087a4990f762448f4`.
  PostgreSQL and Redis container IDs were verified unchanged.
- Direct `agent-browser` QA at `https://wingside.vn/journeys` confirmed Plus
  Jakarta Sans, desktop three-column grid with three loaded destination images
  and no overflow. At 390px the group deep link rendered one-column cards and
  decision band, no overflow and zero `Book` CTA.
- The prior app release `1dc91b0de859626e2ba233065117b2be61aa670d` remains
  the recorded app rollback target. No migration or production data mutation
  was performed.

## Automated gates

- TypeScript: pass.
- Full unit checkpoint: 727/727 pass.
- Final focused commerce unit: 21/21 pass.
- Component checkpoint: 80/80 pass; final Journeys component: 14/14 pass.
- Integration: all configured suites pass; environment-dependent suites keep
  their existing skips.
- Local SQLite commerce bootstrap: pass and idempotent.
- PostgreSQL empty-to-head migration smoke: pass.
- PostgreSQL pre-head upgrade smoke: pass.
- PostgreSQL real Payload CRUD rehearsal: pass.
  - exact site and 22 product identities;
  - canary apply/verify/rollback: 1/1;
  - full apply/verify/rollback: 22/22 classifications and three managed
    departure products;
  - unmanaged expired departure preserved through both cycles;
  - raw SQL verifies all 44 synthetic taxonomy rows remain unchanged.
- Production-backup clone rehearsal: pass.
  - restored the encrypted production backup into
    `wingstravel_us057_prodclone`;
  - canary, attestation, full apply, verify and full rollback all passed;
  - all 93 real taxonomy rows retained checksum
    `1a0ca9766236394ed777af637f85fdf633d5aa7367258d477297814f46277551`.
- Production builds: pass for data release `e0021aa` and public app hotfix
  `1dc91b0`; ARM64 runner and ops revision labels match their full Git SHAs.
- Lint: zero errors; existing repository warnings remain.
- Journeys browser E2E: 5/5 pass on Chromium, covering tenant isolation,
  EN/VI/IT/ES/PT desktop and mobile filters, strict AND deep links,
  detail/contact/back context, invalid-query no-leak and true zero-result
  recovery.
- The final public hotfix retained the complete five-filter brief when removing
  style, made both private CTAs explicitly request a private quote, and removed
  the private-only hero positioning across EN/VI/IT/ES/PT.

`validate:wingsside:locales` reaches the editorial catalog gate but stops
because the local source data is still the unsafe positional v1 format without
stable `sourceRowID` dispositions. This is a pre-existing data prerequisite,
not a Journeys renderer/schema failure.

## Production data and release gates

- Fresh supplier capture: 22 exact future departure rows.
  - product 63: four rows at USD 741 per person;
  - hybrid product 65: nine rows at USD 1,699 per person;
  - product 69: nine rows at USD 1,120 per person.
- Full production plan:
  `2048948fa941ba7596c8bf8bbe5ee1d782e4f08e997698dfdd27801b0302c7b2`.
- Canary plan:
  `5588dd553dc5c439fee584434634abf8c4738a9e24c7b8f25e9c2adeb318a17e`.
- Canary attestation:
  `87340a6ca9e81e049449089e79b19ccf0b4a15745e2dfca069b0ce3cfcae0c18`.
- Encrypted backup:
  `c5cc79e7bbbc8a3cd9fc5937e0e2e156b4eee5f30fd06c3af55b319aed43e126`.
  PostgreSQL 16 restore drill passed with one WingSide site, 22 exact tours,
  both US057 migrations, nine governed columns and the inventory identity
  index.
- Production apply verified 22/22 postimages, 22 managed departures and all 93
  taxonomy rows unchanged.
- A pre-promotion attempt exposed collateral taxonomy deletion from Payload's
  high-level partial update. Promotion stopped, the exact encrypted backup was
  restored, and production was verified back at the preimage. The final adapter
  uses transaction-bound scalar `payload.db.updateOne`; clone and production
  proofs both verify taxonomy independently with raw SQL.
- Data release: `e0021aaebd8cfb2208b52a61c2d7b697c55cb92f`.
- Public app release: `1dc91b0de859626e2ba233065117b2be61aa670d`.
- PostgreSQL and Redis container identities remained unchanged during both
  app-only promotions.

## Production browser evidence

- `evidence/journeys-desktop-1440.png`
- `evidence/journeys-mobile-390.png`
- `evidence/journeys-contact-fallback-desktop-1440.png`
- `evidence/journeys-zero-result-mobile-390.png`
- `evidence/production-2026-07-31/desktop-group-final.png`
- `evidence/production-2026-07-31/mobile-group-final.png`
- `evidence/production-2026-07-31/desktop-zero-result-final.png`

Repo-preferred `agent-browser` verified public `https://wingside.vn/journeys`
at 1440 px and 390 px. The deep link retained all five active filters with
strict AND, showed a true zero result without relaxing the brief, and removed
only `style` when that recovery action was selected. Mobile reported
`scrollWidth=innerWidth=390`. Contact/quote CTA URLs carried structured tour
and discovery context; the user message field remained empty.

Public counts were 22 all journeys, 11 Small group (including hybrid) and 15
Private (including hybrid and legacy fail-closed private fallback). The first
group page showed one verified `View departures`, five
`Schedule on request`/`Check availability`, two hybrid `Request quote` and zero
`Book` links. Private showed eight `Request quote`, zero `View departures` and
zero `Book` links.

The production/source classification remains seven pure group, eight pure
private, four hybrid and three unresolved source redirects. Product accepted
the source pricing/classification. The final production capture validated 22
current rows across products 63, 65 and 69.

Production apply is additionally protected against expired plans. If a process
commits but loses its output receipt, `recover-receipt` can reconstruct it only
when every managed row exactly matches the signed postimage. Rollback remains
allowed after expiry and revalidates complete identity/provenance before
deletion.

No unresolved schema migration is required. Some production tours still lack
approved card media; the UI keeps a neutral media panel and derives alt text
from the real tour title rather than inventing an asset or claim. Stakeholder
Stakeholder confirmation was the only remaining story-state gate and is now
recorded as received.
