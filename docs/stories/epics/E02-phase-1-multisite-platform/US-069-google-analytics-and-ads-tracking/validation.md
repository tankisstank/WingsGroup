# US-069 Validation

## Proof Strategy

Prove the provider configuration, tenant/site mapping, consent behavior, event
semantics, attribution boundaries, no-PII contract, CSP compatibility, and
production rollout/rollback behavior without sending a real customer lead.

## Test Plan

| Layer | Cases |
| --- | --- |
| Unit | ID/label validation, event allowlist, parameter bounds, public path normalization, UTM/click parsing, consent state transitions, and deduplication. |
| Integration | Site context to tracking config, locale/site mapping, form accepted/error responses, accepted-vs-delivered semantics, attribution persistence, and CSP configuration. |
| Component | Tracking provider, consent banner, route-change listener, CTA/contact event helpers, and form event integration. |
| E2E | Six production host identities or host-header fixtures; home, content, landing, tour/service, contact, locale routes; consent grant/deny/revoke; form success/error/retry; phone/email/Zalo clicks; no duplicate page or lead events. |
| Platform | GA4 DebugView/Realtime, Google Tag Assistant, Ads conversion diagnostics, browser Network inspection, CSP reports, HTTPS, performance, and disabled-site kill switch. |
| Performance | No material blocking render regression, bounded third-party script cost, no duplicate provider requests, and no route-transition event storm. |
| Logs/Audit | No PII/secrets/raw form values; site code, actor, config result, consent-safe outcome, and rollout evidence are present where required. |

## Fixtures

- Six active site records with correct production domains and distinct tracking IDs.
- Disabled, missing, malformed, and cross-tenant tracking configurations.
- Consent states: undecided, analytics denied, advertising denied, granted, and
  revoked.
- Accepted, validation-failed, rate-limited, provider-unavailable, and duplicate
  form responses.
- Safe and adversarial UTM/click values, including overlong and PII-like values.
- Page, campaign, tour, service, contact, locale, and rewritten local-path cases.
- Google provider test/debug configuration that cannot submit a real lead.

## Commands

```text
cd app
pnpm lint
pnpm test:unit
pnpm test:component
pnpm test:int
pnpm test:e2e
pnpm build
pnpm go-live:review -- --site wingsgo
pnpm go-live:review -- --site wingside
pnpm go-live:review -- --site wingsplus
pnpm go-live:review -- --site wingspass
pnpm go-live:review -- --site wingscare
pnpm go-live:review -- --site wingsgroup
```

Add story-specific tracking tests, migration smoke, provider debug evidence,
production host probes, and rollback command output before implementation is
marked complete.

## Acceptance Evidence

Planning packet created on 2026-09-01. No implementation, provider validation,
production enablement, or customer-approved account/consent evidence exists yet.
