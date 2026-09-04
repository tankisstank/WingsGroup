# US-060 Validation

## Proof Strategy

Prove that every handoff blocker has an explicit state, owner or requested
owner, evidence requirement, downstream consumer, and fail-closed behavior.

## Test Plan

| Layer | Cases |
| --- | --- |
| Unit | Gate state and mandatory-field validation when executable helpers exist. |
| Integration | Product contract and downstream stories reference the same gate keys and fallbacks. |
| E2E | N/A until UI consumes gate state; covered by downstream stories. |
| Platform | Release checklist fails when a mandatory gate is pending. |
| Performance | N/A. |
| Logs/Audit | Gate decisions retain timestamp and non-sensitive evidence reference. |

## Fixtures

- One approved gate.
- One pending gate.
- One configured and one unconfigured consultation channel.
- One publishable and one non-publishable proof record.

## Commands

```text
scripts/harness query matrix
pnpm run validate:wingsgroup:v3-gates
node --test scripts/wingsgroup-v3-release-gates.test.mjs
pnpm run go-live:review -- --site wingsgroup
```

## Acceptance Evidence

The versioned gate register and fail-closed checker are implemented. Legal
identity, privacy/consent, bilingual locale inventory, governed editorial media
and runtime brand source are approved with non-sensitive evidence references.
External channels, proof publication and deep links remain non-blocking
pending states: they must retain their form or pending fallback and may not
publish an endpoint, trust claim or destination without their own evidence.
