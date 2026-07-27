# US-054 Exec Plan

## Goal

Ship the smallest trustworthy `/journeys` vertical slice without expanding into
booking, availability, account or comparison capabilities.

## Scope

In scope:

- WingSide-only route and nav/Home/hub entry points.
- Published same-site TourProduct query and typed projection.
- Scalar destination/style/duration filters and URL restoration.
- Deterministic relax order: duration, style, destination.
- Tour Detail and Plan/Contact transitions with normalized context.
- Five-locale, accessibility, responsive and SEO proof.

Out of scope:

- Date, guest, budget, save, compare and personalization.
- New inventory imports, schema migration or taxonomy redesign.
- Real lead submission during automated validation.

## Work Packages

1. Contract/query: types, parser, duration, relax, projection, SEO helpers and
   unit/integration proof.
2. Route/UI/wiring: `/journeys`, localized controls/results/recovery, entry
   points, Tour Detail and Plan/Contact context, component proof.
3. Independent black-box QA: five-locale responsive E2E and negative paths.
4. PM review/audit, canary, production proof, Harness evidence and Plane sync.

## Stop Conditions

Pause for PM confirmation if implementation requires schema migration, date,
guest or budget semantics, weakens US-049/050 isolation, makes arbitrary query
combinations indexable, mutates production editorial data without a reversible
plan, or would submit a real lead.

