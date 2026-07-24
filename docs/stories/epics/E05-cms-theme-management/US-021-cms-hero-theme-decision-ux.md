# US-021 CMS Hero/Theme Decision UX

## Status

implemented

## Lane

normal

## Product Contract

Site managers and editors can change site theme defaults and hero presentation
defaults from the CMS without guessing which setting controls what, which pages
will be affected, or which media inputs are still missing before publish.

Role boundaries:

- `site-manager` and `super-admin` manage site theme shell and site default hero
  in `/admin/theme`.
- `editor` manages page-level hero content and page-level presentation source in
  `pages > Hero`; editors do not manage site defaults unless a later role
  decision explicitly grants that permission.

This story supersedes the older editor-facing instruction in
`docs/product/hero-presentation-system.md` that treats `hero.presentation`
(`Kiểu hiển thị hero`) as the normal page-editing path. After this story,
`hero.presentation` remains only as a compatibility field for legacy records and
fallback rendering, not as the primary editor decision path.

## Relevant Product Docs

- `docs/product/hero-presentation-system.md`
- `docs/product/cms-theme-management.md`
- `docs/product/multisite-platform.md`

## Acceptance Criteria

- The CMS clearly separates three scopes:
  - site theme shell
  - site default hero
  - page-level hero override
- `/admin/theme` is scoped to `site-manager` and `super-admin`; page-level Hero
  editing is scoped to editors with page update permission.
- Editor-facing flows no longer expose legacy hero-presentation controls as a
  parallel decision path.
- The product doc `docs/product/hero-presentation-system.md` is updated so the
  documented CMS workflow matches this new inherit/override model.
- Theme Manager hero selection is presented as a governed preset browser or
  gallery, not only as a raw select input.
- Each hero preset preview shows:
  - visual structure
  - supported media mode
  - required inputs
  - business behavior fit
- Page Hero preview resolves truthfully for both:
  - `inherit from site`
  - `override on page`
- Page Hero preview shows the effective source explicitly:
  - `site`
  - `page`
  - `legacy`
  - `fallback`
- The Page Hero form highlights only the relevant media groups for the selected
  hero preset while keeping non-relevant groups secondary or collapsed.
- CMS surfaces show impact hints when changing a site default hero:
  - count of pages inheriting from site
  - count of pages with page-level overrides
  - capped list of affected inherit-mode page links
  - clear note that page overrides are not affected
- Theme Manager saving is split into:
  - theme shell changes
  - hero default changes
  - combined save when both are dirty
- Split save behavior is deterministic:
  - `Lưu theme` sends only `branding`
  - `Lưu hero mặc định` sends only `heroDefaults`
  - `Lưu tất cả` sends both groups
  - each save path reports its own success or failure state
- Validation UI warns when selected hero presentation lacks required data such
  as:
  - missing main image
  - too few carousel slides
  - missing video poster
  - planner presentation without planner-oriented behavior
- Validation UI also shows when media is intentionally not required, for example
  `gradient-mesh`.
- Playwright proof covers:
  - Theme Manager hero preset browsing
  - truthful inherit/override preview state
  - relevant media-group emphasis
  - split save actions

## Design Notes

- Commands:
  - site-manager changes site theme shell defaults
  - site-manager changes site default hero preset and business behavior
  - editor changes page hero source between inherit and override
  - editor fills only the media fields required by the selected hero preset
- Queries:
  - Theme Manager must load site settings, hero presets, and usage summary
  - Page Hero guide must resolve the effective presentation from page data plus
    site defaults when `inherit` is selected
  - Page Hero guide data flow:
    1. read the selected page `site` field from the Payload form
    2. fetch matching `site-settings?depth=1&where[site][equals]=<siteID>`
    3. build a lightweight `siteDefaults` object from
       `site-settings.heroDefaults`
    4. combine current form `hero` data and `siteDefaults` through
       `resolveHeroPresentationConfig`
    5. show effective `key`, `preset`, `source`, and required-input status
  - If the selected site cannot be resolved, the guide must show a neutral
    fallback state and avoid claiming that the preview is site-accurate.
  - Theme Manager usage summary must count:
    - pages using `presentationMode=inherit`
    - pages using `presentationMode=override`
    - optionally pages still using legacy `hero.presentation`
- API:
  - existing `site-settings` and `pages` Payload APIs remain the source of truth
  - optional read-only usage summary endpoint may be added if direct collection
    queries are too heavy for the admin surface
  - If a new endpoint is added, it must be read-only, authenticated, and
    site-scoped.
- Tables:
  - no mandatory schema change to public data contract
  - optional derived usage counts for hero preset consumption may be introduced
    in admin-only queries
- Domain rules:
  - legacy `hero.presentation` remains for compatibility but is not part of the
    normal editor decision flow
  - site default hero changes affect only pages using `presentationMode=inherit`
  - page media content always lives on the page, never on the site default hero
  - preview surfaces must reflect actual render resolution, not placeholder
    assumptions
  - `gradient-mesh` explicitly allows no media-required state
  - `planner-split` should recommend planner-oriented behavior but must not
    hardcode site code, hostname, or pathname
  - split save actions must not overwrite unrelated `site-settings` groups
- UI surfaces:
  - `/admin/theme`
  - `site-settings`
  - `pages > Hero`
  - optional hero preset detail screen

## Validation

| Layer | Expected proof |
| --- | --- |
| Unit | Effective hero preview state resolves correctly for inherit, override, and legacy fallback. |
| Unit | Required-input validation maps correctly by hero preset capability. |
| Unit | Gradient mesh returns a no-media-required status and planner split returns a planner-behavior recommendation. |
| Integration | Theme Manager usage summary and split save behavior persist correctly to `site-settings`. |
| Integration | Editor-facing hero form hides or demotes legacy controls while preserving stored compatibility data. |
| Integration | Page Hero guide fetches site defaults by selected page site and falls back safely when site settings are missing. |
| E2E | Theme Manager shows preset gallery/cards with capability and requirement hints. |
| E2E | Changing site default hero updates inherit-mode preview and leaves override-mode pages unaffected. |
| E2E | Page Hero form emphasizes relevant media inputs for carousel, video, layered, and split variants. |
| E2E | Split save buttons and dirty states behave correctly. |
| E2E | Role behavior is clear: site-manager can manage `/admin/theme`; editor uses page Hero controls and cannot manage site defaults. |
| Platform | Existing WingsGo and WingSide seeded hero behavior still renders after UX refactor. |
| Release | Typecheck, lint, integration, targeted admin E2E, full E2E, build. |

## Harness Delta

This story formalizes CMS decision-support UX as a first-class capability, not
just a cosmetic admin improvement. Future hero/theme stories should distinguish
between render capability work and editor decision-flow work.

## Evidence

2026-06-25 implemented CMS Hero/Theme decision UX and follow-up hero desktop
preview tuning:

- `/admin/theme` now separates theme shell vs site default hero decisions with
  governed preset browsing, impact summary, and split save actions.
- Page Hero flow now resolves truthful inherit/override preview state and
  demotes legacy `hero.presentation`.
- Admin preview path is site-aware for child-site homepages.
- `planner-split` desktop composition now renders as a two-block layout:
  left copy, right unified stage with panel contained inside the stage; tablet
  landscape keeps two-block behavior and phone remains stacked.
- Preview mode with admin bar has tightened desktop spacing, and the planner
  panel surface is reduced to `rgba(255,255,255,0.75)` to avoid overpowering
  the hero image.

Validation completed during implementation:

- `pnpm run generate:types`
- `pnpm exec tsc --noEmit`
- `pnpm run test:unit -- tests/unit/heroPresentationResolver.unit.spec.ts tests/unit/heroPresentationAdmin.unit.spec.ts tests/unit/generatePreviewPath.unit.spec.ts`
- `pnpm run test:int -- tests/int/heroPresentations.int.spec.ts`
- `pnpm run test:component -- tests/component/heroPresentations.component.spec.tsx`
- targeted Playwright admin/frontend verification on localhost:3000 for theme
  manager, page hero preview, and planner-split responsive behavior
