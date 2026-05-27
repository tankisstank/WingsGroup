# Deployment, Server, Domain, And Email Notes

## Deployment Overview

- Deployment target: staging/production Node.js hosting capable of running
  Next.js + Payload in one app.
- Deployment method: build from `app/`, run `pnpm build`, then `pnpm start` or
  an equivalent managed platform/container command.
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
- Process manager or container setup: managed platform, Docker, or process
  manager is acceptable if it supports persistent env vars and app restarts.
- Storage or backup notes: media storage and PostgreSQL backup policy must be
  confirmed before production launch.

## Environment Configuration

- Environment variables location: hosting provider secret store or server env.
- Secrets handling approach: never commit production secrets; rotate on handover.
- Database connection notes: SQLite is local-bootstrap only; staging and
  production should use PostgreSQL.
- Cache or Redis notes: Redis is the production-scale cache/KV support layer
  when traffic or operational requirements justify it.

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

- Provider: pending. Current local setup logs email to console when no adapter
  is configured.
- Purpose: account/admin notifications and any future form notifications.
- Sender domain: pending.
- SMTP or API method: pending provider choice.
- DNS records required: SPF, DKIM, DMARC or provider-specific records when an
  email provider is selected.
- Test status: pending provider configuration.

## Support And Ownership

- Who controls hosting: pending customer handover decision.
- Who controls DNS: pending customer handover decision.
- Who controls email service: pending customer handover decision.
- Renewal or billing notes: record provider owner, renewal date, and emergency
  contact before launch.
