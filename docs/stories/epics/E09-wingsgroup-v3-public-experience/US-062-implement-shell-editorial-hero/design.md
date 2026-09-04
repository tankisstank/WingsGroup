# US-062 Design

## Domain Model

Shell and hero content remain page/site data. Presentation capability is a
code-owned enum; behavior options are validated and cannot contain executable
content.

## Application Flow

Trusted site context selects WingsGroup settings and page hero, then the
renderer applies the tenant-scoped presentation. Carousel state is local UI
state and does not redefine CMS truth.

## Interface Contract

The hero exposes title, lede, slides, primary CTA, secondary CTA, active slide,
pause behavior, dots/arrows, and accessible labels. Missing media or channel
configuration uses an approved fallback.

## Data Model

Reuse US-061 fields. Any additional presentation enum is additive and covered
by generated types and migration compatibility.

## UI / Platform Impact

Breakpoints include 851px and 600px. Focus order follows DOM order, mobile menu
state is announced, and reduced motion disables autoplay and non-essential
transitions.

## Observability

Track CTA source, site, locale, and action without personal data. Client errors
must not expose CMS payloads.

## Alternatives Considered

1. Embed the prototype shell verbatim. Rejected because it bypasses current routing and CMS contracts.
2. Apply the visual system globally. Rejected because tenant isolation is required.
