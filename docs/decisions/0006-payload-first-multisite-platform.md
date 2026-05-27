# 0006 Payload-First Multisite Content Platform

Date: 2026-05-25

## Status

Accepted

## Context

`WingsTravel` already has strategy documents and an active Payload-based app
implementation. The remaining ambiguity is not whether the platform uses
Payload, but how narrowly and consistently that choice should constrain future
work.

Without a durable decision, agents or developers can drift into one of two bad
shapes:

- treating the app as a single-site website
- expanding phase 1 into CRM or workflow territory too early

## Decision

Use `Payload-first` as the architecture center for phase 1.

The selected shape is:

- one `Next.js + Payload` codebase
- one multisite-aware CMS and frontend
- Payload as the content core, localization layer, and admin governance layer

Payload is not the default home for full CRM, booking, payment, or complex
operations workflow in phase 1.

## Alternatives Considered

1. Treat the app as a single-site website and defer multisite structure.
2. Split CMS and frontend aggressively before the first site launch.
3. Expand phase 1 to include broad CRM or operations behavior inside Payload.

## Consequences

Positive:

- The current app direction and the product docs stay aligned.
- Multisite concerns become mandatory in future stories.
- Scope control becomes easier because Payload has a defined job.

Tradeoffs:

- Some faster single-site shortcuts should be avoided.
- New stories must actively justify anything that pushes Payload into ops-heavy behavior.

## Follow-Up

- Keep site-aware behavior explicit in product docs and stories.
- Record a new decision before introducing non-content workflows into the core platform.
