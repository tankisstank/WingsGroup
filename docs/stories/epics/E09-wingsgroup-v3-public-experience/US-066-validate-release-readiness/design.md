# US-066 Design

## Domain Model

A release candidate is identified by immutable application revision, data plan
checksum, migration set, media manifest, target environment, gate snapshot, and
validation report. A release decision is `GO` or `NO-GO` with evidence.

## Application Flow

Freeze candidate → validate locally → validate PostgreSQL/data → review browser
surfaces → verify release gates → canary → production switch if explicitly
authorized → post-switch smoke → retain rollback.

## Interface Contract

Reports contain deterministic case IDs, route/viewport/locale, expected and
actual result, evidence path, timestamp, and blocker ownership. Secrets and PII
are excluded.

## Data Model

No new product schema is expected. Validation may read production-safe
metadata; any data write follows the approved, checksummed plan with backup and
rollback.

## UI / Platform Impact

The review covers all named viewports, keyboard and reduced-motion behavior,
forms, pending states, long content, and cross-tenant regressions.

## Observability

Verify canonical request logs, health/readiness, metrics, form result events,
and tenant/locale attribution. Record acknowledgement for external monitoring
where required.

## Alternatives Considered

1. Treat successful build as release readiness. Rejected because public, data, legal, and tenant contracts require runtime proof.
2. Mark partial proof as delivered. Rejected because tracker state must reflect actual acceptance.
