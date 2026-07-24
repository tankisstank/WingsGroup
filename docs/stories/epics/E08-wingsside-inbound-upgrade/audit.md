# WS0 audit evidence

## Locale hardcode audit

Command evidence collected on 2026-07-06:

```powershell
rg "Record<'en' \| 'vi'>" app/src
rg "locale === 'en'" app/src
rg "supportedLocaleCodes|SupportedLocaleCode" app/src
rg "locale: 'en' \| 'vi'" app/src
rg "resolvedLocale\?: 'en' \| 'vi'" app/src
```

Summary:

| Pattern | Count | Risk |
| --- | ---: | --- |
| `Record<'en' \| 'vi'>` | 0 | Low; exact pattern absent, but equivalent typed maps exist |
| `locale === 'en'` | 28 | High; new locales would often fall back to Vietnamese copy |
| `supportedLocaleCodes` / `SupportedLocaleCode` | 43 | High; central union currently controls routing, sitemap, hooks and queries |
| `locale: 'en' \| 'vi'` | 9 | High; structured tour components/utilities reject new locale union |
| `resolvedLocale?: 'en' \| 'vi'` | 2 | Medium; Header types are currently binary |

Representative files:

| File | Hardcode type | Risk | Fix strategy | Status |
| --- | --- | --- | --- | --- |
| `app/src/utilities/sitePaths.ts` | `supportedLocaleCodes = ['vi', 'en']` | Routing/sitemap only see 2 locales | Create shared locale metadata and derive public locale lists | fixed in US-031 |
| `app/src/Header/Component.tsx` | primary action copy keyed by `en/vi` | IT/ES/PT CTA may fall back incorrectly | Use locale copy helper with fallback EN | fixed in US-031/US-032 |
| `app/src/Header/Nav/index.tsx` | `resolvedLocale?: 'en' \| 'vi'`, binary copy | Header chrome not locale-safe | Type against shared `SupportedLocaleCode` and fallback copy | fixed in US-031/US-032 |
| `app/src/app/(frontend)/search/page.tsx` | `locale === 'en'` copy | Search page falls back to Vietnamese | Copy map with fallback EN | fixed in US-031 |
| `app/src/search/Component.tsx` | `locale === 'en'` copy | Search UI fallback wrong | Copy map with fallback EN | fixed in US-031 |
| `app/src/blocks/Form/Component.tsx` | `locale === 'en'` submit/error copy | Lead forms show Vietnamese for European users | Copy map with fallback EN | fixed in US-031 |
| `app/src/utilities/breadcrumbs.ts` | `locale === 'en'` labels | Breadcrumb labels wrong | Copy map with fallback EN; legacy no-locale path still defaults to Vietnamese | fixed in US-031 |
| `app/src/components/Card/index.tsx` | `locale === 'en'` labels | Card CTA/category fallback wrong | Copy map with fallback EN | fixed in US-031 |
| `app/src/components/RelatedPages.tsx` | typed `en/vi` behavior | Related page chrome not locale-safe | Use shared locale type and fallback copy | fixed in US-031 |
| `app/src/tours/utils.ts` | `locale: 'en' \| 'vi'` | Intl/date/availability reject new locales | Use shared locale metadata and Intl locale map | fixed in US-031 |
| `app/src/tours/StructuredPages.tsx` | multiple `locale: 'en' \| 'vi'` | Structured tour pages block typegen/compile | Replace with supported/copy locale contract where needed | fixed/intentional in US-031 |
| `app/src/collections/*/hooks/revalidate*` | loops `supportedLocaleCodes` | Revalidation may include CMS-only locales | Derive from public-enabled locale list where appropriate | fixed in US-031 |
| `app/src/app/(frontend)/(sitemaps)/*` | loops `supportedLocaleCodes` | Public-disabled locales could leak | Loop public-enabled locales only | fixed in US-031 |

## Block reuse audit

| Requirement | Existing surface | Decision | Notes |
| --- | --- | --- | --- |
| Value prop strip | `InfoStrip`, `FeatureGrid` | extend | Prefer presentation/style update before creating a new block |
| Destination/style grids | `FeatureGrid`, `MediaBlock`, `ArchiveBlock` | extend | Add inbound presentations if existing schema is enough |
| Counter stats | `Stats` | extend | Add CountUp/progressive enhancement; keep SSR static fallback |
| Testimonials carousel | `Testimonial` | extend | Existing `carousel` presentation exists; implement behavior/styling |
| Trust badges | `Stats` logo-proof or new block | decide in US-030 | Create new block only if link/disclaimer/provenance needs structured fields |
| Sustainability callout | `Content` + `MediaBlock` | extend first | New block only if editors need repeatable dedicated fields |
| Itinerary grid | no exact Page block | likely create | Use static marketing cards for wave 1; defer real tour model |

## Hero reuse audit

| Requirement | Existing surface | Decision | Notes |
| --- | --- | --- | --- |
| Image sequence | `cinematic-carousel` | reuse | No video in wave 1 |
| Ken Burns | carousel CSS/data attr | extend | Do not add a separate media mode |
| Search/planner widget | `planner-split` business panel or slot | extend | Add schema only if editor-managed options are required |
| Hero field config | `app/src/heros/config.ts` | source of truth | `app/src/collections/Pages/fields/hero.ts` does not exist |

## Content source audit

Current authoritative inventory:

- WingSide domain: `wingside.vn`
- Local paths: `/wingsside`, `/wingsside/destinations`, `/wingsside/styles`,
  `/wingsside/packages`, `/wingsside/plan-your-trip`, `/wingsside/contact-us`
- Production root paths: `/`, `/vi`, `/destinations`, `/styles`, `/packages`,
  `/plan-your-trip`, `/contact-us`

Initial content rule:

- EN master copy first.
- IT/ES/PT only public/ads-ready after QA.
- JA/KO/FR/DE CMS-enabled only until QA/public flag changes.
- No fake testimonials, ratings, licence claims, review badges or copied assets.
