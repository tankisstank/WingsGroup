# Design

## Domain Model

Public records use one authoritative view model:

```ts
type ProofRecord = {
  id: string
  category: 'appointment' | 'award'
  issuer: string
  year: string | null
  awardedEntity: string
  title: string
  summary: string
  image: string
  imageAlt: string
}
```

The implementation maps Payload `cert -> appointment` and `award -> award`.
`member` and `iso` are not misclassified; they are suppressed from the public
archive. Empty factual fields display localized neutral copy, not inferred facts.

## Application Flow

The production render flow remains:

`queryPageByPath(depth=3) -> filterCmsLayoutBlocksForHiFiComposer -> WingsSideHiFiPageBody -> HomeHiFiPage -> RenderBlocks -> CredentialsCarouselBlock -> WingsSideCredentialsCarousel`.

`RenderBlocks` now passes locale into block components so Proof Archive labels
are localized while records remain CMS-authored. `mapCredentialsBlockToProofRecords`
is the single pure mapper.

## Interface Contract

The public section keeps `data-od-id="home-creds"` and renders no section when no
public proof records survive mapping. User interactions:

- Filter buttons use `aria-pressed`.
- Active thumbnails use `aria-current="true"`.
- Previous/next wrap within the filtered set.
- Arrow Left/Right work only from focus inside the section, with guards for
  editable fields, modifier keys, and open dialog state.
- Document click opens a native dialog; Close, backdrop, and Escape close it and
  return focus.
- Active content uses `aria-live="polite"`.

## Data Model

No migration is added. The Payload block keeps legacy autoplay/interval fields
hidden for compatibility, and the renderer ignores them. New CMS authoring choices
for credential kind are restricted to `cert` and `award`; existing stored
unsupported values remain tolerated by the mapper.

## UI / Platform Impact

Desktop `min-width: 761px` uses a fixed `570px` proof stage with one grid row and
about `53% / 47%` document/copy split. Mobile `max-width: 760px` uses a fixed
`990px` proof stage with exact `430px 560px` rows and a horizontal snap thumbnail
rail. Both panes keep `height: 100%`, `min-height: 0`, and `min-width: 0`.

## Observability

No new runtime logs or audit records are introduced. Proof is via unit,
component, integration, CSS contract, and focused responsive E2E evidence.

## Alternatives Considered

1. Keep a carousel with pause/play: rejected because the proof task benefits from
   explicit inspection and no uncontrolled movement.
2. Hardcode the 21 rows in locale copy: rejected because CMS is the source of
   truth and production already has localized block rows.
