# US-053 Design

## Domain Model

- Public locale set: `en`, `vi`, `it`, `es`, `pt`.
- Tenant identity: site code `wing-side`, public host `wingside.vn`.
- Route inventory key: `(site, locale, pathname)`.
- Editorial finding key: `(locale, pathname, fieldPath, marker)`.
- A public URL is valid only when its hostname belongs to the WingSide allowlist
  and its same-locale route resolves successfully.

## Application Flow

1. Resolve the current tenant and locale at the request boundary.
2. Generate metadata, robots and sitemap entries from the tenant-scoped route
   inventory rather than a cross-site global fallback.
3. Render forms with explicit localized labels and stable control IDs.
4. Validate internal hrefs against the same-locale route inventory.
5. Audit CMS and rendered copy for forbidden/default-language markers.

## Interface Contract

- Every public locale route returns an absolute, self-referential canonical.
- Hreflang alternates are reciprocal and include only published locale routes.
- Robots and every sitemap level contain no hostname outside the WingSide
  allowlist.
- Form fields expose meaningful localized names, inline errors and deterministic
  focus after failed validation.
- Internal links either resolve in the active locale or are not rendered.

## Data Model

No schema migration is expected. If editorial remediation changes Payload
records, use a signed plan with stable page/field identity, dry-run, idempotent
apply, audit and rollback artifacts.

## UI / Platform Impact

- Plan and Contact forms at desktop 1440px and mobile 390px.
- Public Home, destination, style, package and Tour Detail routes in five
  locales.
- Production robots, sitemap root and child sitemaps.
- No intended visual change to US-050 discovery or US-052 Proof Archive.

## Observability

- Record route counts, locale counts, foreign-host count and internal-4xx count.
- Record accessibility violations by route/control.
- Record locale blocker/warning counts by locale and field path.
- Preserve immutable before/after artifacts for production release review.

## Alternatives Considered

1. One patch per locale: rejected because it duplicates routing and validation
   behavior and can drift between locales.
2. Mark P1/P2 polish as release blockers: rejected because those items require
   separate product/design prioritization and are tracked in CR-WS-002.
3. Reopen US-048/050/052: rejected because their accepted scope remains useful;
   reproducible regressions receive new bug identities and proof.

