# HANDOFF — Independent audit & full local QA

**Date:** 2026-07-21  
**Purpose:** Prompt dán vào **session / agent audit độc lập** để test toàn diện local + audit code/UX, **không** phụ thuộc agent implement.  
**Mode:** Read-only audit + visual/browser QA. Chỉ đề xuất fix; không rewrite lớn trừ khi user yêu cầu.

---

## 0. Prompt dán nhanh (session audit mới)

```text
Bạn là auditor độc lập (read-only trước, propose fix sau khi có evidence).

## Local under test
- Worktree: E:\repo\WingsTravel-us046-hifi
- Branch: feature/us-046-wingsside-hifi-tour-detail
- Merge head: 66514d4 merge(master): integrate consultative tour detail into US-046 UI branch
- Also contains: 91eec0e feat(wingsside): port consultative tour detail hi-fi (from master)
- Dev server: http://127.0.0.1:3010  (US-046 worktree — NOT port 3000 if another tree is running)

## URL spelling
- Correct site prefix: /wingsside/ (2 × s)
- Wrong: /wingside/ → expect 404

## Must-test URLs (local)
Wingside:
1. http://127.0.0.1:3010/wingsside/
2. http://127.0.0.1:3010/wingsside/en  (and/or locale switcher EN)
3. http://127.0.0.1:3010/wingsside/tour/best-of-northern-vietnam-hanoi-ninh-binh-sapa-halong-6-days
4. Optional other /wingsside/tour/<slug> from packages listing

WingsGo regression (must not break retail):
5. http://127.0.0.1:3010/wingsgo/
6. Any /wingsgo/tour/<slug> if present (hold-seat, departures, price)

## Architecture truth (do not invent)
Wingside tour route on THIS branch uses dedicated:
  app/src/tours/WingSideTourDetailPage.tsx
  + wingsSideTourViewModel helpers
  (page.tsx: site.code === 'wings-side' → WingSideTourDetailPage)

Master also shipped presentation-aware:
  app/src/tours/StructuredPages.tsx (presentation retail|consultative)
  Used for WingsGo retail and as shared infrastructure after merge.

Merge kept BOTH:
- Wingside → WingSideTourDetailPage (US-046 UI)
- WingsGo → TourDetailPage presentation="retail"

## Product locks (fail audit if violated on Wingside)
1. Dual CTA: Primary Consult / Request consultation (gold) + Secondary Contact (ghost)
2. NO hold-seat primary; no seat scarcity / “only N left”
3. Price honesty: missing price → on request / 24h; no invented USD
4. No invented reviews/stars/stats
5. URL prefix /wingsside/ (2 s)
6. Brand string Wingside; Book gold CTA direction
7. A11y: touch ≥44px on primary CTA; focus-visible; reduced-motion
8. Do not regress WingsGo dense retail (US-037)

## Visual SOURCED (read-only Open Design)
- C:\Users\VIETD\AppData\Roaming\Open Design\namespaces\release-stable-win\data\projects\9f85d0db-9ebc-409a-b580-5b401e4a10b8\wingside-tour-detail-hifi.html
- …\wingside-hifi-fix-8pages.html (token Book gold)
- …\HANDOFF-wingside-tour-detail-hifi.md
- Repo implement handoff: docs/HANDOFF-wingside-tour-detail-hifi-to-repo.md (also on master)

## Code surfaces to audit
- app/src/tours/WingSideTourDetailPage.tsx  (PRIMARY wingside UI)
- app/src/tours/wingsSideTourViewModel.ts
- app/src/tours/StructuredPages.tsx
- app/src/tours/TourItineraryDayDetails.tsx
- app/src/tours/queries.ts / utils.ts
- app/src/utilities/siteCapabilities.ts / siteContactPaths.ts
- app/src/app/(frontend)/[...slug]/page.tsx  (resolveStructuredTourPage)
- app/src/app/(frontend)/globals.css  (tour-cta-primary gold + US-046 chrome)
- app/src/Header/** , WingsSideHiFi/** (if present — WIP may be uncommitted)
- Unit: app/tests/unit/siteCapabilities.unit.spec.ts, tourDetailBuilder.unit.spec.ts

## Local QA checklist (browser: agent-browser preferred)
Desktop + mobile (or responsive):
[ ] Home wingsside loads; header Plan your trip gold; no layout break
[ ] Tour detail 200; structured WingSideTourDetailPage (not CMS blocks-only dump)
[ ] Hero balanced (no huge empty gap between breadcrumb/header and first panel)
[ ] Dual CTA gold + ghost; intents inquiry/contact; path /contact-us (not /lien-he)
[ ] No hold-seat / Giữ chỗ as primary
[ ] Price on request when no CMS price
[ ] Itinerary accordion: Day 1 open default, multi-open, no React defaultOpen warning
[ ] Include|Exclude honest (no invented “international flights” if empty)
[ ] Jump nav ≥44px; sticky CTA mobile; desktop decision rail if designed
[ ] Locale EN/VI switch does not break layout or invent copy
[ ] Console: no red errors/warnings (esp. React DOM props, hydration)
[ ] WingsGo tour/home: retail UX intact

## Output format required
## Summary
## Environment verified (URL, commit, port)
## Pass / Fail matrix (table)
## Issues
### Issue N — Severity: bug|suggestion|nit
- Surface: URL or file:line
- Evidence: screenshot / HTML marker / console
- Expected vs actual
- Suggested fix
## Residual risks
## Verdict: APPROVE | APPROVE_WITH_NITS | REQUEST_CHANGES

Skip discovery form. Do not push. Do not redesign Open Design artifacts.
```

---

## 1. Local environment (for human tester)

| Item | Value |
|------|--------|
| Worktree | `E:\repo\WingsTravel-us046-hifi` |
| Branch | `feature/us-046-wingsside-hifi-tour-detail` |
| Merge commit | `66514d4` |
| App cwd | `E:\repo\WingsTravel-us046-hifi\app` |
| Dev command | `pnpm exec next dev -p 3010 -H 127.0.0.1` |
| Base URL | **http://127.0.0.1:3010** |
| DB | local SQLite via worktree `app/.env` + `payload-tourplatform.db` |

### Primary test tour
```
http://127.0.0.1:3010/wingsside/tour/best-of-northern-vietnam-hanoi-ninh-binh-sapa-halong-6-days
```

### Regression
```
http://127.0.0.1:3010/wingsgo/
http://127.0.0.1:3010/wingsside/
```

### Notes
- Port **3010** = this US-046 worktree. Port **3000** may still be another tree (`WingsTravel` / older process) — do not mix.
- Working tree may still have **uncommitted WIP** (Header, WingsSideHiFi components, assets). Audit must note committed vs dirty.
- Spelling: **`/wingsside/`** only.

---

## 2. What was merged (audit context)

1. Master `91eec0e` consultative tour infrastructure (StructuredPages presentation, utils, capabilities, gold CTA CSS, unit tests).
2. US-046 branch already had dedicated `WingSideTourDetailPage` for wings-side.
3. Merge resolution:
   - Wingside continues to use **WingSideTourDetailPage**
   - WingsGo uses **TourDetailPage** retail
   - Shared capabilities aliases (`isStructuredTourDetailEnabledSiteCode` ↔ `isStructuredTourDetailSiteCode`)
   - queries keep `fallbackLocale` for Wingside EN content
   - globals: US-046 specials/chrome + Book gold tour CTA classes

---

## 3. Suggested audit order

1. Confirm server health: `GET /wingsside/` → 200  
2. Tour detail smoke + HTML markers  
3. Console + network (contact-us intents)  
4. Visual vs hi-fi HTML (Open Design)  
5. Code path: page.tsx → WingSideTourDetailPage vs StructuredPages  
6. WingsGo regression  
7. Write verdict + issues with severity  

---

## 4. Artifact paths for auditor

| Role | Path |
|------|------|
| This handoff | `docs/HANDOFF-AUDIT-US046-local-test.md` |
| Implement handoff | `docs/HANDOFF-wingside-tour-detail-hifi-to-repo.md` |
| Prior review brief | `E:\repo\WingsTravel\output\CODEX-REVIEW-BRIEF-wingside-tour-detail-hifi.md` (main worktree) |
| Prior audit + rebuttal | `E:\repo\WingsTravel\output\CODEX-REVIEW-AUDIT-…` / `CODEX-REVIEW-REBUTTAL-…` |

---

*End handoff. Independent auditor: evidence first, then verdict.*
