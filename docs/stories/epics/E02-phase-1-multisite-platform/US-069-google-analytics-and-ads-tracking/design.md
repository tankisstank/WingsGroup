# US-069 Design

## Domain Model

`SiteTrackingConfig` is a tenant-scoped, non-localized configuration containing
an enabled flag, Google tag/GA4 identifiers, Google Ads conversion identifiers,
conversion labels, and safe rollout metadata.

`TrackingConsent` represents purpose-level visitor choices for analytics and
advertising. It is separate from the mandatory consent captured by lead forms.

`AnalyticsEvent` is an allowlisted event name with a typed, bounded parameter
set. Every event carries the server-resolved `site_code`, supported locale, and
normalized public path where applicable.

`MarketingAttribution` contains only bounded campaign and click attribution
values such as UTM fields, `gclid`, `gbraid`, and `wbraid`. It is untrusted
measurement context and never controls tenant resolution or authorization.

## Application Flow

1. The server resolves the site from the production host and passes the site
   identity, locale, public pathname, and safe tracking configuration to the
   client tracking boundary.
2. The consent layer establishes the default denied state for analytics and
   advertising, then updates Google consent state immediately when the visitor
   makes a choice.
3. The tracking boundary loads the selected Google delivery path only when the
   site is enabled and consent allows it.
4. A typed client event helper emits the allowlisted page, CTA, contact, form,
   and lead events. Route transitions use the browser-visible public path, not
   rewritten internal Next.js paths.
5. The form emits `generate_lead` only after the accepted response and uses the
   existing form/tour context without including customer-entered values.
6. Attribution is captured at the public landing boundary and optionally
   attached to the durable submission record after bounded validation.
7. The rollout starts with a controlled WingsGo pilot, then enables the other
   production sites after the same event and tenant-isolation checks pass.

## Interface Contract

The application owns a small tracking adapter rather than exposing raw global
calls throughout the UI. The adapter supports a Google tag implementation and
can later be backed by GTM without changing event names.

Initial event contract:

| Event | Required parameters | Trigger |
| --- | --- | --- |
| `page_view` | `site_code`, `locale`, `public_path`, `page_type` | Initial render or public route transition, once per view. |
| `form_start` | `site_code`, `form_id`, `page_type` | First field interaction. |
| `form_error` | `site_code`, `form_id`, `error_type`, `status_code` | Validation or request error, without field values. |
| `generate_lead` | `site_code`, `form_id`, `locale`, `source`, `page_type` | Accepted form response, once per idempotency key. |
| `cta_click` | `site_code`, `cta_type`, `cta_location` | Approved CTA interaction. |
| `contact_click` | `site_code`, `channel`, `page_type` | Phone, email, or approved external channel click. |

Google Ads must use one conversion source per business conversion: either the
GA4 key event imported into Ads or a direct Ads conversion tag. Running both for
the same lead action is not allowed.

## Data Model

- Extend the site-scoped settings contract with a `tracking` group, or create
  an equivalent site-tracking collection if permissions require it.
- Add an optional bounded `marketingAttribution` group to form submissions only
  if the customer needs attribution retained with the lead record.
- Add a migration and PostgreSQL rehearsal when the submission schema changes.
- Keep tracking IDs, labels, UTM values, and click IDs out of audit logs unless
  a bounded non-sensitive operational record is explicitly required.
- Do not store Google API secrets, customer form values, or hashed customer data
  in the initial story.

## UI / Platform Impact

- Add consent UI in the application shell, not as a page-builder content block.
- Add the tracking boundary to the shared public layout so all host-root and
  locale routes inherit the same behavior.
- Preserve local path-prefix simulation while using production host/site context
  as the source of truth in deployed environments.
- Update the explicit CSP allowlist in `app/src/utilities/securityHeaders.ts`
  for the selected Google script, connection, image, and frame endpoints.
- Keep public page metadata, canonical URLs, sitemap output, and lead persistence
  unchanged when tracking is disabled.

## Observability

- Record non-PII rollout/configuration changes with site code, actor, and result.
- Add a monitoring checklist for GA4 Realtime/DebugView, Ads diagnostics, event
  counts by site, duplicate detection, consent-denied behavior, and CSP reports.
- Compare `generate_lead` counts against accepted form submissions and separately
  report lead delivery/qualification metrics from the application.
- Retain a per-site ID matrix and a timestamped production verification report.

## Alternatives Considered

1. Direct Google tag in the shared layout. Recommended for v1 because it is the
   smallest controlled implementation for GA4 plus Google Ads.
2. Google Tag Manager as the delivery layer. Valid future option when Marketing
   needs self-service tag changes; keep the same typed event/dataLayer contract.
3. Arbitrary script HTML in Payload. Rejected because it weakens tenant scope,
   consent enforcement, CSP governance, and reproducible QA.
4. One shared analytics ID without site context. Rejected because it obscures
   site ownership and makes tenant-level reporting and rollback unsafe.
