# US-031 Exec Plan

## Goal

Expand locale infrastructure safely while keeping public exposure controlled by
central metadata instead of scattered `vi/en` assumptions.

## Scope

In scope:

- Central locale metadata with CMS/public/ads flags.
- Payload localization and `Sites` locale options.
- Generated Payload types for 9 locale union.
- Public sitemap and revalidation loops using public-enabled locales only.
- English copy fallback for non-Vietnamese public locales.
- Locale audit evidence and migration smoke status.

Out of scope:

- Final IT/ES/PT native copy QA.
- Header mega menu and language switcher UX, owned by US-032.
- Content/media seed, owned by US-033.
- Production/staging migration apply without a real PostgreSQL environment.

## Risk Classification

Risk flags:

- Data model.
- Public contracts.
- Existing behavior.
- Weak proof.
- Multi-domain.

Hard gates:

- Payload localization config.
- Generated types.
- PostgreSQL migration smoke/staging apply before launch.

## Work Phases

1. Create central locale metadata and helper fallbacks.
2. Wire Payload config, `Sites`, route parsing, sitemap and revalidation to metadata.
3. Replace binary public chrome fallbacks where locale union breaks compile.
4. Run `generate:types`, targeted unit/int, eslint and typecheck.
5. Run PostgreSQL migration smoke if Docker/PostgreSQL is available.
6. Update story evidence and Harness.

## Stop Conditions

Pause for human confirmation if:

- A migration would delete or rewrite localized production data.
- Public JA/KO/FR/DE exposure becomes required before content QA.
- Staging PostgreSQL is unavailable for final launch proof.
- Validation requirements need to be weakened.
