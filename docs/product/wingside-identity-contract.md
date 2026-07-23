# wingside.vn identity contract

## Canonical identity

The following values are normative for the Wingside tenant:

| Concern               | Canonical value                   | Notes                                                                                 |
| --------------------- | --------------------------------- | ------------------------------------------------------------------------------------- |
| Public site name      | `wingside.vn`                     | Use in current product, launch, SEO, CMS and customer-facing documentation.           |
| Canonical origin      | `https://wingside.vn`             | `www.wingside.vn` may redirect or resolve as an additional domain.                    |
| Technical tenant code | `wing-side`                       | Stored in `sites.code`; used by routing, cache, capability, access and import scopes. |
| Local path alias      | `/wingsside`                      | Development-only multisite simulation path; it is not the tenant code.                |
| Theme key             | `wings-side`                      | Existing visual-theme identifier. It is intentionally distinct from the tenant code.  |
| Theme preset          | `wings-side-editorial-inbound-v2` | Existing Wingside hi-fi token preset.                                                 |
| Source wordmark       | `WING SIDE`                       | Brand-source provenance only; not the current public site name or tenant code.        |

## Implementation rules

- Never use `wings-side` as a tenant code in new code, seed data, imports, tests,
  proxy headers or deployment configuration.
- Never use `wing-side` as a replacement for the existing theme key or theme
  preset keys unless a separate, explicitly approved theme migration is created.
- Keep `/wingsside` as the local alias so existing development URLs remain
  stable.
- CMS `sites.name`, `site-settings.siteName` and default logo text use
  `wingside.vn`. An approved image logo may still visually contain the source
  wordmark.
- Historical audit evidence may retain old names when quoting the state that was
  actually observed. Such evidence is non-normative and must link back to this
  contract when reused for current planning.

## Data migration

Migration `20260722_230000_wing_side_tenant_identity` changes the legacy tenant
code `wings-side` to `wing-side` and normalizes legacy display names to
`wingside.vn`. It deliberately leaves `branding_theme_key = 'wings-side'`
unchanged. The migration fails closed if both tenant codes already exist.

Before applying to staging or production:

1. Back up PostgreSQL.
2. Confirm exactly one site owns `wingside.vn`.
3. Confirm `wing-side` does not already belong to another site.
4. Apply migrations before starting the new application release.
5. Verify host resolution, `data-site-code="wing-side"`, CMS ownership and the
   eight hub routes plus one tour detail route.
