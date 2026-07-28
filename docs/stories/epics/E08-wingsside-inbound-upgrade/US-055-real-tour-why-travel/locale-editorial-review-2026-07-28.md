# US-055 Four-locale Editorial Review

Review date: 2026-07-28  
Reviewer: independent Codex editorial review  
Decision: **candidate ready for Product/Content review; not approved for production**

## Scope

This review covers the complete legacy editorial files for the 22 governed
WingSide tour products:

| Locale | Intended market profile | Tours | Artifact SHA-256 |
| --- | --- | ---: | --- |
| `vi` | Vietnamese for Vietnam (`vi-VN`) | 22 | `51a34eff906548413eaf774f0c840547395eff9228ca0a2eb18880f496970725` |
| `it` | Italian for Italy (`it-IT`) | 22 | `e0aefa38b7ec57d45856cca449a94a20fc435412c6a5fc022ad23fdf6877eff8` |
| `es` | International Spanish, suitable for a broad European/inbound audience | 22 | `d7e000a482f31ffb039defeb7753452fca9be4fc38418b0928817e6bb46eb741` |
| `pt` | European Portuguese candidate (`pt-PT`) | 22 | `f796d35566ab2225afea7900b82430759981567d9f0c87557e9e0c968b6a2653` |

The repository locale key remains `pt`. Product/Content must confirm the
`pt-PT` audience before any broad orthography normalization. The current copy
already uses European Portuguese vocabulary such as `Vietname`,
`pequeno-almoço`, `autocarro` and `planeie`.

## Independent findings and redlines

The catalog is not a literal or word-for-word translation. Titles, summaries,
calls to action, itinerary copy and service summaries are generally adapted to
the travel context and use the declared calm, specific and consultative voice.

The review nevertheless found internal source-analysis language exposed in
customer-facing fields. Phrases equivalent to “the source contains six days,”
“according to the source,” and “the source is inconsistent” appeared in all
four locales. These phrases were replaced with direct, customer-appropriate
statements about:

- day 6 being free in the seven-day Hoi An program;
- day 4 being free in the five-day Phu Quoc program;
- days 5-7 being free in the Ninh Thuan program;
- the first-night location being confirmed before service booking;
- the Ninh Thuan transfer mode being confirmed before booking; and
- included or excluded meals without referring to upstream data.

The following additional language-quality corrections were made:

| Locale | Tour | Correction |
| --- | --- | --- |
| `it` | Central Vietnam | Replaced the calque `vita della città antica` with `vita del centro storico`. |
| `it` | Northern soft adventure | Replaced the awkward `Avventura dolce` with `Avventura a ritmo moderato` in title, SEO title and breadcrumb. |
| `it` | Phu Quoc | Replaced `giornate private` with customer-oriented couple language. |
| `es` | Central Vietnam | Replaced `vida de la ciudad antigua` and `días privados` with natural travel phrasing. |
| `es` | Mekong gateway | Replaced `cruces culturales` with `encuentros culturales`. |
| `es` | Phu Quoc | Replaced `días privados` with `días para disfrutar en pareja`. |
| `pt` | Central Vietnam | Replaced `dias privados` with an explicit private-trip construction. |
| `pt` | Phu Quoc | Replaced `dias privados` with natural `dias a dois`. |

## Validation performed

- JSON parsing passed for all four artifacts.
- Each artifact contains exactly 22 tours.
- Slug inventory matches the ordered 22-tour source manifest with zero missing
  or extra slugs.
- Required top-level customer fields are non-empty for every tour.
- No `BestPrice` or `Best Price` source-brand strings remain.
- No internal “source/fonte/fuente/nguồn” wording remains in customer content;
  Spanish and Portuguese occurrences of `fuentes/fontes de Thanh Tan` mean
  thermal springs and are intentionally retained.
- Targeted catalog/localization unit tests passed: 2 files, 24 tests.
- Full unit suite passed: 67 files, 597 tests.
- TypeScript passed with `pnpm exec tsc --noEmit`.
- ESLint completed with zero errors and the existing 149 baseline warnings.
- `git diff --check` passed.

The database-backed `validate:wingsside:locales` command was attempted but the
current disposable SQLite database has not been migrated and contains no
`users` table. That failure is an environment prerequisite failure, not a
locale-content finding. It must be rerun against the production-like
PostgreSQL clone required by the release plan.

## Remaining approval gates

This review does **not** represent customer, Product or native-language
approval. Production remains on HOLD until:

1. Product/Content confirms the four audience profiles, especially `pt-PT`.
2. A native or market-qualified reviewer accepts the complete four files, not
   only the redlined excerpts.
3. Product/Content approves the exact disposition and all four localized labels
   for the 38 governed pricing disclosures.
4. The canonical version-2 source manifest and frozen source inventory are
   supplied. They are not currently present as review artifacts in the
   repository.
5. The protected catalog-v2 draft is generated from these exact artifact bytes.
6. A trusted approver signs the complete review artifact, including every row
   decision and `fullCandidateChecksum`.
7. Reconciliation produces a valid catalog-v2 and the production-like
   PostgreSQL apply/verify/rollback rehearsal passes.

No approval artifact, signature, production plan, deployment or production
data write was created by this editorial review.
