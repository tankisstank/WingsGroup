You are an expert Principal Systems Architect conducting a mandatory Pre-deployment Release Audit & Consultation Gate for US-084 in the WingsTravel repository before publishing to Oracle Cloud VPS (ARM64 Ubuntu Linux, PostgreSQL 16 Alpine, Redis 7 Alpine, Next.js 15 standalone).

Audit the latest code changes in the workspace:
1. `app/src/collections/TourProducts.ts` (editorialBadges array schema & validator)
2. `app/src/components/TourAuthoring/EditorialBadgeKindField.tsx` (CMS authoring field, nearest last-used label scoped to siteKey+locale+kind, localStorage persistence, mount preservation)
3. `app/src/tours/editorialBadges.ts` (validator, normalizer, storage helper functions, precedence rules)
4. `app/src/tours/wingsGoCatalog.ts` (DTO mapping, locale isolation, fallbackLocale = locale === 'en' ? false : 'vi')
5. `app/src/tours/queries.ts` (queryCollection fallbackLocale)
6. `app/src/tours/WingsGoTourCard.tsx` (anti-collision layout: stickers top-left, promo top-right, hot rainbow border)
7. `app/src/tours/StructuredPages.tsx` (market routes parity with catalog)
8. `app/src/migrations/20261021_120000_tour_editorial_badges.ts` (PostgreSQL migration with public schema scoping on to_regtype, idempotency, IF NOT EXISTS)
9. `app/src/collections/Tours/hooks/revalidateTourContent.ts` (tenant-scoped revalidation for wings-go routes, no global Redis flush)

Perform an exhaustive, critical analysis covering:
1. Race conditions & Concurrency: concurrent edits in CMS, revalidation triggers.
2. Edge cases: missing translation, empty badges, max 3 badges, long badge labels, mobile responsive collision.
3. Cache invalidation & Stale reads: Next.js route revalidation, Redis keys, CDN cache tags.
4. Migration safety on PostgreSQL 16 Alpine: enum creation, table creation, foreign keys, index creation, reversibility, locking risks.
5. Multi-tenant site isolation (`siteField`): verifying badges for WingsGo don't bleed into WingSide or WingsGroup.
6. Zero-downtime cutover & Service disruption: Docker standalone restart, database migration timing before/after app container restart.

Format your response with:
- Summary verdict: APPROVED FOR PRODUCTION / BLOCKED
- Categorized findings: P1 (Blocker), P2 (High), P3 (Minor), or Clean/Pass
- Precise technical recommendations for each finding
- Rollback and operational verification checklist
