# US-055 R7 continuation — D7-A and source restoration gate

## D7-A definition

`D7-A` is the accepted canary-promotion release mode for US-055. It is not a
content package and it is not a locale package. It means the release must be
promoted through a controlled production path:

- immutable release SHA and image;
- exact production-target backup and restore-drill evidence;
- signed/checksum-bound data plans;
- canary health, tenant, locale, enquiry and media checks;
- promotion only after green evidence, otherwise rollback.

## Current finding

The owner accepted the current media set and approved continuing. The next
blocked gate is not media. The approved `catalog-v2.json` cannot be applied to
the current production source inventory because the source rows have drifted.

Evidence generated in `evidence/wp1-catalog-r4/`:

- `source-repair-plan-draft.json`
- `source-restoration-plan-draft.json`

Observed production source state:

- current production source checksum matches approved catalog: `0/22`;
- current governed pricing rows: `0/38`;
- approved governed pricing rows in catalog/source snapshot: `38/38`;
- restoring the approved source snapshot would make source checksum match
  catalog: `22/22`.

The drift is mostly in `includes` / `excludes` child rows. It is not safe to
rebase only IDs because the current production source has different row
cardinality and no governed pricing-disclosure rows. That would violate the
accepted `D1-A` decision to preserve every pricing disclosure.

## Resolution direction

Proceed with source restoration before D7-A:

1. create a plan-bound backup after the already-applied US-055 schema migration;
2. restore the WingSide English tour source inventory to the approved
   `source-snapshot.json` baseline for the exact 22 tours;
3. verify `22/22` source checksums match `catalog-v2.json`;
4. create the production locale editorial plan from the approved catalog;
5. apply and verify the locale plan;
6. then resume `D7-A` canary and controlled promotion.

No production source restoration was applied in this R7 documentation step.
