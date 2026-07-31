# WingSide group-commerce lifecycle

The production lifecycle is intentionally split into immutable artifacts. All
database phases require `PAYLOAD_DB_PUSH=false`; mutation phases additionally
require the production release guard, an encrypted backup plus restore drill,
the exact confirmation token, and a trusted super-admin.

## Create the linked plan pair

Capture fresh source evidence first, then create the full and canary plans in
one invocation. The command reads one Payload snapshot and derives the canary
from that exact full plan:

```text
pnpm run lifecycle:wingsside:group-commerce -- plan \
  --release-sha <40-hex-release-sha> \
  --evidence <fresh-evidence.json> \
  --canary 63 \
  --output <full-plan.json> \
  --canary-output <canary-plan.json>
```

`--canary` without `--canary-output` is rejected. Do not run `plan` twice to
obtain the two files: snapshot and creation timestamps would differ, so the
canary would not be linked to the promoted full plan.

## Canary apply and attestation

Apply the canary with `--parent-plan <full-plan.json>`, persist its receipt,
then create the attestation:

```text
pnpm run lifecycle:wingsside:group-commerce -- attest-canary \
  --release-sha <40-hex-release-sha> \
  --plan <canary-plan.json> \
  --plan-sha256 <canary-plan-sha256> \
  --parent-plan <full-plan.json> \
  --receipt <canary-receipt.json> \
  --output <canary-attestation.json>
```

`attest-canary` performs a fresh database `verify after` before writing the
artifact. The attestation binds the release, full plan, canary plan, exact
apply receipt, source evidence, product postimage and verification result.

Full apply requires all of:

```text
--canary-plan <canary-plan.json>
--canary-plan-sha256 <canary-plan-sha256>
--canary-receipt <canary-receipt.json>
--canary-attestation <canary-attestation.json>
--canary-attestation-sha256 <canary-attestation-sha256>
```

The supplied attestation SHA must also equal the protected environment value
`WINGSSIDE_GROUP_COMMERCE_CANARY_ATTESTATION_SHA256`. Immediately before the
full transaction, the CLI re-verifies that the canary remains at its exact
after-state. Rollback does not require a current attestation, so expiry or a
failed promotion cannot lock out recovery.

## Backup binding

One verified encrypted backup may cover both canary and full mutation because
both derive from one preimage snapshot. Its manifest must bind
`intendedPlanSha256` to the **full plan SHA**, never to the canary SHA.

For every canary and full mutation:

- `--backup-binding-sha256` is supplied internally as the full plan SHA;
- `WINGSSIDE_RELEASE_BACKUP_BINDING_SHA256` must equal that full plan SHA;
- the backup manifest `intendedPlanSha256` must equal that full plan SHA;
- `WINGSSIDE_TOUR_EDITORIAL_PLAN_SHA256` still binds the plan currently being
  executed (canary SHA for canary, full SHA for full).

This separates immutable backup scope from the active mutation artifact while
preventing one backup from being ambiguously reused for an unrelated plan.

