# English source snapshot review — US-056

## Review result

The current production English inventory was fetched with strict requested-locale semantics (`locale=en`, `fallback-locale=false`, published WingSide scope) and contains exactly 22 tours.

All 22 source checksums differ from the approved `source-manifest.json`. In addition, all 22 tours have different includes/excludes cardinality from the approved locale catalog for each target locale (`vi`, `it`, `es`, `pt`). Itinerary day cardinality remains aligned.

This means the English source has drifted as a content revision, not merely as a stale checksum. The existing four-locale copy cannot be re-approved against the current source without re-aligning the includes/excludes content and obtaining editorial approval for those changes.

## Decision

The 22 current English snapshots are **reviewed but not approved for restore input yet**. The source manifest is intentionally unchanged. Updating it now would make the catalog appear valid while its localized arrays remain structurally incomplete.

## Required next action

1. Compare the current English revision against the previously approved editorial baseline.
2. Decide which English includes/excludes entries are retained, removed, or newly introduced.
3. Translate and review the resulting target-locale arrays.
4. Regenerate the source manifest and rerun the PostgreSQL rehearsal, canary, and strict verification.
