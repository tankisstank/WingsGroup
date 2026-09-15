# Design

## Domain Model

Brand identity remains static, versioned product artwork rather than user
content. A logo record is identified by `brandKey`, `surface` and `variant`:

- `brandKey`: `wingsgo`, `wing-side`, `wingspass`, `wingsplus` or `wingscare`;
- `surface`: header, compact-header, footer or icon/social export; and
- `variant`: primary, reverse or compact/mark.

The parent `wings-group` shell keeps its own governed lockups. Site ownership,
locale and publication state must be respected when a CMS-owned asset is used;
static fallback assets are never selected from another tenant.

## Application Flow

1. Resolve the trusted site code and surface context at the render boundary.
2. Resolve a logo through the brand-family manifest using the requested
   `brandKey`, surface and variant.
3. Validate that the selected asset has an approved checksum, dimensions and
   contrast/clear-space metadata before rendering it.
4. Use primary/reverse assets for the parent header theme and the compact/mark
   export for compact navigation; fail closed to the existing safe text/mark
   fallback when an asset is missing.
5. Render the shared homepage section-header primitive with a top anchor on
   desktop and natural block flow on compact viewports.

## Interface Contract

The shared Logo API should accept an explicit surface/context rather than
inferring a header-specific asset from a global CSS selector. The contract
must expose stable diagnostic attributes for tests (brand key, surface,
variant and source) without leaking internal file-system paths.

The section-header contract remains a semantic `<header>` with an eyebrow,
heading, optional description and optional actions. Desktop items are
top-aligned; mobile items collapse in source order. Existing IDs and
`aria-labelledby` relationships are unchanged.

## Data Model

No Payload schema migration is expected. The implementation should add or
extend a checked-in brand-family manifest containing:

- five brand keys and their approved surfaces/variants;
- source file and public URL;
- pixel dimensions and visible-artwork bounds;
- SHA-256 checksum and approval/provenance reference;
- contrast and clear-space constraints; and
- localized accessible alt text where the lockup is exposed as an image.

If the final assets are uploaded to Payload Media, each document must remain
site-scoped and publication-gated; the story does not authorize a production
CMS write.

## UI / Platform Impact

The header must remain stable at 390, 768, 1024 and 1440px. The parent shell
keeps its 76px desktop bar and must not let a larger visible logo push the
navigation into wrapping or clipping. The five section headers share one
desktop rule; the existing `max-width: 850px` block layout remains the compact
fallback.

## Observability

Browser evidence records the URL, site code, locale, viewport, logo source,
variant, measured image box, visible-artwork bounds, section-header computed
alignment and overflow result. Console errors, missing assets and cross-site
fallbacks are treated as failures. Checksums and approval references belong in
the manifest and validation report, not in public markup.

## Alternatives Considered

1. Increasing only the current PNG height or applying `transform: scale` —
   rejected because the transparent canvas remains padded and the 76px header
   can collide with navigation.
2. Cropping the official master in CSS — rejected because it is brittle across
   primary/reverse variants and violates the current `doNotCrop` contract.
3. Adding the existing `.site-logo-image--wingsgroup` selector only — rejected
   because the class is not emitted by `Logo` and cannot remove bitmap padding.
4. Replacing all section markup independently — rejected because a shared
   primitive is the source of the alignment defect and would drift across the
   five headers.
