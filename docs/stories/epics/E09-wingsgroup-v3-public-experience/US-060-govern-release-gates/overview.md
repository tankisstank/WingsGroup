# US-060: Chốt governance và release gates WingsGroup v3

## Status

implemented

## Lane

high-risk

## External Tracking

- Multica: `WIN-28`, child of `WIN-20`.

## Current Behavior

The v3 handoff identifies unresolved legal identity, privacy/consent,
consultation channels, proof permissions, brand domains, and logo approval.
These constraints exist in prose but are not yet one executable release
decision contract.

## Target Behavior

Product, legal, content, and release owners have an explicit decision register
and fail-closed rules. Development can proceed with pending states, while no
unverified claim, endpoint, deep link, locale, or asset can silently pass
production release.

## User Story

As a release owner, I want every unresolved business and legal dependency to
have an owner, state, evidence requirement, and fail-closed behavior so that UI
development cannot be mistaken for go-live approval.

## Acceptance Criteria

- Record the approved legal entity and brand-relationship wording, or retain an explicit blocking state.
- Record the approved `wingsgroup-privacy-v1` policy routes, mandatory
  `wingsgroup-contact-v1` consent, 24-month retention period,
  `info@doicanhviet.com` data-subject contact, and permitted same-organization
  consultation routing.
- Keep external consultation channels in `chờ cập nhật` while unconfigured; when enabled, require URL, owner, SLA, and tracking. The built-in consent-aware form remains the required non-blocking consultation path.
- Define proof publication fields and prevent publication without source, context/date, and permission.
- Define the HTTP, canonical, tracking, and owner checks required before enabling each ecosystem deep link.
- Reconcile the WingsGroup logo export and brand-token source before runtime adoption.
- Publish a release-gate checklist consumed by US-061 through US-066.

## Affected Product Docs

- `docs/product/wingsgroup-v3-public-experience.md`
- `docs/product/WingsGroup-context.md`
- `docs/product/multisite-platform.md`
- `source/brand/visual-identity/sites/wingsgroup.md`
- `docs/product/wingsgroup-v3-release-gates.md`

## Dependencies

- Business/legal owners can provide approvals or explicitly accept a pending state.

## Gate Checkpoint

- `legal-identity`: approved on 2026-08-13 from stakeholder-provided legal
  identity and public brand-relationship wording.
- Mandatory gates recorded for the live release are approved. Consultation
  channels, proof publication and ecosystem deep links are explicitly
  non-blocking pending states with form/pending fallbacks.

## Non-Goals

- Implementing UI or schema.
- Inventing legal text, channel URLs, proof, or publication rights.
- Promoting any release.
