# US-057 Execution plan

1. Extend the additive Payload schema and version tables with tour type and
   departure price basis.
2. Extend normalized discovery/context URL state and retain existing SEO and
   tenant gates.
3. Upgrade the WingSide-only UI and typed card fallback states.
4. Generate types and run scoped regression, migration, locale, type and build
   validation.
5. Classify the exact 22-tour production batch and support hybrid products in
   both group and private discovery without direct booking.
6. Add governed departure freshness, deterministic identity, source
   provenance and an exact-scope production lifecycle with canary and rollback.
7. Rehearse canary and full apply/verify/rollback on ephemeral PostgreSQL,
   including unmanaged and expired departure preservation.

No production mutation is implicit. A fresh source capture, immutable release,
encrypted backup/restore evidence and explicit approval are required at the
production gate.
