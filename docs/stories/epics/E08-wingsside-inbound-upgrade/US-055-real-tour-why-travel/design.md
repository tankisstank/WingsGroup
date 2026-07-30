# US-055 Design

## Domain Model

- `WhyTravelSlotKey`: `local-design`, `flexible-planning`,
  `style-matching`, or `collaborative-care`.
- `WhyTravelSelectionMode`: `manual` or `rule`.
- `WhyTravelRule`: optional governed destination, style and duration criteria
  plus deterministic sort order.
- `WhyTravelPresentationPolicy`: inherit or override decisions for editorial
  copy, media and CTA label.
- `WhyTravelTourProjection`: eligible TourProduct identity, localized display
  data, media and canonical wrapper URL required by the renderer.

`TourProduct` remains the sole owner of tour identity, publication, taxonomy,
duration, governed price state and public wrapper route. The Home Page owns
slot configuration and editorial presentation.

## Application Flow

1. Read the current WingSide Home Page, locale and four slot configurations.
2. Parse slot keys, selection mode, rule values and override policy at the
   Payload boundary.
3. Resolve manual relationships or query rule candidates from published,
   same-site TourProducts.
4. Apply the same readiness checks used by US-050 and a stable deterministic
   order for rule candidates.
5. Project one eligible tour per slot, preventing duplicate selections unless
   explicitly approved by the final contract.
6. Merge allowed localized editorial overrides without replacing product
   identity or canonical Tour Detail routing.
7. Render the approved Why Travel composition or a controlled fail-closed state.

## Interface Contract

- Four stable slot keys drive CMS validation, render markers and tests.
- Manual selection uses a same-site filtered relationship to `tour-products`.
- Rule inputs accept governed taxonomy codes and duration bounds only.
- Unknown rule codes are rejected before query construction.
- A slot CTA that represents a selected tour always resolves through the
  same-site locale-aware wrapper Page.
- Free-form external or product-detail hrefs cannot replace the resolved tour
  URL. A separate non-product editorial CTA requires an explicit future
  contract.
- The server sends a bounded card projection; the browser performs no per-card
  TourProduct requests.

## Data Model

Extend the existing Page-owned `wingsSideHiFi.home` group additively with a
four-item `whyTourSlots` array:

- stable `key`;
- `selectionMode`;
- optional manual `tour` relationship;
- optional governed `rule`;
- optional manual fallback tour;
- localized presentation overrides;
- inherit/override policy flags.

Validation enforces exact keys, uniqueness, same-site publication and display
readiness. Existing `whyFeatured*` and `whyCards` content can be migrated into
editorial override fields, but static media bindings and manually entered
product hrefs must not remain as hidden product fallbacks after activation.

No new inventory collection is introduced. Any PostgreSQL migration is
additive and must preserve rollback to the previous release.

## UI / Platform Impact

- Preserve the current one-featured-plus-three-card visual hierarchy.
- Use real tour media by default, with an explicit CMS media override only when
  the card remains truthful and accessible.
- Provide a visible representative-tour cue and a localized CTA to Tour Detail.
- Preserve stable `data-od-id` values for the four roles.
- Maintain keyboard behavior, truthful alt text, 44px touch targets and zero
  horizontal overflow at supported breakpoints.
- Admin fields must remain understandable for editors and filtered to the
  current Page site.

## Observability

- Emit validation findings with slot key and reason, without exposing private
  admin data publicly.
- Production proof records resolved TourProduct source IDs, locales and wrapper
  paths for all four slots.
- Track configuration state (`ready`, `invalid`, `unconfigured`) in test/debug
  output.
- Do not introduce visitor identifiers or interaction-event storage.

## Alternatives Considered

1. Keep static cards and only change hrefs: rejected because product truth
   remains split between copy, code assets and TourProduct.
2. Replace the section with a generic tour grid: rejected because it duplicates
   US-050 discovery and removes the approved brand-message hierarchy.
3. Add visitor personalization now: deferred to a separate story because it
   adds identity, consent, Redis retention and ranking decisions.
4. Create a second recommendation collection: deferred until the same policy is
   proven reusable across multiple surfaces; Page-owned configuration is the
   smallest clean boundary for this story.
