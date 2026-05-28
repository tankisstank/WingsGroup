# Deployment, Server, Domain, And Email Notes

## Deployment Overview

- Deployment target: staging/production Node.js hosting capable of running
  Next.js + Payload in one app.
- Deployment method: Docker VPS is the Phase 1 default. Build from `app/` using
  `docker compose build`, then run the app, PostgreSQL, and Redis support
  services with `docker compose up -d`.
- Release workflow: deploy to staging, validate launch checklist, then promote
  the same build/config pattern to production.
- Rollback method: redeploy the previous build and preserve PostgreSQL backups
  before schema/content changes.

## Server Or VPS

- Provider: pending customer/hosting decision.
- Server or VPS name: pending.
- Region: pending.
- Operating system: Linux recommended for production.
- Runtime versions: Node.js `>=22`; package manager `pnpm`.
- Process manager or container setup: Docker Compose with restart policy is the
  default handover path.
- Storage or backup notes: media storage and PostgreSQL backup policy must be
  confirmed before production launch.

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
- Child-site domain(s): pending final WingsGo, WingsCare, WingsInsurance domain
  decisions.
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
