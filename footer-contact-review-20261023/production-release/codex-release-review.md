# Codex release review — US-085 footer

Candidate d6057d41c2b3897b27cbd656356f83873d652870, based on active6a0dac015340f7279bfe352e377193c38b3d0d91. User explicitly authorized footer deployment after local review. Only six application/test files changed; main workspace changes, generated types and unrelated admin import map are excluded.

## Audit

- Multisite: Footer compaction uses existing isWingsGroupV3Surface guard; stylesheet rules require WingsGroup/v3/footer classes. WingsGo/WingSide and non-V3 paths retain their branches. No settings write or cross-site seed.
- Data/schema: no collection, migration, lockfile, dependency, settings or data-flow changes. Existing hotlines resolver validates/deduplicates; V3 raw phone fallback disabled. ProtectedEmailLink retained. CMS-cleared [] does not recreate contacts; undefined preserves existing contact-section fallback.
- Rendering/cache: same server component and settings reads, no new cache key or mutable shared state. Header additional channels remain available. No cache flush or schema migration required for the UI change; fresh app image replaces rendered code.
- Accessibility: native tel link and form preserved,44px call targets and contact focus outline; legal/privacy/navigation remain. No nested controls or new client event handler.
- Findings from implementation review (wrong phoneNumber fixture, duplicated markup, invalid raw fallback, phone icon wrapping) are resolved with focused test/browser evidence; see parent review.md. No open scoped P1/P2/P3 finding.
- Rollback: preserve current release6a0dac0 and pin digest54821addabf22f01d90986cc1fcea3e00e4d842627bf4738729b14d2f3c0b962. Cutover requires exact previous release/image and candidate image/BUILD_ID, automatic app rollback on readiness failure. PostgreSQL/Redis are not restarted. Existing dev-push marker is not removed or confirmed; identical migration inventory means status-only gate, all registered migrations must already be applied.

## Release gates

Proceed only after immutable candidate build/package/ops revision, fresh component and contract checks, encrypted backup plus real disposable restore, migration status, ARM64 native/readiness and candidate UI pass. Current VPS has3.6GB free; remove only this release's uploaded archives/disposable resources, retain historical rollback resources.

Post-cutover: verify public home/contact/corporate VI/EN at320/390/768/1280, form config without submit, header secondary channels, other tenants, exception buffer and active readiness/image. Record actual outcomes in release-report.md. No real calls, chat or lead submission are part of this deployment smoke.

## Agy consultation dispositions

Read agy-release-review.md and component.log:59/59, exit0. Source review agrees with the scoped V3 condition and no schema/data changes. Correct three overstatements: (1) missing main phone alone does not make resolver empty when additional phones remain; it returns configured valid additional phones, consistent with header. (2)44px is the explicit project target; no blanket WCAG conformance claim. (3) rollback must retag the pinned previous immutable image AND restore symlink; symlink alone is insufficient. cutover.sh performs both. No guaranteed rollback duration is asserted. Container restart does not flush Redis; existing settings are unchanged, and public rendering is verified after cutover. Agy's recommendation is not a substitute for remaining operational/browser gates.
