# US-063 Exec Plan

## Goal

Implement the approved v3 homepage composition with governed interactions and
safe pending states.

## Scope

In scope:

- Ecosystem explorer, trust, Proof Archive, editorial rail, and contact entry.
- Structured Page Composer rendering and responsive interaction.
- Pending proof and deep-link fallbacks.

Out of scope:

- Lead submission internals owned by US-064.
- Remaining corporate routes owned by US-065.

## Risk Classification

Risk flags:

- Public contracts.
- Cross-platform.
- Existing behavior.
- Weak proof for new interactions.
- Multi-domain.

Hard gates:

- Publication of claims or proof remains governed by US-060.

## Work Phases

1. Map prototype regions to existing/new governed blocks.
2. Implement ecosystem and pending-proof rendering.
3. Compose the homepage seed/content in the approved order.
4. Add component, integration, E2E, and responsive proof.
5. Review copy/media governance and tenant links.
6. Update Harness.

## Stop Conditions

Pause if implementation would require arbitrary CMS code, duplicate CTAs,
unverified proof, or an enabled destination that has not passed its gate.
