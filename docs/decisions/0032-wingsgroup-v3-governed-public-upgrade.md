# 0032 WingsGroup v3 Governed Public Upgrade

Date: 2026-08-13

## Status

Accepted

## Context

Multica issue `WIN-20` supplies a WingsGroup v3 prototype, content and behavior
contract, implementation plan, production audit, and 13 editorial media files.
The package is sufficient to start development but explicitly lacks approved
legal identity, privacy/consent policy, official consultation endpoints,
publishable proof, and verified ecosystem deep links.

The requested upgrade affects the existing public site, Payload schema and
seed data, lead capture, SEO/canonical output, responsive browser behavior,
and multiple tenant boundaries.

## Decision

Create `E09 - Trải nghiệm public WingsGroup v3` as a high-risk initiative and
deliver it through seven ordered story packets, `US-060` through `US-066`.

Keep the existing Payload-first, site-aware multisite architecture. Treat the
prototype as the experience reference and
`docs/product/wingsgroup-v3-public-experience.md` as the durable product
contract. Do not import the prototype as arbitrary CMS HTML or create a
parallel application.

Development may use the supplied editorial assets after local integrity
checks. Production publication remains gated by per-asset source, rights, alt,
site scope, and responsive derivatives. Legal proof, reviews, partner marks,
channel URLs, and brand deep links fail closed until separately approved and
verified.

## Alternatives Considered

1. Implement the prototype as one large story. Rejected because governance,
   schema, UI, lead capture, route migration, and release proof need separate
   stop conditions and evidence.
2. Paste the prototype HTML/CSS/JavaScript into Payload. Rejected because it
   bypasses governed block schemas, site scope, accessibility, and reusable
   frontend contracts.
3. Delay all development until every legal and business input exists. Rejected
   because UI and safe pending states can be implemented without publishing
   unverified claims or endpoints.

## Consequences

Positive:

- The initiative can progress in bounded vertical slices with explicit proof.
- Missing business/legal inputs cannot silently become public claims.
- WingsGroup remains aligned with the shared multisite architecture.

Tradeoffs:

- Go-live may remain blocked after UI implementation is complete.
- New structured fields or blocks require migration and PostgreSQL rehearsal.
- Three trackers must be kept consistent until the tracking transition is
  formally completed.

## Follow-Up

- Register E09 and US-060 through US-066 in Harness and Plane.
- Use WIN-20 as the Multica Epic parent and create seven staged children.
- Reconcile the WingsGroup logo export documentation before implementation.
- Record business/legal approvals as evidence, not assumptions.
