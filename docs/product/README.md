# Product Docs

This folder is no longer empty-by-default for `WingsGroup`.

Start from:

- `docs/product/WingsGroup-context.md`
- `docs/product/phase-1-scope.md`
- `docs/product/multisite-platform.md`
- `docs/product/wingsgroup-v3-public-experience.md`
- `docs/product/wingsgroup-v3-release-gates.md`
- `docs/product/wingsgroup-v3-media-manifest.md`
- `docs/product/editorial-operations.md`
- `docs/product/acceptance-and-kpis.md`
- `docs/product/ai-agent-seo-and-theme.md`
- `docs/product/ai-agent-seo-implementation-checklist.md`
- `docs/product/cms-theme-management.md`
- `source/strategy/19 Kiến trúc đề xuất nội bộ WingsTravel Payload.md`
- `source/strategy/20 Kiến trúc đề xuất gửi khách hàng WingsTravel.md`

Use this folder for smaller living product docs derived from the current
strategy sources.

Current seed set:

- `WingsGroup-context.md`: source hierarchy and high-level project direction
- `phase-1-scope.md`: locked phase-1 contract and out-of-scope boundary
- `multisite-platform.md`: site model, platform rules, and environment topology
- `wingsgroup-v3-public-experience.md`: governed public experience, data/CTA/media contracts, and go-live gates for E09
- `wingsgroup-v3-release-gates.md`: fail-closed release-gate register and checker contract for US-060
- `wingsgroup-v3-media-manifest.md`: licensed handoff media, provenance, bilingual alt text, and publication controls
- `editorial-operations.md`: minimum CMS and editorial behaviors
- `acceptance-and-kpis.md`: acceptance baseline and KPI shape
- `ai-agent-seo-and-theme.md`: AI-agent-oriented SEO direction and theme-system requirement
- `ai-agent-seo-implementation-checklist.md`: engineering checklist for implementing AI Agent SEO in `app/`
- `cms-theme-management.md`: CMS-managed multisite theme presets, tokens, admin UI, and validation contract
- `layout-preset-library.md`: governed CMS page layout preset and block presentation library
- `tour-product-platform.md`: structured tour product model and governed tour detail builder contract for price-first travel pages
- `tour-detail-builder-foundation.md`: governed section registry and builder-ready admin foundation for tour detail pages
- `tour-variant-model.md`: bounded override model for departure variants
- `tour-editorial-operations.md`: editor workflow for tours, departures, and variants
- `tour-import-mapping.md`: mapping rules from sheets, docs, and poster assets into structured tour records
- `wingsside-tour-discovery-and-taxonomy.md`: controlled destination/style
  taxonomy, CMS curation, and real-tour projection for WingSide discovery cards
- `wingside-identity-contract.md`: canonical public name, tenant code, local
  alias and intentionally separate theme identifiers for `wingside.vn`

## Local Admin Credential

Local seed/bootstrap scripts create this super-admin account for CMS review and
development when it does not exist yet:

- Email: `local-admin@wingsgroup.test`
- Password: the value of `LOCAL_ADMIN_PASSWORD`. When it is unset on a local
  `file:` SQLite database, the development default `test` is used.

The account is code-owned in `app/src/utilities/adminSeed.ts`
(`ensureLocalAdminUser`). It refuses to run when `NODE_ENV=production` or when
the database is not a local `file:` SQLite URL. Disposable PostgreSQL harnesses
(E2E, CRUD proofs, rehearsals) opt in with
`LOCAL_ADMIN_SEED_ALLOW_DISPOSABLE_POSTGRES=true`; without `LOCAL_ADMIN_PASSWORD`
they get a random password. An existing account is never reset: its password
and role are left unchanged.

## Update Rule

When behavior changes:

1. Update the affected product doc here when the change is part of the durable product contract.
2. Update or create the related story packet.
3. Update durable proof status with `scripts/harness story add` or `scripts/harness story update`.
4. Record a decision if the change affects architecture, scope, risk, or a previously settled product rule.
