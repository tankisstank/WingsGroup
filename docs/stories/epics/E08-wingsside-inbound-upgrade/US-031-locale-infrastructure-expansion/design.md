# US-031 Design

## Domain Model

`app/src/utilities/locales.ts` is the central locale contract.

Each locale has:

- `code`
- `label`
- `fallbackLocale`
- `direction`
- `isCmsEnabled`
- `isPublicEnabled`
- `isAdsReady`

`CopyLocaleCode` intentionally remains `en | vi`. Until translated UI chrome is
available, every locale except `vi` falls back to English for public chrome.

## Application Flow

Route parsing accepts any CMS-enabled locale so editors and draft routes can
resolve localized content. Public surfaces use `publicLocaleCodes` so CMS-only
locales do not leak into sitemap, hreflang, nav, or ads-ready flows.

## Interface Contract

Wave 1 public locale contract:

- Public: `vi`, `en`, `it`, `es`, `pt`
- Ads-ready: `en`, `it`, `es`, `pt`
- CMS-only: `ja`, `ko`, `fr`, `de`

Public non-Vietnamese chrome falls back to English by `getCopyLocale()`.

## Data Model

Payload localization now includes 9 locale codes. `Sites.supportedLocales` and
`Sites.defaultLocale` use the same central option source.

`payload-types.ts` must be regenerated after config changes.

## UI / Platform Impact

Sitemap and revalidation loops must use public-enabled locales only. Route
parsing and CMS data access may use CMS-enabled locales.

## Observability

Harness trace and story evidence record validation outcomes, migration smoke
status, and unresolved locale audit items.

## Alternatives Considered

1. Keep app at `vi/en` and defer locale expansion.
2. Expand all 9 locales publicly immediately.
3. Chosen: 9 CMS-enabled locales with public exposure gated by metadata.
