# US-062 Exec Plan

## Goal

Implement the tenant-scoped WingsGroup v3 shell and hero as the visual and
interaction baseline for later routes.

## Scope

In scope:

- Header, desktop/mobile navigation, locale control, and footer shell.
- Governed `wingsgroup-editorial` hero presentation.
- Accessible carousel and responsive/no-leak validation.

Out of scope:

- Remaining homepage sections and corporate routes.

## Risk Classification

Risk flags:

- Public contracts.
- Cross-platform.
- Existing behavior.
- Weak proof for the new interaction.
- Multi-domain.

Hard gates:

- None beyond upstream logo and channel approval gates.

## Work Phases

1. Audit reusable shell, theme, and hero capabilities.
2. Reconcile design tokens and runtime logo approval.
3. Implement tenant-scoped shell and hero variant.
4. Add component/integration/E2E coverage.
5. Capture required desktop/mobile evidence and no-leak proof.
6. Update Harness.

## Stop Conditions

Pause if the logo/token source remains contradictory, a global shell change is
required, or reduced-motion/accessibility requirements would be weakened.
