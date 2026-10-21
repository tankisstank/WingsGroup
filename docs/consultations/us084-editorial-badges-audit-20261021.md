What this change does: US-084 adds localized editorial badges to tour products, normalizes them into shared card DTOs, renders hot/sticker treatments, and invalidates tenant-scoped caches. The overall design is sound, but the release is **not approved** due to one locale blocker and two high-priority gaps.

## P1 — Blocker

1. **Vietnamese badges can leak onto English market routes** ([queries.ts](E:/repo/WingsTravel/app/src/tours/queries.ts:533), [payload.config.ts](E:/repo/WingsTravel/app/src/payload.config.ts:236))

   - **What this is:** `getToursByMarketRoute` supplies `locale: 'en'` but leaves `fallbackLocale` undefined for both product and departure queries.
   - **Problem:** Payload has `fallback: true` and Vietnamese as the default locale. If an English badge label is missing, Payload can return the Vietnamese fallback as a plain string. `normalizeEditorialBadges` then accepts that string because normal Payload output does not include `_locale`.
   - **Fix:** Pass `fallbackLocale: locale === 'en' ? false : 'vi'` to both queries. Add an integration test with an English request and a Vietnamese-only badge.
   - **If skipped:** `/en/thi-truong/...` can display Vietnamese sticker text and activate the hot border, violating the explicit zero-leakage requirement.

## P2 — High

2. **Long commercial promo labels can overlap editorial stickers** ([WingsGoTourCard.tsx](E:/repo/WingsTravel/app/src/tours/WingsGoTourCard.tsx:61), [StructuredPages.tsx](E:/repo/WingsTravel/app/src/tours/StructuredPages.tsx:3643), [PromotionPrice.tsx](E:/repo/WingsTravel/app/src/tours/PromotionPrice.tsx:9))

   - **What this is:** Left stickers reserve a fixed `140px`, while the top-right promo badge has no width cap and permits wrapping.
   - **Problem:** A long CMS promo label can occupy most of a narrow card and extend into the reserved sticker area. The component test only checks class names, not actual geometry.
   - **Fix:** Put both badge groups in one `inset-x-3` flex overlay with a gap and constrained right column, or explicitly cap the promo width. Verify a narrow mobile card using long labels.
   - **If skipped:** Stickers and commercial promotions can cover each other despite the stated collision-avoidance contract.

3. **There is no recorded pre-deployment or database proof** ([validation.md](E:/repo/WingsTravel/docs/stories/epics/E07-tour-product-platform/US-084-wingsgo-editorial-card-badges/validation.md:1), [editorialBadgesIntegration.int.spec.ts](E:/repo/WingsTravel/app/tests/int/editorialBadgesIntegration.int.spec.ts:1))

   - **What this is:** The validation record marks every gate “Chưa chạy”. The integration suite mocks `payload.find`; it does not exercise Payload, PostgreSQL, SQLite, or migrations.
   - **Problem:** The four new tables, localized rows, version restoration, and migration rollback have no executable release evidence.
   - **Fix:** Rehearse migration up, localized create/update/draft restore, cascade deletion, and migration down on disposable PostgreSQL and temporary SQLite. Also capture desktop/mobile browser evidence.
   - **If skipped:** Schema or responsive-layout failures may first appear during staging deployment.

## P3 — Minor

4. **SQLite version-locale parent type differs from the Payload/PostgreSQL schema** ([repairLocalSQLiteSchema.ts](E:/repo/WingsTravel/app/src/utilities/repairLocalSQLiteSchema.ts:732), [PostgreSQL migration](E:/repo/WingsTravel/app/src/migrations/20261021_120000_tour_editorial_badges.ts:37))

   - **What this is:** `_tour_products_v_version_editorial_badges_locales._parent_id` is `TEXT` locally but `integer` in PostgreSQL and existing Payload version-array conventions.
   - **Problem:** SQLite normally coerces this value, but the bootstrap schema no longer faithfully matches the adapter schema.
   - **Fix:** Change the SQLite column to `INTEGER NOT NULL`.
   - **If skipped:** Current SQLite may work, but schema comparison or stricter tooling can report drift or reject the relationship.

5. **PostgreSQL enum existence checks are not schema-scoped** ([migration](E:/repo/WingsTravel/app/src/migrations/20261021_120000_tour_editorial_badges.ts:5))

   - **What this is:** The migration checks only `pg_type.typname`.
   - **Problem:** A same-named type in another schema makes the migration skip creating the required `public` type.
   - **Fix:** Use `to_regtype('public.enum_tour_products_editorial_badges_kind')` or join `pg_namespace` and require `public`.
   - **If skipped:** This only fails on databases containing a same-named type outside `public`, so the risk is low but avoidable.

## Clean / Approved areas

- Maximum three badges, enum validation, duplicate-kind rejection, and defensive normalization are correct.
- WingsGo catalog queries are site-scoped and disable Vietnamese fallback for English.
- Market queries use `appendSiteWhere`, preventing WingsGo data from crossing into WingSide or WingsGroup.
- Redis invalidation scans only `wingsgo-curation:<siteID>:*`, clears both current and previous sites, and contains no `FLUSHALL` or `FLUSHDB`.
- The hot border is an outward 2px masked pseudo-element, so it does not change card dimensions.
- Reduced-motion handling disables the rainbow animation.
- PostgreSQL migration registration, foreign keys, cascade behavior, indexes, and rollback order otherwise match existing Payload conventions.
- No meaningful new check-then-write race was found.

**Verdict: Do not ship. Fix findings 1 and 2, then complete the release evidence in finding 3.**

Skipped: I made no edits and did not execute tests, browser QA, migrations, or environment-dependent commands, as requested. Residual risk remains until PostgreSQL, SQLite, and real responsive rendering are exercised.