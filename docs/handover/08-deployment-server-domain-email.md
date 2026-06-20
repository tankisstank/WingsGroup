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
  `wingsside.vn`, `wingsplus.vn`
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

- Primary domain(s): pending final customer domain values.
- Child-site domain(s): pending final WingsGo, WingsSide, WingsPlus, WingsCare,
  and WingsPass domain decisions.
- Each child site is expected to run on its own public domain. `robots.txt`,
  sitemap index, and child sitemap URLs must resolve against the current host
  for that site instead of one shared umbrella host.
- DNS provider: pending.
- DNS records relevant to the project: app host records, any verification
  records, and email records if transactional email is configured.
- SSL or certificate notes: SSL must be active for every production public
  domain before launch.

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
