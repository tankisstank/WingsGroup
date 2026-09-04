# US-064 Exec Plan

## Goal

Deliver a privacy-aware, site-scoped lead intake with safe consultation-channel
behavior and verifiable delivery failure handling.

## Scope

In scope:

- Client and server parsing/validation.
- Consent, preferred-channel state, error preservation, and audit context.
- Configured/unconfigured/disabled external channel behavior.
- Accessibility, abuse controls, and provider-failure proof.

Out of scope:

- CRM, chatbot, booking, payment, or real automated lead sends in tests.

## Risk Classification

Risk flags:

- Data model.
- Audit/security.
- External systems.
- Public contracts.
- Existing behavior.
- Multi-domain.

Hard gates:

- Privacy/security.
- External provider behavior.

## Work Phases

1. Audit the existing form, delivery adapter, consent, and site-context path.
2. Define validated DTOs, persistence/audit rules, and channel state machine.
3. Implement fail-closed server and accessible client behavior.
4. Add provider success/failure fixtures without sending real leads.
5. Verify legal text and configured endpoints separately before production.
6. Record proof and update Harness.

## Stop Conditions

Pause if retention/legal ownership is unresolved for a production write, if a
provider credential would be exposed, or if validation/audit requirements need
to be weakened.
