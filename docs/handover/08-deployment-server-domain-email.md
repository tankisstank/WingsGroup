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
- Local bootstrap database: SQLite via `DATABASE_URL=file:./payload-tourplatform.db`
- Local schema push: `PAYLOAD_DB_PUSH=false` by default; only enable when
  intentionally bootstrapping or resetting local schema.
- Local runtime intent: use SQLite for fast bootstrap and editor/dev work. Keep
  PostgreSQL for staging and production only.
- Legacy note: `app/payload.db` is an old pre-tour-platform SQLite snapshot and
  should be treated as backup only. Normal local dev should run against
  `app/payload-tourplatform.db`.
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
- SSH account: `ubuntu` on port `22`; use the authorized private key with
  `IdentitiesOnly=yes`, `BatchMode=yes`, and the repository/operator managed
  dedicated known-hosts file. Do not rely on an implicit SSH agent or accept a
  changed host key interactively.
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

- `wingside.vn` is the correct public domain and site name. Do not use the
  legacy typo `wingsside.vn` for new content, canonical URLs, or customer-facing
  documentation.
- `wingspass.vn` and `wingscare.vn` are not owned production domains for this
  launch. Use:
  - `wingspass.wingsgroup.vn`
  - `wingscare.wingsgroup.vn`
- Production Nginx must preserve the public `Host` / `X-Forwarded-Host` and
  allow the app to resolve the site from the Payload site registry. Do not set
  a fixed `X-Site-Code` for a shared server block that contains multiple child
  site domains; this previously caused WingsPass and WingsCare to render as
  WingSide.
- Current public verification:
  - `https://wingside.vn/`
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

- Provider: MayChuEmail SMTP, configured for WingsGroup lead notifications.
- Purpose: outbound lead-notification delivery only. POP3/IMAP are mailbox
  retrieval protocols and are outside this application's outbound path.
- Sender domain: `wingsgroup.vn`.
- SMTP method: use encrypted SMTPS on port 465, or port 587 with STARTTLS. The
  provider's unencrypted port 25 must be used only for an explicitly isolated
  compatibility test, never as the production transport.
- Runtime configuration: keep SMTP credentials and recipients only in
  `/home/ubuntu/wings-travel/shared/.env`; never commit them or print them in
  deployment logs. Recreate the app service after changing these variables so
  the container receives the updated environment.
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

## Reusable Production Release Procedure (verified 2026-09-06)

This procedure is for application-only releases. It intentionally leaves the
PostgreSQL and Redis containers running and does not run schema changes.

1. Confirm the target host, `current` release target, compose project
   `wingstravel`, app image ID, database/Redis container IDs, health endpoints,
   and free disk space. Do not start a build when Docker cannot safely unpack a
   second app image; image/cache pruning is destructive and requires an explicit
   decision.
2. Package a clean, committed source worktree, record its source SHA and archive
   SHA-256, upload it to `shared/artifacts/`, and extract it under
   `releases/<release-id>`. Verify the intended source file exists after
   extraction before building.
3. Tag the active app image as a rollback image before building. Build only the
   `app` service from the new release using the shared production environment.
4. After a successful build, atomically repoint `current` to the new release and
   run `docker compose --env-file /home/ubuntu/wings-travel/shared/.env -p
   wingstravel -f docker-compose.production.yml up -d --no-deps --no-build
   --pull never --force-recreate app` from that release's `app/` directory.
5. Verify `/api/health/live`, `/api/health/ready`, public proxy behavior, and
   that the PostgreSQL and Redis container IDs did not change. For a lead-flow
   change, execute one authorized synthetic browser submission through the
   normal Turnstile path and inspect only sanitized application logs/status.
6. If the app fails health checks, restore the prior `current` symlink, retag
   the preserved rollback image as `wingstravel-app`, recreate only `app`, and
   re-check health. Do not roll back database data as part of this procedure.

### Payload job and migration safeguards (verified 2026-09-06)

- The production Compose file must keep `build.target: runner`. The Dockerfile
  also contains an offline `tools` stage; without the explicit target, Compose
  can select it instead of the public Next.js runtime image.
- Run Payload migrations from a temporary `tools` image before switching the
  runtime image. Pass the same `DATABASE_URL` that Compose derives from the
  PostgreSQL variables, plus `NODE_ENV=production` and `PAYLOAD_DB_PUSH=false`.
  This avoids accidental local SQLite fallback in a one-off container.
- The current Payload job schema requires `payload_jobs.meta`, the three
  WingsGroup lead task enum values, and `payload_jobs_stats`. These are covered
  by migrations `20260906_081500`, `20260906_083000`, and `20260906_084000`.
- A root-owned deployment is not required to process jobs. The production
  `ubuntu` crontab invokes the protected local job endpoint every minute through
  `/home/ubuntu/wings-travel/shared/bin/run-payload-jobs.sh`; the script reads
  `CRON_SECRET` only from the non-versioned shared environment file.
- Do not invoke `docker compose ... up --force-recreate app` without
  `--no-deps`: Compose may recreate PostgreSQL even when only the app should be
  replaced. Use `--no-deps --no-build --force-recreate app` with the explicit
  shared `--env-file`.
- Before cache cleanup, keep at least the running app image and one tagged
  rollback image. It is safe to remove exited migration containers, obsolete
  tools images, and builder cache only after those protected images are listed.
