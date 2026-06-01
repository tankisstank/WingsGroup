# Design

## Domain Model

No new persisted domain entities. The story keeps Payload as the content core and adds role-aware admin presentation.

## Application Flow

- Authenticated users can open `/admin/console`.
- The console queries existing Payload collections with `overrideAccess: false`.
- Editor users get draft/content actions only.
- Site-manager users get publish review and site-scoped import/export entry points.
- Super-admin users get advanced/system links.

## Interface Contract

- New custom admin view: `/admin/console`.
- Existing quick page wizard remains at `/admin/page-wizard`.
- Existing Payload routes for pages, posts, media, leads, imports, and exports remain unchanged.

## Data Model

No schema migration. Import/export sample files are static documentation assets.

## UI / Platform Impact

The admin surface is reorganized around Vietnamese operator language. Native Payload collection routes remain available but are grouped, hidden, or labeled by role where supported.

## Observability

Validation proof comes from typecheck, lint, importmap generation, build, e2e tests, and Playwright manual audit.

## Alternatives Considered

1. Full custom CMS app outside Payload. Rejected because it would duplicate access and content behavior.
2. Only rename Payload labels. Rejected because it does not solve orientation, empty states, or operator task flow.
