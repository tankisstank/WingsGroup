# US-026 WingsSide inbound audit and story setup

## Status

implemented

## Lane

normal

## Product Contract

The WingsSide inbound initiative has a registered Harness story set, an epic
folder, and an audit evidence file that identifies locale, block, hero, and
content risks before implementation work starts.

## Relevant Product Docs

- `docs/product/wingsside-inbound-visual-and-motion-upgrade.md`
- `docs/product/wingsside-inbound-implementation-plan.md`
- `docs/stories/epics/E08-wingsside-inbound-upgrade/audit.md`

## Acceptance Criteria

- US-026 through US-034 are registered in Harness. Registration only proves the
  story IDs exist; downstream stories are marked implemented separately after
  their own evidence is complete.
- E08 story folder exists.
- Locale hardcode audit is summarized with file-level risks.
- Block reuse decisions are documented.
- Hero reuse decision is documented and points to `app/src/heros/config.ts`.
- Content source and launch locale rules are documented.

## Design Notes

- Commands: `scripts/harness.ps1 story add`, `rg` audit commands.
- Domain rules: no implementation may use `app/src/tours/sectionRegistry.ts` as
  the Page Composer registry.
- UI surfaces: not modified in this story.

## Validation

| Layer | Expected proof |
| --- | --- |
| Unit | Not applicable |
| Integration | Harness story registration and audit file |
| E2E | Not applicable |
| Platform | `scripts/harness.ps1 query matrix` shows US-026..US-034 registered |
| Release | Downstream stories use this audit before code changes |

## Harness Delta

Added story records US-026 through US-034. This does not assert every story in
that range is implemented.

## Evidence

- `scripts/harness.ps1 story add --id US-026 ...` through US-034 completed.
- `docs/stories/epics/E08-wingsside-inbound-upgrade/audit.md` created.
