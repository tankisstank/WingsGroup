# BUG-WS-003: WingSide conversion forms lack accessible controls

## Classification

- Type: accessibility defect
- Severity: P0 release blocker
- Owner story: US-053
- Audit reference: WS-AUD-002

## Observed Behavior

The audit reports missing label/control associations, an unnamed submit action
and incomplete validation focus behavior on Plan and Contact, especially in the
Vietnamese flow.

## Expected Behavior

Every field and action has a meaningful localized accessible name in
EN/VI/IT/ES/PT, inline errors are programmatically associated, failed
validation moves focus predictably, keyboard order is linear and interactive
targets are at least 44px.

## Fix Contract

- Keep the Payload form and site-aware inquiry context contract.
- Validate semantics and keyboard behavior at 390px and 1440px.
- Do not submit a real lead during automated or production QA.

## Closure Evidence

Local implementation evidence recorded on 2026-07-25:

- Public form copy is typed for EN/VI/IT/ES/PT, including field labels,
  required labels/messages, submit, loading, error and success states.
- Form fields now derive stable IDs from `formID + fieldName`.
- Text, email, number, textarea, checkbox, country, state and generic select
  controls consistently expose `aria-invalid` and `aria-describedby` when
  invalid.
- Failed client validation focuses the first invalid control. Server-side
  submission errors remain a focused `role="alert"` and Turnstile,
  honeypot, idempotency and `/api/lead-submissions` endpoint behavior were
  preserved.
- Radix Select remains the select implementation; checkbox validation now uses
  React Hook Form `Controller`.
- Shared input/select controls now use `min-h-11` for 44px touch targets.
- Tests:
  - `pnpm exec vitest run --config ./vitest.component.config.mts tests/component/leadForm.component.spec.tsx`
    PASS, 4 tests.
  - `pnpm run test:component` PASS, 48 tests.
  - `pnpm run build` PASS.

No real lead was submitted. Production browser accessibility proof remains
pending.

Correction cycle 1 local evidence recorded on 2026-07-26:

- Form regression remained green after SEO/content corrections:
  `pnpm exec vitest run --config ./vitest.component.config.mts tests/component/leadForm.component.spec.tsx`
  PASS, 4 tests.
- No endpoint, honeypot, idempotency, Turnstile or real lead submission behavior
  was changed in this correction cycle.
