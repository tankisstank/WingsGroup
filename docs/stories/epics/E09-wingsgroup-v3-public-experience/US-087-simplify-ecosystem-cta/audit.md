# US-087 — Codex Consultation

## Planning Checkpoint — 2026-10-26, before code

Transcript/result: `ecosystem-cta-simplification-20261026/planning-review.md`.

No P1. Plan approved with:

- P2 raw URL normalization: resolved with shared isSafeHTTPSURL helper. Raw control characters/backslashes are rejected before trimming or parsing; HTTPS, hostname and no credentials required. The same helper is used by CMS/runtime. Eighteen URL cases verify parity.
- P2 schema push could drop retained columns: types generated with PAYLOAD_DB_PUSH=false and PAYLOAD_SKIP_LOCAL_SQLITE_REPAIR=true. No migration/drop or database apply performed. Both historical live/version tables define the five columns nullable; they remain on disk. Before any rollout, retain schema push=false and verify disposable database save/read/version restore. This release check remains open.
- P3 case-sensitive HTTPS rendering: resolved by branching on the resolver's isFallback result. Component test exercises uppercase HTTPS and switches back to contact fallback.

## Final Focused Review

Result: **SHIP LOCAL**, no concrete P1/P2/P3 in supplied changes. Review used complete scoped diff/helper; reviewer did not execute tests. Result: `ecosystem-cta-simplification-20261026/final-review.md`.

## Residual Scope

Removing the evidence gate can activate existing stored website-mode URLs that previously fell back for lack of evidence; this is intended behavior, and live destinations must be inventoried before rollout. Local unit/component/integration and platform checks do not prove production readiness. No CMS browser save, PostgreSQL/version roundtrip, staging/production deployment or external destination checks were performed. US remains pending those acceptance checks; no release closure claimed.
