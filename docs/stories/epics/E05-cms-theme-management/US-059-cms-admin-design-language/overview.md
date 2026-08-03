# Overview

## Current behaviour

Payload already exposes the native `/admin` shell, thirteen configured
collections, six plugin collections, two globals, and four custom views:
Console, Page Wizard, Site Review, and Theme Manager. The custom views are
real, but their operator experience is incomplete:

- Console reduces failed count requests to `0`, has no isolated
  loading/empty/error/no-access states, and includes an invalid Search shortcut
  to `search-results` instead of the `search` collection.
- The existing `beforeNav` duplicates more routes than the intended triage
  layer, and the current compact navigation does not satisfy the specified
  tablet contract.
- Page Wizard selects site and preset, but its current endpoint creates in the
  default locale; it does not accept a locale selection.
- Site Review is a read-only preview/status surface. It has no approval queue,
  assignment, comments, diff, or rollback command.
- Theme Manager and some metrics use fallbacks that can resemble confirmed
  data. Its usage summary is capped and its save path lacks an explicit impact
  confirmation.

The supplied prototype is a strong visual reference, but its static numbers,
publish steps, diff, rollback, lead workflow, and route screens are not proof
that the present Payload contracts provide those capabilities.

## Target behaviour

Create a consistent, Payload-native admin operator experience. `/admin/console`
becomes the first surface for assigned work, site/locale/role context, real
metrics, and valid deep links. Native collection and global routes remain
visible in the Payload sidebar. The custom workflow views guide an operator to
the real commands that current APIs support, without inventing state or
weakening authorization.

`docs/product/cms-admin-design-language.md` is the persistent contract for
future admin work. This story's `design.md` supplies the implementation delta
and decision gates for the prototype conversion.

## Users and scope

| User | Required outcome |
| --- | --- |
| Editor | Sees an assigned-content triage surface and may start only the existing, permitted draft/content/lead flows. |
| Site manager | Sees only assigned-site context and allowed site settings/import-export shortcuts. |
| Super-admin | Sees cross-site advanced routes while retaining existing Payload access checks. |
| Future implementer | Can extend an admin surface using one language, clear state semantics, and a real-route inventory. |

This is a high-risk story because it affects authorization presentation,
site/locale context, existing API behaviour, native Payload navigation,
desktop/mobile interactions, and regression coverage.

## In scope

- Rebuild Console from real Payload REST queries using independently observable
  request states and retries.
- Apply the persistent admin design-language contract to Console, navigation
  introduction, and scoped admin shell styles.
- Make all Console workspace and triage links native, valid Payload routes.
- Gate shortcuts for editor, site-manager, and super-admin without changing
  the existing API/collection access controls.
- Add scoped confirmation and accessibility behaviour to write-capable custom
  surfaces only where the current command exists.
- Audit the 24 operational route entry points and cover the six custom/native
  landing surfaces in E2E.

## Explicit non-goals

- New collections, schema fields, migrations, REST contract changes, or access
  control relaxation.
- A fake review/publish workflow, fake analytics/counts, fake delivery
  timeline, fake dry-run/diff, or claimed rollback.
- Replacing native Payload collection/global navigation or editing generated
  Payload layout/import-map files by hand.
- Redesigning the public site or changing the `finexy-soft`/`ats-compact`
  bootstrap contract.
- Adding a generic modal framework for all admin routes.

## Open decisions and stop gates

Implementation may start with the Console and shell work that uses existing
contracts. The following choices require explicit product approval before the
related flow is implemented:

1. Define "awaiting review", "new lead", "scheduled publish", and "import"
   from a named query and time window; no metric label may infer meaning from a
   generic record count.
2. Define the selected-site rule and locale source for Console. It must state
   whether a user chooses one assigned site, receives an aggregate view, and
   how a missing/ambiguous locale behaves.
3. Decide whether Page Wizard may extend its private command/API to accept a
   locale. The present endpoint does not support that contract.
4. Choose either a read-only Site Review with preview/status/edit links, or a
   separately approved review/publish workflow with its own data, audit, and
   permission design.
5. Confirm whether lead delivery timeline/retry, media usage/dependency
   reporting, import dry-run/diff/rollback, and content dependency warnings
   have existing backend sources. If not, defer them to separate product work.
6. Confirm whether Group/Private and pricing mode are future TourProduct data
   requirements. They are not currently available fields and must not be
   simulated in this UI story.

## Acceptance criteria

- Console uses only real Payload endpoints, names the data semantics it can
  prove, and displays loading, empty, error, unavailable, and no-access states
  without replacing failures by `0`.
- Every Console action and workspace link goes to a genuine Payload custom
  view, collection, or global route; the Search destination is the actual
  `search` collection.
- Editor, site-manager, and super-admin shortcut visibility follows the
  documented matrix, while integration tests prove underlying current access
  control still rejects prohibited operations.
- The native sidebar retains all accessible collection/global routes; the
  added triage navigation is Console, Review, and Lead only and follows the
  desktop/tablet/mobile contract.
- The two existing admin themes bootstrap unchanged and all new styling remains
  admin-scoped, token-bound, non-decorative, keyboard-visible, and
  reduced-motion safe.
- Page Wizard, Site Review, Theme Manager, and all 24 inventoried operational
  routes have a real entry point; unsupported prototype controls are absent or
  explicitly labelled as unavailable rather than simulated. E2E proves route
  surfaces, role shortcuts, state handling, valid CTA destinations, dialog
  keyboard behaviour, viewport overflow rules, and both theme bootstrap paths.

## Related material

- `docs/product/cms-admin-design-language.md`
- `docs/product/cms-theme-management.md`
- `docs/stories/epics/E05-cms-theme-management/US-022-cms-backend-theme-shell.md`
- `source/strategy/18 Áp dụng Payload vào dự án WingsTravel.md`
- `source/strategy/19 Kiến trúc đề xuất nội bộ WingsTravel Payload.md`
- `source/strategy/20 Kiến trúc đề xuất gửi khách hàng WingsTravel.md`
