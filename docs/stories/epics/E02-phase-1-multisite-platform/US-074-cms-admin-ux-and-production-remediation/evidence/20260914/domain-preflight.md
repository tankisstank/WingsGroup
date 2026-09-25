# WingsGo domain preflight

Date: 14/09/2026, latest probe 23:17–23:19 ICT. This was read-only; no CMS
record, DNS record, reverse proxy, allowlist or account was changed.

## Latest evidence snapshot

The read-only HTTP/browser probe confirmed the public health endpoints and the
anonymous CMS entrypoint:

| Probe | Result |
| --- | --- |
| `/api/health/live` | HTTP 200, status `ok` |
| `/api/health/ready` | HTTP 200, status `ready`; database, lead delivery and Redis reported up |
| `/admin?locale=vi` | Payload locale bootstrap, then Vietnamese login shell |
| Admin viewport 360×800 | `bodyClientWidth = bodyScrollWidth = 360`; no visible alert |
| Admin viewport 1440×900 | `bodyClientWidth = bodyScrollWidth = 1440`; no visible alert |

Screenshots: [360px login shell](../../../../../../../app/output/playwright/us074-production-admin-gate-360-login.png)
and [1440px login shell](../../../../../../../app/output/playwright/us074-production-admin-gate-1440-login.png).

These screenshots are anonymous login-shell evidence only. They do not prove
the authenticated admin shell, child-domain preview, Site record, allowlist or
reverse-proxy mapping.

## Go-live pipeline runner note

A focused `pnpm run go-live:review` attempt for `https://wingsgo.vn` could not
start because the installed Playwright runner has no compatible Chromium binary
for `ubuntu26.04-x64` (`Playwright does not support chromium on ubuntu26.04-x64`).
No report from that attempt is treated as pass evidence. The host/health results
above came from the successful read-only HTTP probe, and the admin geometry
results came from `agent-browser`.

## Public host smoke

All six configured public hosts returned HTTP 200 over the HTTPS path observed
by the probe:

| Site | Host | HTTP result |
| --- | --- | --- |
| WingsGroup | `wingsgroup.vn` | 200 |
| WingsGo | `wingsgo.vn` | 200 |
| WingSide | `wingside.vn` | 200 |
| WingsPlus | `wingsplus.vn` | 200 |
| WingsPass | `wingspass.wingsgroup.vn` | 200 |
| WingsCare | `wingscare.wingsgroup.vn` | 200 |

WingsGo returned canonical `https://wingsgo.vn` and `og:url`
`https://wingsgo.vn` in the public response. This supports the repository
contract that `wingsgo.vn` is the current production host.

## CMS admin entrypoint preflight

The operational CMS URL is `https://wingsgroup.vn/admin`.

- A request without the Payload admin-locale cookie returns one `307` response
  with `Location: /admin` and sets `payload-lng=vi`. This is the intentional
  same-URL locale bootstrap in `app/src/proxy.ts`; a stateless HTTP probe that
  does not retain cookies will repeat that response.
- A request retaining `payload-lng=vi` returns `200 OK` for
  `https://wingsgroup.vn/admin` and contains the Vietnamese login shell.
- `/admin/login` returns `200 OK` with the same cookie, while `/admin/` first
  canonicalizes to `/admin` with `308`.

Therefore the current CMS path is reachable anonymously and the observed
redirect is not evidence of a production admin-route outage. This probe does
not authenticate, inspect CMS records, or prove the production Site Review
allowlist/reverse-proxy configuration.

## Not yet observable

The runtime had no production DB/Payload credentials or deployment configuration
to read. Therefore the following are **open**, not pass/no-op conclusions:

- CMS `Sites` record primary domain and additional domains;
- `PREVIEW_PUBLIC_ORIGINS`/deployment allowlist exact entry;
- reverse-proxy host mapping and HTTPS/redirect policy;
- Site Review behavior against the real child-domain origin.

The local fixture `wingsgo.local` in `app/scripts/seed-subsites.ts` was preserved;
it is a local fixture and was not changed to manufacture production proof.
Production apply requires owner approval, exact before/after diff, backup,
canary, after-state and rollback evidence.
