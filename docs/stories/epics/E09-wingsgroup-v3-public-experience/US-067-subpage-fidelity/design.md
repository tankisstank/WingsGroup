# Design

## Domain Model

`Pages`, `Posts`, `Media` and `SiteSettings` remain Payload, site-scoped and
localized. Corporate-route seed/contract data may describe presentation and
copy, but post bodies and archive membership continue to be queried from
Payload Posts at runtime.

## Application Flow

Public route resolution obtains the WingsGroup site and locale context, reads
the corresponding Page layout, then renders approved blocks through the shared
WingsGroup v3 shell. The news archive queries eligible published Posts by site
and locale; it does not consume a static article array.

## Interface Contract

- `/`, `/en`, all approved corporate routes and their English counterparts use
  the shared editorial chrome.
- `/tin-tuc` and `/en/tin-tuc` display CMS-backed article cards; article detail
  routes use the existing Payload post query.
- Consultation continues to use the consent-aware contact form and its safe
  pending external-channel state.

## Data Model

No schema migration is intended. The content importer/seed contract must select
only governed WingsGroup media and reject an empty hero-media reference for
archetypes that require a hero. Applying that contract to production is a
separate approval-gated operation.

## UI / Platform Impact

Desktop uses aligned editorial rails (460px scope / main content / 300px
verification context where applicable). Mobile collapses to a single readable
column, retains flat textual navigation in the opened menu and avoids horizontal
overflow. Breadcrumbs are contextual text, never chips.

## Observability

Targeted tests must prove route/locale, archetype and media contract behavior.
Browser evidence must show desktop and compact-width route presentation without
blank hero media, duplicate hash navigation or development controls.

## Alternatives Considered

1. Styling each route independently — rejected because the defects originate in
   shared chrome and it would drift again.
2. Replace CMS Posts with static article cards — rejected because it breaks the
   Payload-first editorial contract.
