# US-069 Exec Plan

## Goal

Deliver a consent-aware, tenant-scoped GA4 and Google Ads tracking foundation
for the six production public domains, with a deterministic event contract,
safe attribution, evidence-backed rollout, and reversible production control.

## Scope

In scope:

- Account/stream/conversion inventory and site-to-ID mapping.
- Site-scoped tracking configuration and a shared public tracking adapter.
- GA4 page and funnel events, Google Ads lead conversion mapping, and contact
  channel events.
- Purpose-specific consent behavior, UTM/click attribution, PII guardrails, and
  CSP allowlisting.
- Unit, integration, browser, platform, and production-shaped verification.
- WingsGo pilot, staged enablement for the remaining production sites, monitoring
  review, rollback runbook, and handover documentation.

Out of scope:

- Meta/Facebook Pixel.
- CRM, booking, payment, sales qualification, purchase/revenue tracking, or
  advanced reporting dashboards.
- Enhanced Conversions or server-side Measurement Protocol without a separately
  approved data/privacy design.
- Real customer lead submission during automated validation.

## Risk Classification

Risk flags:

- External systems/provider behavior.
- Audit/security and privacy/consent.
- Public contracts and existing production behavior.
- Cross-platform browser and multi-domain routing.
- Data model change if attribution is persisted with submissions.
- Weak proof risk until provider and consent checks are executed.
- Multi-domain tenant isolation.

Hard gates:

- Approved Google account ownership/access and exact site-to-ID matrix.
- Legal/product approval for cookie, analytics, advertising, and privacy copy.
- No PII or sensitive claim data sent to Google.
- No duplicate tag/conversion path.
- No production enablement until staging and pilot evidence pass.
- No requirement or validation gate may be weakened to make provider tests pass.

## Work Phases

1. Confirm the meaning of “Google Pixel”, provider ownership, six production
   domains, GA4 property/stream structure, Ads conversion actions, and whether
   cross-domain measurement is required.
2. Freeze the event dictionary, conversion semantics, attribution fields,
   consent states, retention rules, and site-scoped configuration contract.
3. Implement the shared tracking adapter, site settings, route-change handling,
   form/CTA/contact events, consent shell, attribution parser, and CSP changes.
4. Add unit/integration/component/E2E assertions for event shape, tenant
   isolation, consent denial/grant/revoke, duplicate prevention, and no-PII
   payloads.
5. Run lint, typecheck, tests, build, local go-live review, and PostgreSQL
   migration rehearsal if the form-submission schema changes.
6. Validate staging with GA4 DebugView/Realtime, Tag Assistant, browser Network
   inspection, Ads diagnostics, and all locale/route matrices.
7. Enable WingsGo as the pilot, review 24–48 hours of event health, then enable
   the remaining sites in the approved order.
8. Record evidence, update handover/runbook, and synchronize Harness and Plane.

## Stop Conditions

Pause for human confirmation if:

- Account ownership, IDs, conversion meaning, or cross-domain behavior is unclear.
- Privacy/cookie consent copy or legal approval is missing.
- A proposed event contains PII, sensitive insurance/claim data, or raw free text.
- The current accepted lead response is being treated as delivered/qualified
  without a separately verified delivery signal.
- A migration, production configuration write, or provider-side change lacks a
  backup/rollback or explicit authorization.
- Consent denial, CSP, tenant isolation, or duplicate-event checks fail.
