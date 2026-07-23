# Design

## Domain Model

Payload Pages remain authoritative for route content and layout blocks. Stable review IDs come from explicit route/card mapping or stored `odId`/slug values, never localized display titles.

## Application Flow

The catch-all route builds the hi-fi model from the Payload page. A CMS form consumed by the route-specific Plan or Contact conversion slot is removed from the reusable block stream; all other allowed reusable blocks continue to render.

## Interface Contract

- Eight public WingsSide routes retain their current URLs and navigation.
- Plan and Contact expose one form each and stable form/submit markers.
- Destinations, Styles, Packages, Guide, Home, and Contact expose the requested card/control markers.
- Responsive pages have no horizontal overflow at 360, 390, 430, 768, 1024, and 1440 pixels.

## Data Model

Use existing localized Payload page JSON for route cards and channels. Add explicit stable IDs only if the existing content model supports them without a destructive migration; otherwise use route-position contracts tied to the approved fixed inventory.

## UI / Platform Impact

Changes are scoped under WingsSide hi-fi classes and components. Desktop navigation, media panels, heading typography, and mobile CTA rules must not leak to other sites.

## Observability

DOM assertions, marker counts, browser console errors, overflow measurements, screenshots, go-live review output, and Harness evidence provide the audit trail.

## Alternatives Considered

1. Rendering missing package cards as JSX fallbacks was rejected because it would hide incomplete CMS data.
2. Removing all reusable form blocks globally was rejected because it could affect unrelated page composition.
3. Global typography/header changes were rejected in favor of WingsSide-scoped selectors.
