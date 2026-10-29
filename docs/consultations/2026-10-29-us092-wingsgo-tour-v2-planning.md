# Codex Consultation — US-092 WingsGo Tour Catalog v2

- Date: 2026-10-29 ICT
- Gate: Planning milestone / architectural checkpoint
- Scope: Reusable Hero, curation snapshot, market image selection, filters, locale, cache and multisite safety.
- Reviewer: Claude (independent agent via Herdr, `claude --dangerously-skip-permissions`)
- Decision status: Plan may proceed to implementation planning. D1–D8 are recorded; implementation remains gated by the Phase 0 baseline and acceptance evidence.

## Decisions reviewed

| Decision | Recommendation |
|---|---|
| D1 | Reusable `WingsGoCommerceHero` component selected by site/route; do not add a CMS hero registry key without a separate migration story. |
| D2 | Select a deterministic pseudo-random image from eligible tours in the same market; never use `Math.random()` during render and add fallback. |
| D3 | Compute day difference on the server using `Asia/Ho_Chi_Minh`, expose it in the DTO, and keep dynamic/no-store behavior. |
| D4 | Use site-configured Zalo OA and hotline only; no unverified WhatsApp/Messenger links. |
| D5 | Add server-side `departureMonth` and four seasons: spring 3–5, summer 6–8, autumn 9–11, winter 12–2, with AND semantics when combined. Unify calendar-day handling across `/tour` and detail before implementation. |
| D6 | Keep Featured and All Tours as two sections; define duplicate/filter behavior explicitly. |
| D7 | Link directly to detail and verify locale-aware path generation. |
| D8 | Keep existing WingsGo font. |

## Findings

### P1

1. `/en` can inherit Vietnamese labels because locale is not propagated through section/API/query/client.
2. Adding a new hero registry key can require Payload enum migrations; avoid registry/schema changes.
3. Hero, featured, all, market and upcoming must derive from one query snapshot and one `now`; pagination must prevent duplicates.
4. Departure dates may have UTC representations that cross the Vietnamese calendar boundary; one shared helper is required.

### P2

1. Server-owned `daysUntilDeparture` prevents hydration and ISR boundary drift.
2. Deterministic image selection must be scoped to eligible same-market inventory.
3. Price/departure facts must reflect the active month filter.
4. Site settings must provide contact links; simulator must share the public DTO mapper.
5. Season filtering must support all four seasons; winter is only one value and must not be the sole UI or parser option.

## Resolution recorded after review

- D3 is resolved to server-side calculation using `Asia/Ho_Chi_Minh`, a DTO field, and dynamic/no-store rendering.
- D4 is resolved to configured Zalo OA and hotline only; WhatsApp/Messenger remain outside scope until official links exist.
- Filtered results use a single snapshot. Featured tours remain visible in filtered All Tours when they match the active filter; the legacy exclusion remains when no filter is active.
- Phase 0 now covers locale propagation and read-only verification of both UTC date representations before implementation.

### P3

1. Tighten curation site scope and market whitelist.
2. Verify `/en` detail links.
3. Avoid duplicated market/hero imagery and rainbow border effects where UX requires.

## Required response in implementation

Add the findings to `US-092/.../validation.md`, cover each P1/P2 in the execplan and tests, and do not close the story until all unresolved P1/P2 findings are fixed or explicitly accepted by the stakeholder.



