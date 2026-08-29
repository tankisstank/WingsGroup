# US-064 Validation

## Proof Strategy

Prove boundary parsing, consent enforcement, tenant isolation, safe channel
states, accessible recovery, provider failure behavior, and non-sensitive audit
output.

## Test Plan

| Layer | Cases |
| --- | --- |
| Unit | DTO parsing, consent, channel state, URL allowlist, and result mapping. |
| Integration | Payload/site context, persistence or delivery adapter, audit event, and provider failure. |
| E2E | Keyboard dialog/form, missing consent, invalid fields, value preservation, configured/unconfigured/disabled channels. |
| Platform | Abuse-control smoke, CSP/external URL policy, and no-real-lead test isolation. |
| Performance | Submit latency and duplicate-submit protection. |
| Logs/Audit | No PII/secrets; request/site/locale/result fields present. |

## Fixtures

- Configured, unconfigured, and disabled channels.
- Approved and missing consent versions.
- Delivery success, rejection, and unavailable adapter responses.
- Forged client site identifier.

## Commands

```text
pnpm lint
pnpm test:int
pnpm test:e2e
pnpm build
```

Provider/live delivery proof is a separate production gate and requires
explicit approval.

## Acceptance Evidence

Implementation is live. Production exposes name, email, phone, need and required consent
fields with direct hotline/email fallback and disabled submit until consent and
required input are present. A real end-to-end submission remains intentionally
unperformed: it requires an authorized test identity and will be recorded as
post-deployment operational acceptance, not fabricated by automation.

On 2026-08-29, production browser smoke confirmed the approved Zalo OA
(`https://zalo.me/4142059657526524531`) in the WingsGroup direct-contact section
and the “Trao đổi với chuyên viên” dialog. The Zalo link opens as an external
channel while the “Để lại nhu cầu” form fallback remains available. Header Zalo
was deliberately removed for WingsGroup; its top navigation retains only the
consultation entry point.
