# Design

## Domain Model

The shared application resolves tenant behavior from the public host. Default locale canonicalization is host-specific; each domain remains its own cache and SEO entity.

## Application Flow

An anonymous public request receives locale-aware routing, metadata/schema generated from its tenant content, and private browser caching without `no-store`. Preview, authenticated, admin, API, and media flows remain non-cacheable.

## Interface Contract

- Default-locale prefixed URLs redirect permanently to the unprefixed canonical path.
- `llms.txt` and `llms-full.txt` return tenant-specific Markdown.
- News detail returns Article OpenGraph/Twitter metadata.

## Data Model

No migration is introduced by this release. Production migration state is read-only verified before release.

## UI / Platform Impact

All six domains receive the application source release. No CMS content is modified.

## Observability

Use application health endpoints, HTTP headers/statuses, production browser inspection, and crawler output as release evidence.

## Alternatives Considered

1. Use shared CDN `s-maxage` immediately. Rejected because the App Router controls final `Vary`, so cookie-safe cache separation must be enforced at the edge first.
