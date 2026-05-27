# 0007 Environment Data Topology

Date: 2026-05-25

## Status

Accepted

## Context

The current app uses `SQLite` locally, but the strategy set is already clear
that this is a bootstrap convenience only. A multisite CMS with many editors
needs a durable statement about environment-specific data infrastructure so the
team does not normalize local assumptions into production architecture.

## Decision

Adopt this environment topology:

- local development uses `SQLite`
- staging uses `PostgreSQL`
- production uses `PostgreSQL + Redis`

`Redis` is a support layer for cache and short-lived operational data, not a
replacement for the primary relational store.

## Alternatives Considered

1. Keep `SQLite` across all environments.
2. Use `PostgreSQL` in production without a defined cache or KV support layer.
3. Treat `Redis` as the primary data store for CMS records.

## Consequences

Positive:

- The strategy docs and implementation direction use the same infra story.
- Local bootstrap remains simple without weakening production rules.
- Future performance and multisite scaling work has a stable baseline.

Tradeoffs:

- Production readiness requires more infrastructure than a pure local-style setup.
- Later stories must plan migrations and environment-specific configuration clearly.

## Follow-Up

- Keep production-readiness stories aligned with this topology.
- Add explicit migration and cache strategy stories when production work is selected.
