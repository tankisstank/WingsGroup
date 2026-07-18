# US-046 Exec Plan

## Goal

Deliver the approved WingSide hi-fi posture and a complete consultative tour
detail for the existing 22 published products without tenant leakage or WingsGo
retail capability leakage.

## Scope

In scope:

- Open Design token bridge, Home hierarchy, packages alignment and desktop Specials.
- Dedicated WingSide capability, view model, locale copy and renderer.
- Same-site Page wrapper and TourProduct gate with controlled related pages.
- Exact technical-copy cleanup with immutable plan and rollback report.
- Targeted and full validation, browser evidence and controlled release preparation.

Out of scope:

- Re-crawl or re-import.
- New pricing/departure data or schema.
- Mobile Specials bar.
- Production mutation before full gates and backup are confirmed.

## Risk Classification

Risk flags:

- Authorization and tenant scope.
- Data cleanup/rollback.
- Public contracts and SEO.
- Existing WingsGo behavior.
- Multi-domain desktop/mobile/runtime validation.

Hard gates:

- Data mutation must remain batch/site scoped and PostgreSQL-transactional.
- Same-site published wrapper/product boundary cannot be weakened.
- Full release gates and production backup must precede deployment.

## Work Phases

1. Audit current route, data artifact and Open Design hi-fi source.
2. Isolate implementation in a dedicated worktree and add trusted site context.
3. Bridge tokens/Home/Specials and implement structured WingSide tour detail.
4. Add fail-closed cleanup planner/apply/resume/rollback and adapter proofs.
5. Run full gates and browser regression/smoke.
6. Update Harness/Plane evidence.
7. Back up, dry-run, apply, deploy and smoke production only after all gates pass.

## Stop Conditions

Pause before production if:

- Any full gate fails without an established unrelated pre-existing cause.
- Scope is not exactly 22 published products with 22 distinct same-site wrappers.
- PostgreSQL transaction, backup encryption/checksum or rollback report is unavailable.
- Browser smoke finds tenant leakage, broken media, retail copy or serious public errors.

