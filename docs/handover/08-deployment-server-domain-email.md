# Deployment, Server, Domain, And Email Notes

## Deployment Overview

- Deployment target: staging/production Node.js hosting capable of running
  Next.js + Payload in one app.
- Deployment method: Docker VPS is the Phase 1 default for production. Build
  from `app/` using `docker compose build`, then run the app, PostgreSQL, and
  Redis support services with `docker compose up -d`.
- Release workflow: deploy to staging, validate launch checklist, then promote
  the same build/config pattern to production.
- Rollback method: redeploy the previous build and preserve PostgreSQL backups
  before schema/content changes.

## Development Environment

- Workspace: `E:\repo\WingsTravel` repo workspace; public product identity:
  `WingsGroup`
- App source: `app/`
- Local bootstrap database: SQLite via `DATABASE_URL=file:./payload.db`
- Local schema push: `PAYLOAD_DB_PUSH=false` by default; only enable when
  intentionally bootstrapping or resetting local schema.
- Local runtime intent: use SQLite for fast bootstrap and editor/dev work. Keep
  PostgreSQL for staging and production only.
- Local production-shaped test stack: `app/docker-compose.yml` uses PostgreSQL
  and Redis support services for production-like verification when needed.
- Local environment variables: copy `app/.env.example` to `app/.env` when
  working locally and keep secrets out of version control.

## Production Environment

- Provider: Oracle Cloud VPS
- Public IP: `168.110.212.116`
- Hostname: `instance-20260604-2317`
- OS: Ubuntu 24.04.4 LTS
- Architecture: ARM64 (`aarch64`)
- Resources: 2 vCPU, 11 GiB RAM, 45 GB disk
- Current deployment root: `/home/ubuntu/wings-travel`
- Current release link: `/home/ubuntu/wings-travel/current`
- Runtime environment file: `/home/ubuntu/wings-travel/shared/.env`
- Admin credential file: `/home/ubuntu/wings-travel/shared/admin.env`
- Application binding: `127.0.0.1:3000`
- Docker project: `wingstravel`
- Database: PostgreSQL 16
- Cache: Redis 7
- Panel: aaPanel at port `14199`
- aaPanel access path: use the Tailscale endpoint documented in
  [docs/accounts.md](../accounts.md); keep the panel off the public internet
  unless a separate exposure decision is recorded.
- Public domains managed in production: `wingsgroup.vn`, `wingsgo.vn`,
  `wingside.vn`, `wingsplus.vn`, `wingspass.wingsgroup.vn`,
  `wingscare.wingsgroup.vn`
- TLS mode target: `Cloudflare Full`, with `Full (strict)` only after the
  origin certificate and origin validation path are confirmed end to end.

## Server Or VPS

- Current production runtime versions: Node.js `>=22`; package manager `pnpm`.
- Process manager or container setup: Docker Compose with restart policy is the
  default handover path.
- Storage or backup notes: media storage and PostgreSQL backup policy are
  already in place on the current production VPS and should be re-checked on
  every production push.
- Infrastructure naming note: the public app identity is `WingsGroup`, but the
  current production directory, Docker project, and Docker volumes intentionally
  keep the legacy `wings-travel` / `wingstravel` names until a separate
  infrastructure rename is planned with explicit volume backup and restore
  verification.

## Environment Configuration

- Environment variables location: server `.env.production`, Docker secret store,
  or equivalent VPS secret management.
- Secrets handling approach: never commit production secrets; rotate on handover.
- Database connection notes: SQLite is local-bootstrap only; staging and
  production must use PostgreSQL via `DATABASE_URL`.
- Cache or Redis notes: Redis is included in the Docker VPS stack as the
  production-ready cache/KV support layer. The app must not depend on Redis for
  source-of-truth data.

## Domain And DNS

- Primary domain: `wingsgroup.vn`.
- Child-site domains: `wingsgo.vn`, `wingside.vn`, `wingsplus.vn`,
  `wingspass.wingsgroup.vn`, and `wingscare.wingsgroup.vn`.
- Each child site is expected to run on its own public domain. `robots.txt`,
  sitemap index, and child sitemap URLs must resolve against the current host
  for that site instead of one shared umbrella host.
- DNS provider: pending.
- DNS records relevant to the project: app host records, any verification
  records, and email records if transactional email is configured.
- SSL or certificate notes: SSL must be active for every production public
  domain before launch.

### Production Domain State - 2026-06-24

- `wingside.vn` is the correct WingsSide domain. Do not use the previous
  typo `wingsside.vn` for new content, canonical URLs, or customer-facing
  documentation.
- `wingspass.vn` and `wingscare.vn` are not owned production domains for this
  launch. Use:
  - `wingspass.wingsgroup.vn`
  - `wingscare.wingsgroup.vn`
- Production Nginx must preserve the public `Host` / `X-Forwarded-Host` and
  allow the app to resolve the site from the Payload site registry. Do not set
  a fixed `X-Site-Code` for a shared server block that contains multiple child
  site domains; this previously caused WingsPass and WingsCare to render as
  WingsSide.
- Current public verification:
  - `https://wingsside.vn/`
  - `https://wingspass.wingsgroup.vn/`
  - `https://wingscare.wingsgroup.vn/`
  all return HTTP 200, correct `data-site-theme`, and host-specific canonical
  URLs.

### Localization Content State - 2026-06-24

- WingsPass has `vi` and `en` page locale rows in production. The `vi` locale
  is required because WingsPass defaults to `vi`; missing `vi` page locales
  cause the site shell to render with blank body cards.
- WingsCare has explicit English page content for its core pages. Do not rely
  on blind `vi -> en` mirroring for customer-facing English content.
- The related-pages component is locale-aware:
  - `vi`: `Tiếp tục khám phá` / `Trang liên quan`
  - `en`: `Continue exploring` / `Related pages`

## Email Server Or Transactional Email

- Provider: pending. Phase 1 remains console-only for email until the customer
  chooses SMTP or a transactional provider.
- Purpose: account/admin notifications and any future form notifications.
- Sender domain: pending.
- SMTP or API method: pending provider choice.
- DNS records required: SPF, DKIM, DMARC or provider-specific records when an
  email provider is selected.
- Test status: console-only validated by local Payload warning; production email
  delivery is not yet implemented.

## Support And Ownership

- Who controls hosting: pending customer handover decision.
- Who controls DNS: pending customer handover decision.
- Who controls email service: pending customer handover decision.
- Renewal or billing notes: record provider owner, renewal date, and emergency
  contact before launch.

## Production Push Re-Check Rule

Any request to deploy, update, or hotfix production must be re-confirmed before
execution. The minimum check list is:

- confirm the target host, release path, and compose project name
- confirm the live domains and TLS mode
- confirm the active environment files and secret paths
- confirm the container state before and after the change
- confirm the rollback point before touching data or schema

Do not treat a previous production state as current without re-checking the live
server, domains, and running containers.
