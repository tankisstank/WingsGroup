# US-063 Design

## Domain Model

The homepage is a Page Composer snapshot using governed block variants.
Ecosystem profiles and proof records retain publication state; CTA resolution
uses the configured/pending/disabled contract.

## Application Flow

Server rendering resolves site and locale, loads the WingsGroup page and media,
filters proof by publication state, and emits safe CTA targets. Client state
only selects the active ecosystem profile.

## Interface Contract

The ecosystem interaction exposes tab semantics, one active profile, one stage
image, one detail CTA, accessible live-region updates, and manual/automatic
selection that stops for reduced motion, hover, focus, and hidden tabs.

## Data Model

Reuse US-061 structures. Seed operations must be idempotent and scoped to the
WingsGroup page/locale; existing tenant pages are not rewritten.

## UI / Platform Impact

Desktop and compact layouts follow the fixed/natural-height contract. Source
order remains meaningful without JavaScript. All images use governed alt and
responsive derivatives.

## Observability

Record ecosystem selection and contact CTA events with site, locale, brand,
and source path. Do not record personal data before form submission.

## Alternatives Considered

1. Separate ecosystem cards and detail sections. Rejected because the approved experience is one synchronized explorer.
2. Hide pending proof entirely. Rejected because an explicit pending state is part of the trust contract.
