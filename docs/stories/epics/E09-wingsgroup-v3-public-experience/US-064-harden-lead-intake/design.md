# US-064 Design

## Domain Model

- `LeadRequest`: normalized name, need, site, locale, source path, preferred channel, consent version, and consent timestamp.
- `ConsultationChannel`: `unconfigured`, `configured`, or `disabled`, plus approved URL, owner, SLA, and tracking metadata.
- `DeliveryResult`: accepted, rejected, or unavailable; never inferred from client state.

## Application Flow

The server resolves trusted site context, parses the request, verifies consent,
applies abuse controls, persists or delivers through the configured adapter,
and returns an explicit result. Client-provided tenant identity is not trusted.

## Interface Contract

Validation errors are field-specific and preserve values. Provider
unavailability returns a truthful retry/contact response. A channel preference
does not itself navigate or deliver unless the corresponding channel is
configured.

## Data Model

Any lead persistence fields and retention behavior require legal approval and
an additive PostgreSQL migration. Sensitive values are minimized and never
placed in analytics events.

## UI / Platform Impact

Dialog and form support keyboard navigation, visible focus, descriptive labels,
error summary/focus movement, and at least 44px touch targets.

## Observability

Log request ID, site, locale, action, duration, status, delivery adapter state,
and non-sensitive result. Personal form values, consent text, and credentials
are not logged.

## Alternatives Considered

1. Open provider links directly from prototype constants. Rejected because endpoints and owners are unapproved.
2. Treat a client submit as success. Rejected because delivery failure must remain visible and auditable.
