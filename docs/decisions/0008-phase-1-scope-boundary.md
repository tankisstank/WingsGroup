# 0008 Phase 1 Scope Boundary

Date: 2026-05-25

## Status

Accepted

## Context

The strategy material spans website, CMS, landing pages, future lead handling,
and later expansion into operations and AI. Without a durable boundary,
implementation work can over-interpret those forward-looking notes as immediate
scope.

## Decision

Lock phase 1 around these areas:

- multisite and multi-domain readiness
- localization
- site-aware branding, SEO, and shared settings
- content management and reusable page composition
- site-scoped admin governance

By default, phase 1 excludes:

- CRM workflow
- booking and payment
- operator workflow
- advanced analytics dashboards
- automation orchestration
- AI and RAG features

Future lead capture or tracking work must enter through a separate intake that
states whether it is part of the bounded release or a later initiative.

## Alternatives Considered

1. Leave phase-1 scope implicit across multiple strategy files.
2. Treat all roadmap ideas as near-term delivery work.
3. Defer scope locking until after implementation has already expanded.

## Consequences

Positive:

- Story slicing and acceptance proof become more stable.
- The team can protect the first release from scope inflation.
- Future initiatives have a cleaner starting point.

Tradeoffs:

- Some stakeholder expectations may need explicit re-confirmation if they assumed broader delivery.
- Lead-oriented features now require explicit intake rather than slipping into unrelated stories.

## Follow-Up

- Keep phase-1 stories linked to this boundary.
- Add a separate initiative or story packet before committing lead capture, tracking, or ops expansion.
