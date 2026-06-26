# US-022 CMS Backend Theme Shell

## Status

implemented

## Lane

normal

## Product Contract

The WingsGroup CMS backend should support two separate operator-facing admin
theme shells inspired by the two provided dashboard references.

The two themes are:

- `ats-compact`: a teal/slate, dense backoffice theme optimized for collection
  lists, editorial queues, filters, and high-volume operations.
- `finexy-soft`: a warm orange/charcoal, rounded overview theme optimized for
  dashboards, metric cards, quick actions, and guided operator surfaces.

This story is separate from public site theming and from `US-021` hero/theme
decision UX.

Scope boundaries:

- Public website theme tokens remain controlled by `site-settings`,
  `ThemePresets`, and `--site-*` variables.
- Hero presentation selection remains controlled by
  `HeroPresentationPresets`, page hero data, and site default hero settings.
- CMS backend theme shells affect only Payload admin experience, guidance,
  dashboard/list density, navigation clarity, and operator ergonomics.
- The backend shell must not introduce a second CMS, duplicate Payload
  collections, or bypass Payload access control.

## Reference Image Analysis

### UI System A - Compact ATS Backoffice

The supplied reference is a compact ATS/backoffice dashboard. The useful parts
for WingsGroup CMS are structural and behavioral, not the literal ATS content.

Visual system:

- Outer app background is blue-gray, making the admin surface feel like a
  contained workbench instead of a plain webpage.
- Main app canvas is white/light gray with a strong left sidebar and a lighter
  topbar.
- Brand accent is teal/cyan. It is used sparingly for primary actions, active
  navigation, selected rows, and pagination.
- Secondary color is slate/navy. It appears in the sidebar and table headers.
- Borders are thin and consistent, giving dense data screens enough structure
  without heavy card shadows.
- Corners are slightly rounded on the whole app frame, while inner controls are
  mostly square or lightly rounded.

Shell layout:

- Left sidebar is persistent, narrow, icon-led, and vertically grouped.
- The active navigation item is unmistakable: teal background, white icon/text,
  full-height item block.
- A small settings affordance sits at the bottom of the sidebar.
- Topbar contains global search, notification, and current user identity.
- Page header separates title from breadcrumb, so the user always understands
  both current task and location.

Data-operation pattern:

- Primary action sits first in the toolbar, followed by icon actions and a
  secondary `More` dropdown.
- Filtering is separated to the right side, matching operator expectation.
- Table controls sit above the table: page size on the left, column search on
  the right.
- Table header uses dark slate, white text, and subtle sort affordances.
- Row density is compact, optimized for scanning many records.
- Selected row uses a soft green/teal highlight and a checked box.
- Pagination is compact and uses teal only for the active page.

What to adopt:

- Teal/slate admin tokens.
- Stronger left navigation active states.
- More compact dashboard cards and collection list rhythm.
- Shared action toolbar style for custom admin views.
- Shared table/list styling for operational screens.
- Clear top-level page title + breadcrumb/task context.

What not to copy:

- ATS-specific information architecture such as Jobs, Candidates, Interviews.
- A separate custom CRUD table replacing Payload collection screens.
- User notification features unless backed by real product requirements.
- Free-form CMS backend theme editing.

### UI System B - Soft Finance Operations Dashboard

The second supplied reference is a modern finance dashboard. It is less
enterprise-table-heavy than the ATS reference and more suitable for a polished
CMS home, overview, and custom operator views.

Visual system:

- Overall mood is soft, spacious, rounded, and high-trust.
- Background is light warm gray, with the app canvas floating inside a large
  rounded container.
- Cards are white or near-white with subtle borders and very soft shadowing.
- Primary accent is warm orange/coral, supported by black/charcoal active
  states and small green/red status indicators.
- Typography is larger and friendlier than the ATS reference, especially on
  greeting, balance, and metric numbers.
- Rounded pills are a major design motif: nav tabs, buttons, profile, filters,
  and status controls.
- Icons are thin, line-based, and often live inside circular or pill surfaces.

Shell layout:

- Main navigation is horizontal at the top, shown as pill tabs.
- A secondary icon rail sits on the left for quick sections and utility
  actions, but it is lighter than the ATS sidebar.
- Top-right utility cluster includes search, notifications, alert/info, and
  profile dropdown.
- The dashboard starts with a human greeting and short operational guidance.
- Content uses asymmetric cards: one large summary card, metric cards, a chart
  card, and a larger recent-activity table.

Data-operation pattern:

- The dashboard prioritizes summaries first, not raw tables.
- Metric cards use large numbers, small trend pills, and clear labels.
- Recent activity is still table-based, but the table is softer: light header,
  rounded container, subtle row dividers, small colored status dots, and low
  visual noise.
- Search and filter controls live inside the table card header rather than as a
  global topbar.
- Primary actions are pill-shaped and high-contrast, while secondary actions
  are pale/neutral.

What to adopt:

- A softer `Overview` dashboard variant for `/admin`.
- Pill-based top action clusters for custom views.
- Large greeting/status header for operators.
- Metric cards with trend/status microcopy.
- Rounded, low-noise table cards for recent content, leads, drafts, and review
  tasks.
- Orange/coral accent option for important CMS action cards, while keeping
  slate/teal for navigation and system state.
- Lightweight left utility rail only where a full Payload sidebar is too heavy
  or impossible to safely restyle.

What not to copy:

- Financial concepts such as wallets, cards, balances, profit/loss, and spend
  limits.
- Currency selectors or fake charts unless backed by real CMS metrics.
- A horizontal nav that fights Payload's native collection navigation.
- Overly soft contrast on collection-edit screens where form readability is
  more important than dashboard polish.

### Recommended Direction For WingsGroup CMS

Build two separate CMS backend themes, not one hybrid theme.

Theme A: `ats-compact`

- Purpose: operational CMS work, collection lists, editorial queues, Site
  Review work queues, dense table scanning, import/export review, and content
  management screens.
- Palette:
  - app background: blue-gray `#667277`
  - sidebar/nav: deep slate `#455A64`
  - table header: slate `#3F515B`
  - primary accent: teal `#58C7CF`
  - selected state: soft green `#EAF6DF`
  - panel: white `#FFFFFF`
  - page surface: cool gray `#EEF2F7`
  - muted text: `#7A858C`
- Style:
  - strong persistent sidebar
  - clear full-block active navigation
  - compact toolbar
  - darker table headers
  - thin grid borders
  - compact row height
  - lightly rounded controls
  - low shadow, stronger structure
- Component treatment:
  - `.wings-admin-theme-ats .wings-admin-shell`
  - `.wings-admin-theme-ats .wings-admin-toolbar`
  - `.wings-admin-theme-ats .wings-admin-table-shell`
  - `.wings-admin-theme-ats .wings-admin-data-list`
  - `.wings-admin-theme-ats .wings-admin-action`

Theme B: `finexy-soft`

- Purpose: polished CMS overview, executive/operator dashboard, quick action
  home, theme manager, guided flows, summary panels, recent activity, and
  handover-friendly client demos.
- Palette:
  - app background: warm gray `#E9E8E6`
  - main canvas: off-white `#F7F7F5`
  - panel: white `#FFFFFF`
  - primary warm accent: coral/orange `#FF5A35`
  - warm gradient end: amber orange `#FF8A4C`
  - active pill: near-black `#1E1C18`
  - text: charcoal `#1F1F1D`
  - muted text: `#6F6A64`
  - positive: green `#2FBF71`
  - negative: red `#E94E4E`
- Style:
  - floating rounded app canvas
  - pill navigation/actions
  - large greeting/status header
  - rounded metric cards
  - soft shadows and subtle borders
  - low-noise table cards
  - warmer highlight card for primary metric/action
  - more spacious typography
- Component treatment:
  - `.wings-admin-theme-finexy .wings-admin-shell`
  - `.wings-admin-theme-finexy .wings-admin-overview`
  - `.wings-admin-theme-finexy .wings-admin-hero-head`
  - `.wings-admin-theme-finexy .wings-admin-metric-card`
  - `.wings-admin-theme-finexy .wings-admin-activity-card`
  - `.wings-admin-theme-finexy .wings-admin-pill-nav`
  - `.wings-admin-theme-finexy .wings-admin-quick-actions`

Theme selection model:

- Phase 1 should implement both themes as code-owned admin theme presets.
- The active backend theme can be selected by a single code/config value such
  as `ADMIN_THEME=ats-compact` or `ADMIN_THEME=finexy-soft`, or by a
  hardcoded default while design review is in progress.
- Do not store this in public `site-settings`.
- Do not let editors write free-form CSS.
- If a future CMS setting is needed, it should be super-admin-only and scoped to
  backend admin presentation, not public site rendering.

Shared token contract:

- Both themes should assign the same semantic backend variables:
  `--wings-admin-bg`, `--wings-admin-canvas`, `--wings-admin-sidebar`,
  `--wings-admin-panel`, `--wings-admin-panel-strong`,
  `--wings-admin-border`, `--wings-admin-text`, `--wings-admin-muted`,
  `--wings-admin-accent`, `--wings-admin-accent-soft`,
  `--wings-admin-active`, `--wings-admin-active-text`,
  `--wings-admin-positive`, `--wings-admin-negative`,
  `--wings-admin-warning`, `--wings-admin-danger`,
  `--wings-admin-radius-sm`, `--wings-admin-radius-md`,
  `--wings-admin-radius-lg`, `--wings-admin-radius-xl`,
  `--wings-admin-radius-pill`, and `--wings-admin-shadow`.
- Component CSS should consume semantic variables, not hardcoded palette values,
  except inside the theme preset declarations.
- Theme classes should switch token values:
  `.wings-admin-theme-ats` and `.wings-admin-theme-finexy`.

## Relevant Product Docs

- `docs/product/cms-theme-management.md`
- `docs/product/multisite-platform.md`
- `docs/product/WingsGroup-context.md`

## Acceptance Criteria

- CMS backend visual language uses `WingsGroup CMS` naming consistently.
- CMS backend ships two separate code-owned theme presets:
  `ats-compact` and `finexy-soft`.
- `ats-compact` uses teal/slate colors, strong sidebar/navigation emphasis,
  clear active states, compact table rhythm, and restrained borders.
- `finexy-soft` uses warm orange/charcoal colors, rounded cards, pill actions,
  metric cards, role/site summaries, quick actions, and low-noise activity
  panels.
- Both themes use the same semantic backend token contract so admin components
  can switch theme without rewriting view logic.
- Existing Payload routes continue to work:
  `/admin`, `/admin/console`, `/admin/theme`, `/admin/site-review`,
  collection list views, and edit views.
- The shell improves operator workflows without changing data ownership:
  `site-settings`, `theme-presets`, `hero-presentation-presets`, `pages`,
  `posts`, and `media` remain the source collections.
- Role and site scoping are preserved for `super-admin`, `site-manager`, and
  `editor`.
- Table/list treatments remain readable for high-volume CMS operations:
  page lists, site settings, theme presets, hero presets, media, and posts.
- Dashboard/custom-view cards remain visually stronger than default Payload
  cards without adding fake finance/analytics concepts.
- Custom admin views use backend theme tokens instead of each view inventing
  unrelated colors, spacing, headers, and action patterns.
- A reviewer can visually compare both admin themes against the same admin
  routes before selecting the production default.
- The implementation remains responsive for laptop and tablet-width admin use.
- No free-form CSS or arbitrary admin theme editing is exposed to editors.

## Implementation Plan

### Phase 0 - Baseline And Safety

Goal: lock current behavior before visual refactor.

Tasks:

- Capture current screenshots for:
  `/admin`, `/admin/console`, `/admin/theme`, `/admin/site-review`,
  `/admin/collections/pages`, `/admin/collections/pages/create`,
  `/admin/collections/site-settings`, and `/admin/collections/media`.
- Confirm current role behavior for:
  `super-admin`, `site-manager`, and `editor`.
- Inventory Payload class names used by dashboard, nav, collection list, edit
  view, document controls, table, tabs, drawer, and auth/login screens.
- Keep a small visual audit note in `app/output/playwright/us-022-baseline/`
  or equivalent screenshot output.

Exit criteria:

- Existing admin routes load.
- No browser console errors on baseline.
- Known pre-existing warnings are documented and not mixed with US-022 changes.

### Phase 1 - Admin Theme Token Presets

Goal: create two backend theme presets that share one semantic token contract.

Primary file:

- `app/src/app/(payload)/custom.scss`

Tasks:

- Add backend theme root classes:
  `.wings-admin-theme-ats` and `.wings-admin-theme-finexy`.
- Add explicit backend-only semantic tokens in each theme:
  `--wings-admin-bg`, `--wings-admin-canvas`,
  `--wings-admin-sidebar`, `--wings-admin-topbar`,
  `--wings-admin-panel`, `--wings-admin-panel-strong`,
  `--wings-admin-border`, `--wings-admin-muted`, `--wings-admin-text`,
  `--wings-admin-accent`, `--wings-admin-accent-soft`,
  `--wings-admin-active`, `--wings-admin-active-text`,
  `--wings-admin-positive`, `--wings-admin-negative`,
  `--wings-admin-danger`, `--wings-admin-warning`,
  `--wings-admin-radius-sm`, `--wings-admin-radius-md`,
  `--wings-admin-radius-lg`, `--wings-admin-radius-xl`,
  `--wings-admin-radius-pill`, and `--wings-admin-shadow`.
- Keep these independent from public `--site-*` variables.
- Add an initial theme activation mechanism:
  environment/config default, body/root class, or a small backend-only provider.
  The active theme must not come from public site settings.
- Define shared utility classes:
  `.wings-admin-shell`, `.wings-admin-page`,
  `.wings-admin-page-head`, `.wings-admin-toolbar`,
  `.wings-admin-panel`, `.wings-admin-card-grid`,
  `.wings-admin-data-list`, `.wings-admin-status-pill`,
  `.wings-admin-action`, `.wings-admin-action--primary`,
  `.wings-admin-action--secondary`, `.wings-admin-action--ghost`.
- Define theme-specific utility classes only where the structural difference is
  meaningful, for example `.wings-admin-overview`,
  `.wings-admin-hero-head`, `.wings-admin-metric-card`,
  `.wings-admin-activity-card`, `.wings-admin-pill-nav`,
  `.wings-admin-quick-actions`, and `.wings-admin-table-shell`.
- Set focus states and hover states using accent tokens.
- Ensure reduced-motion-safe transitions only.

Exit criteria:

- Custom admin views can render correctly under both `.wings-admin-theme-ats`
  and `.wings-admin-theme-finexy`.
- Public frontend CSS remains untouched.

### Phase 2 - Payload Shell Polish

Goal: make Payload Admin work under both backend themes while staying inside
safe CSS override boundaries.

Primary file:

- `app/src/app/(payload)/custom.scss`

Safe override targets:

- App background and dashboard wrapper.
- Header/topbar density and bottom border.
- Sidebar/nav intro and navigation active state.
- Breadcrumb/home suppression already present, but review whether a clearer
  context line should replace it in custom views.
- Collection list table header, row spacing, checkbox selected state, and row
  hover.
- Collection list toolbar buttons and search/filter controls.
- Document edit panels, field groups, tabs, and doc controls.

Implementation rules:

- Prefer broad Payload semantic wrappers over brittle deeply nested selectors.
- Avoid hiding critical Payload controls.
- Do not restyle modals/drawers unless tested.
- Keep dark-mode assumptions out of scope unless Payload current theme requires
  them.

Exit criteria:

- Collection lists are compact and scannable in `ats-compact`.
- Collection lists remain readable and low-noise in `finexy-soft`.
- Edit screens remain readable and do not lose form hierarchy.
- Payload native controls remain keyboard-accessible.

### Phase 3 - Dashboard And Console Alignment

Goal: make `/admin` and `/admin/console` behave like an operator dashboard.

Primary files:

- `app/src/components/BeforeDashboard/index.tsx`
- `app/src/components/BeforeDashboard/index.scss`
- `app/src/components/AdminDashboard/WingsGroupMetrics.tsx`
- `app/src/components/AdminDashboard/index.scss`
- `app/src/components/AdminOperatorConsole`

Tasks:

- Convert dashboard intro into a compact page header:
  eyebrow `WingsGroup CMS`, title, role/site context, and primary next actions.
- Implement dashboard styling for both themes:
  `ats-compact` should feel like an operational workbench, while `finexy-soft`
  should feel like a rounded overview dashboard.
- Rework metric cards to use the shared `.wings-admin-card-grid` rhythm.
- Add a top action strip with common operator actions:
  `Tạo trang nhanh`, `Tạo trang`, `Thư viện media`, `Site review`,
  `Theme manager`.
- Keep role-aware visibility for publish/import/export actions.
- Align `/admin/console` header, cards, and action groups with backend theme
  tokens. The same console should visibly change style between `ats-compact`
  and `finexy-soft` without changing data or route behavior.
- Use Vietnamese operator labels, but keep route names and technical IDs
  unchanged.

Exit criteria:

- Dashboard and console render consistently inside each selected backend theme.
- Both backend themes can be screenshot and compared on dashboard and console.
- Operators can reach high-frequency CMS tasks in one click.
- No new data ownership or access path is introduced.

### Phase 4 - Theme Manager And Site Review Alignment

Goal: bring existing custom views into the same backend shell without changing
their product behavior.

Primary files:

- `app/src/components/ThemeManager/index.scss`
- `app/src/components/SiteReview/index.scss`

Theme Manager tasks:

- Replace local one-off panel/card styling with shared admin shell classes or
  equivalent token usage.
- Add theme-specific treatment for `/admin/theme`:
  `ats-compact` should prioritize compact panels and toolbar clarity;
  `finexy-soft` should prioritize rounded preview cards and guided decision
  flow.
- Convert header actions to toolbar buttons.
- Make the site context/impact block read like a compact operations panel.
- Keep split save behavior from `US-021` unchanged.
- Keep public theme preview visually tied to `--site-*` tokens, while the
  surrounding admin chrome uses `--wings-admin-*`.

Site Review tasks:

- Keep the two-pane preview layout.
- Add theme-specific treatment for `/admin/site-review`:
  `ats-compact` should emphasize a dense review queue; `finexy-soft` should
  soften the queue without reducing scannability.
- Apply slate/teal list active states to the review tree.
- Align search, item count, and action buttons with shared toolbar/list
  patterns.
- Ensure iframe preview area remains visually distinct from CMS chrome.

Exit criteria:

- `/admin/theme` and `/admin/site-review` render correctly in both backend
  themes.
- Public preview content is not visually confused with backend UI.

### Phase 5 - Collection List And Edit Screens

Goal: improve high-volume CMS operations while preserving Payload behavior.

Primary file:

- `app/src/app/(payload)/custom.scss`

Candidate collection screens:

- `pages`
- `posts`
- `media`
- `site-settings`
- `theme-presets`
- `hero-presentation-presets`
- `form-submissions`

Tasks:

- Improve table header contrast using slate tokens.
- Tighten row height enough for scanning, but not below touch-safe minimums on
  tablet.
- Add clear selected/hover states.
- Standardize buttons in list toolbar and document controls.
- Improve empty state panel styling.
- Keep relationship fields, localized fields, upload fields, and rich text
  editors untouched unless the selector is safe and tested.

Exit criteria:

- Representative collection list/edit screens are visually consistent.
- Rich text and upload workflows still operate normally.

### Phase 6 - Responsive Admin Behavior

Goal: make the shell practical for laptop, tablet-width, and narrow mobile
admin checks.

Breakpoints:

- Desktop: `>= 1280px`
- Laptop/tablet landscape: `1024px - 1279px`
- Tablet/mobile admin fallback: `< 1024px`

Tasks:

- Keep dashboard metrics wrapping cleanly.
- Collapse two-column custom admin views to one column where needed.
- Ensure toolbar actions wrap without overlap.
- Avoid fixed heights that trap content on small screens, except where
  `SiteReview` intentionally manages a preview pane.
- Verify collection tables remain horizontally scrollable rather than clipped.

Exit criteria:

- Admin does not require desktop-only width for core operations.
- Touch targets remain usable at tablet widths.

### Phase 7 - Validation And Production Rollout

Goal: prove this is a safe admin UX refactor.

Commands:

```bash
pnpm run generate:importmap
pnpm exec tsc --noEmit
pnpm run lint
pnpm run test:e2e -- tests/e2e/admin.e2e.spec.ts
pnpm run build
```

Manual/Playwright visual proof:

- `/admin`
- `/admin/console`
- `/admin/theme`
- `/admin/site-review`
- `/admin/collections/pages`
- `/admin/collections/pages/create`
- `/admin/collections/site-settings`
- `/admin/collections/media`

Each route should be captured twice:

- once with `ats-compact`
- once with `finexy-soft`

Production smoke after deploy:

- Login works.
- Dashboard loads.
- Collection list loads.
- Edit page loads.
- Theme Manager loads.
- Site Review loads.
- No browser console errors on targeted routes.

Exit criteria:

- Screenshots are saved under:
  `app/output/playwright/us-022-admin-shell/ats-compact/` and
  `app/output/playwright/us-022-admin-shell/finexy-soft/`.
- Harness story evidence records validation commands and production smoke.

## File-Level Work Breakdown

| File or area | Change type | Notes |
| --- | --- | --- |
| `app/src/app/(payload)/custom.scss` | Backend theme token presets and safe Payload overrides | Highest leverage file; defines `.wings-admin-theme-ats` and `.wings-admin-theme-finexy`; must avoid brittle selectors. |
| `app/src/components/BeforeDashboard/*` | Dashboard intro refactor | Convert intro to compact page header/action strip. |
| `app/src/components/AdminDashboard/*` | Metrics/card/list alignment | Preserve existing role/site-scoped queries. |
| `app/src/components/AdminOperatorConsole/*` | Console shell alignment | Reuse shared tokens and toolbar/card/list rhythm. |
| `app/src/components/ThemeManager/index.scss` | View alignment only | Do not change split save or data fetch behavior unless a bug is found. |
| `app/src/components/SiteReview/index.scss` | View alignment only | Keep iframe preview and authenticated API behavior unchanged. |
| `app/tests/e2e/admin.e2e.spec.ts` | Targeted smoke/visual assertions | Add selectors/assertions only where stable. |
| `docs/product/cms-theme-management.md` | Completion notes after implementation | Update evidence and boundaries if behavior changes. |
| `docs/stories/epics/E05-cms-theme-management/US-022-cms-backend-theme-shell.md` | Evidence after implementation | Record commands, screenshots, and deploy proof. |

## Implementation Order

1. Create `ats-compact` and `finexy-soft` token presets in `custom.scss`.
2. Add the admin theme activation mechanism.
3. Update dashboard and console to consume semantic backend tokens.
4. Align `ThemeManager` and `SiteReview` for both themes.
5. Add safe Payload collection list/edit overrides that work under both themes.
6. Run local visual smoke for both themes and adjust responsive behavior.
7. Add or update targeted admin E2E coverage.
8. Run full validation ladder.
9. Deploy the selected default and record production smoke evidence.

## Risks And Controls

- Risk: Payload internal class names may change.
  Control: use minimal, safe overrides and prefer custom component classes.
- Risk: Dense tables reduce accessibility.
  Control: keep focus states, contrast, and minimum tap targets.
- Risk: `finexy-soft` cards introduce fake metrics.
  Control: only show real counts, drafts, lead submissions, site access, and
  review tasks already available through authenticated Payload queries.
- Risk: two backend themes double visual QA scope.
  Control: require route screenshots for both themes before choosing production
  default.
- Risk: Admin shell theme leaks into public frontend.
  Control: use `--wings-admin-*` only inside Payload/admin surfaces.
- Risk: CSS overrides break rich text/upload/relationship fields.
  Control: include representative edit screens in visual smoke.
- Risk: Custom views drift again after US-022.
  Control: document and reuse shared admin classes for future admin surfaces.

## Design Notes

- Commands:
  - operator navigates between dashboard, console, theme manager, site review,
    and collection lists
  - operator searches/filter lists using Payload-native controls where possible
  - operator uses clear primary/secondary toolbar actions
- Queries:
  - no new product data query is required by default
  - optional dashboard metrics may reuse existing authenticated Payload APIs
- API:
  - no public API change
  - any helper endpoint must be authenticated and role/site-scoped
- Tables:
  - no schema change required
- Domain rules:
  - CMS backend shell is an admin usability layer, not a business domain
  - CMS backend has two separate code-owned theme presets: `ats-compact` and
    `finexy-soft`
  - admin shell styling must not depend on public site theme selection
  - public site theme and CMS backend theme are separate axes
  - admin visual identity should be stable across all sites in the WingsGroup
    ecosystem
  - if production uses only one default initially, the other theme remains
    available for review and future switching
- UI surfaces:
  - `app/src/app/(payload)/custom.scss`
  - `app/src/components/BeforeDashboard`
  - `app/src/components/AdminDashboard`
  - `app/src/components/ThemeManager`
  - `app/src/components/SiteReview`
  - Payload collection list/edit screens via safe CSS overrides only

## Validation

| Layer | Expected proof |
| --- | --- |
| Unit | No unit proof required unless helper utilities are added. |
| Integration | Role/site-scoped admin APIs still enforce existing access boundaries. |
| E2E | Admin dashboard, console, theme manager, site review, and representative collection list/edit views load without console errors. |
| E2E | Visual smoke screenshots cover desktop and tablet/mobile admin widths for both `ats-compact` and `finexy-soft`. |
| Platform | Production admin routes remain reachable after build/deploy. |
| Release | `generate:importmap`, typecheck, lint, targeted admin E2E, build. |

## Harness Delta

This story separates CMS backend/admin theme work from public multisite theme
management and hero decision UX, preventing future tasks from mixing operator
shell polish with public rendering behavior.

## Evidence

2026-06-25 implemented the first CMS backend theme shell pass:

- Added `AdminThemeBootstrap` as a Payload admin client bootstrap.
- Added backend-only theme switching with URL query and localStorage:
  `?adminTheme=finexy-soft` and `?adminTheme=ats-compact`.
- Set `finexy-soft` as the default CMS backend theme.
- Added semantic `--wings-admin-*` tokens and scoped theme classes:
  `.wings-admin-theme-finexy` and `.wings-admin-theme-ats`.
- Updated admin CSS for dashboard, console, theme manager, site review, nav
  intro, collection list/edit shell, buttons, table hover, and selected states.
- Added direct `AdminThemeBootstrap` mounting for custom admin views so
  `/admin/console`, `/admin/theme`, `/admin/site-review`, and
  `/admin/page-wizard` receive the same backend theme class as native Payload
  admin routes.
- Refined the left admin rail:
  - `finexy-soft` collapsed rail uses recognizable SVG icons for console,
    site review, page wizard, inbox, import data, and users.
  - Native Payload group badges remain text-based but use larger, lighter
    typography for faster recognition.
  - Sidebar group headings have clearer spacing and no clipped active-pill
    treatment.
- Added explicit admin navigation fallback to custom views:
  - `/admin/console`
  - `/admin/theme`
  - `/admin/site-review`
  - `/admin/page-wizard`
  Each custom view now exposes a breadcrumb back to `/admin` and a visible
  `Về admin` action, while preserving contextual shortcuts such as Console or
  Site settings.
- Added E2E assertions for default theme, URL switch, persistence, and invalid
  fallback.

Validation:

- `pnpm run generate:importmap` passed.
- `pnpm exec tsc --noEmit` passed.
- `pnpm run lint` passed with 5 pre-existing warnings in
  `ThemePresetEditor/PreviewField.tsx` and migration files.
- `pnpm run build` passed.
- Targeted admin E2E was attempted but blocked because an existing Next dev
  process in `app/` held the dev-server lock:
  PID `83876`, `http://localhost:3000`.
  The existing server did not respond to a 5s `/admin` smoke request, and the
  implementation did not terminate the external process.

2026-06-26 follow-up validation after sidebar/navigation UX refinements:

- `pnpm exec tsc --noEmit` passed.
- `pnpm run lint` passed with the same 5 pre-existing warnings.
- `pnpm run build` passed.
- Browser preview sessions confirmed the collapsed `finexy-soft` rail behavior
  during implementation, but later screenshot capture redirected to login after
  session expiry; final proof is the local build/typecheck/lint set above.
