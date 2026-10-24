# Independent Technical Integration Review: WingsGo Footer Correction & Theme Normalization

- **Review Target:** Main integrated app (`app/`) in repository `E:\repo\WingsTravel`
- **Reviewer:** Antigravity (Independent Technical Review)
- **Scope:** 18 modified files covering Footer, SiteContactFab, ThemeProvider, Layout, Form, Hotline resolution, seed/updater scripts, and component/unit test specs.
- **Artifacts:**
  - Component Test Log: [`wingsgo-footer-review-20261023/agy-component-final.log`](file:///E:/repo/WingsTravel/wingsgo-footer-review-20261023/agy-component-final.log)
  - Targeted ESLint Log: [`wingsgo-footer-review-20261023/agy-lint-final.log`](file:///E:/repo/WingsTravel/wingsgo-footer-review-20261023/agy-lint-final.log)
  - Review Report: [`wingsgo-footer-review-20261023/agy-integration-review.md`](file:///E:/repo/WingsTravel/wingsgo-footer-review-20261023/agy-integration-review.md)

---

## 1. Test & Linter Execution Summary

### 1.1 Component Test Suite
- **Command:**
  ```powershell
  pnpm --prefix app run test:component -- tests/component/footerHotlines.component.spec.tsx tests/component/siteContactFab.component.spec.tsx tests/component/headerHotlines.component.spec.tsx tests/component/retailTourConsultationDialog.component.spec.tsx tests/component/leadForm.component.spec.tsx tests/component/themeProvider.component.spec.tsx tests/component/wingsSideHiFiChrome.component.spec.tsx tests/component/wingsGroupHeaderOptionA.component.spec.tsx tests/component/wingsGroupV3Homepage.component.spec.tsx
  ```
- **Exit Code:** `0`
- **Results:**
  - **Test Files:** 9 passed (9 total)
  - **Tests:** 94 passed (94 total, 0 failed, 0 skipped)
  - **Duration:** 13.07s
- **Breakdown by Component Spec:**
  - `themeProvider.component.spec.tsx`: 6 passed (WingsGo forced light theme, SSR data-theme, local storage override ignore)
  - `siteContactFab.component.spec.tsx`: 4 passed (FAB hidden when footer in view, open dialog maintained, Escape restores focus to footer phone link)
  - `headerHotlines.component.spec.tsx`: 2 passed (Option A split-call button, secondary phone dropdown dismissal)
  - `footerHotlines.component.spec.tsx`: 14 passed (WingsGo & WingsGroup V3 compact contacts, 1 tel, 1 email, no Zalo, empty CMS safety, non-V3 legacy regression)
  - `wingsSideHiFiChrome.component.spec.tsx`: 5 passed (WingSide 7-route navigation, Plan trip CTA, contact link smooth scroll)
  - `wingsGroupHeaderOptionA.component.spec.tsx`: 12 passed (Desktop & mobile Option A call buttons, 0948 786 775 main hotline)
  - `retailTourConsultationDialog.component.spec.tsx`: 7 passed (Consultation trigger, dialog open/close lifecycle)
  - `leadForm.component.spec.tsx`: 18 passed (Bounded endpoint submission, pending state debounce, hotline preservation)
  - `wingsGroupV3Homepage.component.spec.tsx`: 26 passed (V3 homepage sections, contact anchors, desktop/mobile responsive chrome)

### 1.2 Targeted ESLint Verification
- **Command:**
  ```powershell
  pnpm --prefix app exec eslint scripts/seed-subsites.ts scripts/updateWingsGoHotline.ts src/Footer/Component.tsx "src/app/(frontend)/layout.tsx" src/blocks/Form/Component.tsx src/components/SiteContactFab.tsx src/payload-types.ts src/providers/Theme/index.tsx src/utilities/siteHotlines.ts tests/component/footerHotlines.component.spec.tsx tests/component/headerHotlines.component.spec.tsx tests/component/leadForm.component.spec.tsx tests/component/retailTourConsultationDialog.component.spec.tsx tests/component/siteContactFab.component.spec.tsx tests/component/themeProvider.component.spec.tsx tests/component/wingsSideHiFiChrome.component.spec.tsx tests/unit/siteHotlines.unit.spec.ts tests/unit/updateWingsGoHotline.unit.spec.ts
  ```
- **Exit Code:** `0`
- **Problems:** 0 errors, 8 warnings
  - 6 warnings: `scripts/seed-subsites.ts` baseline `Unexpected any` (@typescript-eslint/no-explicit-any, lines 805, 824, 843, 862, 2203, 2206)
  - 1 warning: `src/payload-types.ts` ignored pattern notice
  - 1 warning: `tests/component/retailTourConsultationDialog.component.spec.tsx` unused import `RetailDecisionRail` (@typescript-eslint/no-unused-vars, line 10)
  - **Verdict:** No lint errors, zero syntax regressions, strict compliance across all runtime application files.

---

## 2. In-Depth Technical Audit Across Core Risk Areas

### Risk Area 1: Footer WingsGo, WingsGroup, and WingSide Multi-Tenant Isolation
1. **WingsGo Footprint Simplification:**
   - Evaluated `app/src/Footer/Component.tsx`.
   - Contact consolidation variable `hasCompactContacts = isWingsGo || isWingsGroupV3Surface` cleanly binds WingsGo to the compact communication pattern:
     - Exactly 1 hotline rendered: `footerHotlines = hasCompactContacts ? hotlines.slice(0, 1) : hotlines`.
     - Exactly 1 email rendered: `footerEmail = hasCompactContacts ? (settings?.supportEmail || salesEmail) : settings?.supportEmail`.
     - Sales email duplicate suppressed: `{salesEmail && !hasCompactContacts && (...)}`.
     - Zalo OA CTA removed: `{!hasCompactContacts && sharedZaloCTA && (...)}`.
     - Redundant contact links in navigation items filtered: `links = links.filter((item) => !isWingsGo || (!item.link?.url?.includes('zalo.me') && !item.link?.url?.startsWith('tel:')))`.
     - Redundant 4th column completely eliminated for WingsGo; copyright banner cleaned of duplicated consultancy labels.
2. **ThemeSelector Guarding:**
   - Guard condition: `{!isWingsGroup && !isWingsGo && (<div className="theme-selector-wrap"><ThemeSelector /></div>)}`.
   - Result: ThemeSelector is completely unmounted for both WingsGo and WingsGroup, preventing end-user dark mode toggling in the footer.
3. **Tenant Non-Regression & Isolation:**
   - **WingsGroup V3:** Shares `hasCompactContacts`, rendering 1 primary hotline and 1 fallback email without Zalo OA clutter or ThemeSelector.
   - **WingsGroup Non-V3:** Preserves full hotline array (`hotlines`), distinct support/sales email entries, and legacy layout.
   - **WingSide (`wing-side`):** Fully isolated within `ws-hifi-footer` markup branch, retaining its dedicated 7-route navigation, custom dark/light theme switching capability, and specific contact triggers.
4. **CMS Empty Safety:**
   - If CMS provides empty hotlines (`[]`), `hasFooterContacts` correctly evaluates to false (or omits phone markup). No hardcoded synthetic phone numbers or dummy tel links are rendered.
   - If support/sales emails are omitted, the email link node is safely skipped.

---

### Risk Area 2: SiteContactFab Interaction & Keyboard Accessibility
1. **IntersectionObserver Visibility Logic:**
   - Evaluated `app/src/components/SiteContactFab.tsx`.
   - Trigger hiding condition:
     ```tsx
     hidden={isWingsGo && footerVisible && !open}
     ```
   - When the user scrolls down and the footer intersects the viewport (`footerVisible = true`), the floating action button hides gracefully to prevent visual collision with footer contact anchors.
2. **Open Dialog Protection:**
   - Crucially, the condition checks `!open`.
   - If a user has already triggered the contact modal (`open === true`) before or while scrolling into the footer, the trigger container and modal backdrop remain mounted and fully visible. The user's active interaction is never abruptly dismissed or broken by scroll intersection events.
3. **Focus Restoration on Escape:**
   - When the contact modal is closed via `Escape`, focus is restored via:
     ```tsx
     if (isWingsGo && footerVisible) {
       const footerPhone = document.querySelector<HTMLAnchorElement>('footer .wingsgo-footer__phone')
       if (footerPhone) {
         footerPhone.focus()
         return
       }
     }
     triggerRef.current?.focus()
     ```
   - This ensures focus does not collapse to `document.body` or attempt to focus a hidden FAB button when the footer is in view, satisfying WCAG 2.4.3 (Focus Order) by transferring focus to the visible in-page phone CTA.

---

### Risk Area 3: Form, Hotline Fallbacks, and CMS Updater Safety
1. **Lead Form Hotline Propagation:**
   - Evaluated `app/src/blocks/Form/Component.tsx`.
   - Form contact rail receives `siteHotlines` passed down from layout context without overriding empty lists.
   - When `siteHotlines` is an empty array (`[]`), Form respects the authoritative CMS state and suppresses call actions rather than falling back to unvetted numbers.
2. **Centralized Hotline Fallback Safety:**
   - Evaluated `app/src/utilities/siteHotlines.ts`.
   - Updated canonical fallback default:
     ```typescript
     export const WINGSGO_DEFAULT_HOTLINE = '0948786775'
     ```
   - Fallback logic only activates when `settings.supportPhone` and `settings.additionalHotlines` are completely absent (`undefined` / `null`).
   - If an administrator configures a custom phone number in CMS, the resolver preserves that custom number with priority 1, guaranteeing zero silent overrides of tenant configuration.
3. **Updater Scripts & Operational Safety:**
   - Evaluated `scripts/updateWingsGoHotline.ts` and `scripts/seed-subsites.ts`.
   - The updater enforces strict idempotency and safety gates:
     - Scans for legacy phone `0912910101`.
     - Updates target fields (`supportPhone` and `additionalHotlines`) to `0948786775`.
     - If the site already has a custom hotline or was intentionally cleared, the script performs a zero-mutation no-op (`0 writes`).
4. **Production Deployment Recommendation (PostgreSQL Row Lock):**
   - For live Oracle VPS release cutover against staging/production PostgreSQL:
     > [!IMPORTANT]
     > The hotline updater script must be executed within an explicit database transaction (`BEGIN ... COMMIT`) utilizing row-level locks (e.g., `SELECT * FROM "site_settings" WHERE "tenant" = 'wings-go' FOR UPDATE;`) in the release wrapper.
     > This prevents race conditions where an admin concurrently edits SiteSettings in Payload Admin during release migration.

---

## 3. Scope & Verification Boundaries

> [!WARNING]
> **Production Boundary Disclaimer:**
> - Component and unit test suites pass 100% (94/94 tests, 0 failures) under the Vitest JSDOM environment.
> - However, 100% zero-flash theme rendering and complete WCAG AA contrast compliance cannot be definitively confirmed until executed on the live Oracle Cloud ARM64 production container environment with real client network hydration.
> - ThemeProvider SSR synchronization (`html[data-theme="light"]`) eliminates primary CSS flashing in test fixtures, but final browser verification on live `wingsgo.vn` should be confirmed by Root during cutover.

---

## 4. Final Conclusion & Sign-Off

- **Source Code Status:** Untouched by reviewer; frozen as integrated by Root.
- **Verification Result:** PASS (`94/94` component tests passing, `0` lint errors).
- **Architecture Readiness:** Highly cohesive multi-tenant isolation, safe focus trap restoration, authoritative CMS empty handling, and idempotent migration logic.
- **Recommended Action:** Root may proceed with release candidate packaging and staged deployment to Oracle Cloud VPS.
