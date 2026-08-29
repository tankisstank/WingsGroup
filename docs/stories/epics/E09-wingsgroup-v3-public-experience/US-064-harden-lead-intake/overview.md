# US-064: Hoàn thiện lead intake và consultation channels

## Status

in_progress

## Lane

high-risk

## External Tracking

- Multica: `WIN-32`, child of `WIN-20`.

## Current Behavior

The platform has lead-routing form capability, while the handoff adds need,
preferred channel, consent version/timestamp, and safe Zalo OA, WhatsApp, and
Messenger states. The official **Wingsgroup - Vietwings Travel** Zalo OA is
approved; WhatsApp and Messenger remain pending-update.

## Target Behavior

Visitors can submit a validated WingsGroup consultation request through the
required built-in form and optionally record a preferred channel. Unconfigured
external channels show `Chờ cập nhật` and do not block release; they open only
when configured and approved. Consent and failure handling are explicit,
server-validated, and site-aware.

## User Story

As a visitor seeking human consultation, I want my request and preferred
contact channel handled clearly and safely so that I am not sent to an invalid
endpoint or asked to submit without informed consent.

## Acceptance Criteria

- Collect and server-validate name, need, site, locale, source path, and consent version/timestamp.
- Prevent submission when mandatory consent is absent and preserve entered values after validation or delivery errors.
- Keep WhatsApp and Messenger in `Chờ cập nhật`; the built-in form stays available, and any preferred channel is optional.
- Hide disabled channels and open only approved configured URLs with owner, SLA, and tracking metadata.
- Show the approved Zalo OA in the direct-contact section and consultation dialog; open it in a new tab without replacing the built-in form fallback.
- Use legal-approved policy text/link before production publish.
- Fail closed with a clear retry/contact state when delivery is unavailable; do not claim success.
- Prevent cross-tenant submission context and reject client-forged site identity.
- Pass keyboard, screen-reader, abuse-control, audit, and no-real-lead automated tests.

## Affected Product Docs

- `docs/product/wingsgroup-v3-public-experience.md`
- `docs/product/multisite-platform.md`
- `docs/product/phase-1-scope.md`

## Dependencies

- US-060 consent and channel governance.
- US-061 structured lead/channel fields.
- US-063 contact entry and CTA sources.

## Non-Goals

- CRM pipeline or automated sales workflow.
- Chatbot or embedded multi-provider chat widgets.
- Inventing legal text, contact endpoints, or SLAs.
