# US-055 S3 production continuation — run R6

## Decision Update

- Decision time: 2026-07-29.
- Project-owner instruction: accept the current media set and continue.
- Scope: the existing US-055 media inventory, including the previously
  identified watermark-positive references, is accepted for this release.
- Effect: D4-C is no longer treated as a mandatory replacement/removal blocker
  for D7-A.
- Non-effect: this decision does not disable production write guards, checksum
  binding, backup/restore requirements, signed plan checks, rollback evidence,
  canary validation or post-release QA.

## Gate Reclassification

The R5 media gate remains a truthful audit of the current asset state:

- 586 unique source hashes;
- 366 clean hashes;
- 220 watermark-positive hashes;
- 221 positive references across 21 of 22 tours;
- five affected hero references; and
- 216 affected gallery references.

With the owner's R6 instruction, those findings are now recorded as accepted
publication risk for the current release instead of a ship-stopping D4-C
replacement dependency.

## Remaining Release Work

D7-A can resume only after the release operator completes the remaining
production-safety package:

- publish or otherwise freeze the immutable release source;
- create the exact production-target encrypted PostgreSQL backup;
- run and record a restore drill against a disposable clone target;
- generate the production editorial plan from the checksum-bound catalog-v2
  artifact;
- bind the trusted production environment to the release SHA, catalog SHA, plan
  SHA, backup manifest SHA, restore evidence SHA and rollback release;
- apply and verify the exact production plan;
- deploy the immutable app release through canary;
- run live health, DB/Redis, Home, Tour Detail and five-locale smoke checks; and
- promote or rollback based on the canary result.

Production was not mutated by this documentation update.
