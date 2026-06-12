# Product Docs

This folder is no longer empty-by-default for `WingsTravel`.

Start from:

- `docs/product/WingsTravel-context.md`
- `docs/product/phase-1-scope.md`
- `docs/product/multisite-platform.md`
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

- `WingsTravel-context.md`: source hierarchy and high-level project direction
- `phase-1-scope.md`: locked phase-1 contract and out-of-scope boundary
- `multisite-platform.md`: site model, platform rules, and environment topology
- `editorial-operations.md`: minimum CMS and editorial behaviors
- `acceptance-and-kpis.md`: acceptance baseline and KPI shape
- `ai-agent-seo-and-theme.md`: AI-agent-oriented SEO direction and theme-system requirement
- `ai-agent-seo-implementation-checklist.md`: engineering checklist for implementing AI Agent SEO in `app/`
- `cms-theme-management.md`: CMS-managed multisite theme presets, tokens, admin UI, and validation contract

## Update Rule

When behavior changes:

1. Update the affected product doc here when the change is part of the durable product contract.
2. Update or create the related story packet.
3. Update durable proof status with `scripts/harness story add` or `scripts/harness story update`.
4. Record a decision if the change affects architecture, scope, risk, or a previously settled product rule.
