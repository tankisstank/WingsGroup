# Site Review preview matrix

## Local manual proof

Runtime: local authenticated SQLite fixture, Chromium, read-only. The iframe
initializer is same-origin and delegates the public route to the server-validated
preview handoff; it does not concatenate `window.location.origin` with a mutable
tenant domain.

Production CMS URL provided for this audit: `https://wingsgroup.vn/admin`.
Security checks intentionally normalize this to the CMS origin
`https://wingsgroup.vn`; the `/admin` path is only the referrer path and must not
be used as the public preview target. The regression test uses
`https://wingsgroup.vn/admin/collections/pages/308` as its CMS referrer.

Anonymous production preflight confirmed that this path returns the Payload
login shell after retaining the one-time `payload-lng=vi` bootstrap cookie. The
first request's same-URL `307` is expected proxy behavior; it is not a preview
target or a cross-domain iframe result.

| Site/item | Requested preview | Final child frame | Result |
| --- | --- | --- | --- |
| WingSide, page `50`, `en` | `/next/preview?collection=pages&id=50&locale=en&path=%2F` | `/wing-side` | Pass; title was WingSide; no Not Found |
| WingsGo, page `29`, `vi` | `/next/preview?collection=pages&id=29&locale=vi&path=%2F` | `/wingsgo` | Pass after dev compile and handshake retry; no Not Found |

Site Review loaded 90 review items in the local fixture. The final ready
message was accepted only when `event.origin` and `event.source` matched the
expected frame. The child sent a sanitized ready payload containing collection,
document ID, locale, mode, path and site code; no token was copied into evidence.

The parent now pings the child on load and for a bounded retry window. This
addresses the load-order race where the first `ready` message could be emitted
before the parent listener existed. Selecting a different site/item clears the
previous pending state and rejects stale responses.

## Automated security and locale proof

- Current remediation-focused preview/site-review run: 6 files, 19 tests passed.
- WingsGo default `vi` to public `en`: signed claims keep the canonical path
  without a locale prefix and handoff redirect targets `/en/...` on the
  allowlisted `wingsgo.vn` origin.
- WingSide default `en` to public `it`: signed claims keep the canonical path
  without a locale prefix and handoff redirect targets `/it/...` on the
  allowlisted `wingside.vn` origin.
- CMS-only `ja` is rejected before Payload access; public locale policy remains
  unchanged.
- Preview handoff tests cover normalized path, expiry, audience/site/document/
  locale binding, trusted frame authorization and local/public origin policy.
- Preview route resolves the persisted document/site server-side, rejects
  unsupported locale/non-public mode and uses the production origin allowlist.
- The handoff is short-lived and POSTed; it is not placed in a durable query
  string. Invalid or expired grants are rejected.

## Open coverage

- The local fixture uses same-origin aliases (`/wing-side`, `/wingsgo`); this is
  not proof of actual browser cookie/frame behavior between production domains.
- Safari/iOS, production frame policy, DNS/proxy host routing and production
  draft preview remain release gates.
- One local fixture image request returned HTTP 400 during a browser pass; it was
  unrelated to the preview initializer/handshake and produced no Site Review
  error or Not Found state.
