# WP1 content inventory and redline

- Run: `wingsside-us055-s3-20260728-r2`
- Package: `WP1`
- Base: `84aa2c835b9afd6863556a424ff435e148865b13`
- Decision scope: `D1-A`, `D2-A`, `D5-A`
- Status: ready for leader review; no production write or runtime integration

## Delivered inventory

| Artifact | Inventory | SHA-256 in this worker worktree |
| --- | ---: | --- |
| `app/scripts/data/wingsside-tour-content-candidates/en.json` | 22 unique English tour candidates | `1b9187bd5a73a1142a66a00031d10238b2c7a179174d1db606ef6f88346bf6e4` |
| `app/scripts/data/wingsside-tour-content-candidates/pricing-disclosures.json` | 38 unique source-row decisions; 5 labels per row | `b1b5888988b8c108cbc20cd82410e430fb236582db9c03d7650a19c021a06e07` |
| `app/scripts/data/wingsside-tour-content-candidates/validate.mjs` | deterministic schema, inventory, checksum and copy lint | `efcdae7fd9e370c511c5024a2be4dd542f277735c081366385b822dd69b930a9` |

The EOL-independent canonical content checksums are
`505ff594e2a73fdc51b5f6b40125b8a098ab04f11295b436d93bc6ba0bfd4fbe`
for the English candidate and
`5cbff18c51f4d641dcfbe3bcf4c657fe09cfab14450aac4a7809bd2616961e89`
for the disclosure artifact.

The English candidate is an additive overlay. It changes only title, summary,
route summary, CTA label and metadata. Its policy explicitly locks itinerary,
meal, include/exclude, service-summary, duration, price and currency paths.
Every candidate is bound to the corresponding checksum in the existing
22-tour source manifest.

## D1-A pricing redline

The audited local source inventory contains exactly 38 governed rows:

- 16 peak-season/compulsory-dinner rows;
- 22 fuel-surcharge rows;
- all 38 currently occur in the source `includes` bucket; and
- all 38 have a stable `sourceRowID`.

The additive decision artifact preserves every row identity and source label.
It moves each row to `excludes`, because the source wording describes a
conditional amount outside the base package price. The customer wording makes
the treatment explicit and commits to confirming an applicable amount before
booking.

Each decision contains complete, directly stored wording for:

- English;
- Vietnamese (`vi-VN`);
- Italian (`it-IT`);
- international Spanish; and
- European Portuguese (`pt-PT`, repository key `pt`).

No pricing row is deleted, collapsed or positionally inferred. A direct
read-only comparison against the audited local SQLite snapshot returned
`dbRows=38 artifactRows=38 mismatches=0`.

## D2-A English redline

All 22 manifest slugs now have a calm, specific and consultative English
candidate. The rewrite:

- removes source-vendor and imported SEO language;
- replaces urgency and generic superlatives with route-specific descriptions;
- states free days and activity level directly where relevant;
- uses the accepted Sa Pa/Lao Cai route facts under `D3-A`;
- avoids inventing availability, accommodation names, prices or reviews; and
- leaves itinerary days, meals and service rows locked for later governed
  overlay/reconciliation.

The candidate contains no `BestPrice`, `Best Price`, `book your tour NOW`,
`let your hair down`, `rat race`, `young people`, machine-translation marker
or unapproved shouting token.

## Approved-locale immutability

The approved `vi`, `it`, `es` and `pt` files have zero Git diff in this
package. A fresh Windows worktree applies EOL conversion, so raw filesystem
hashes in this worker worktree differ from the approval hashes while the
parsed JSON and canonical Git content remain unchanged. The leader's
integration worktree independently reproduces the approved raw-byte hashes:

| Locale | Approval SHA-256 |
| --- | --- |
| `vi` | `51a34eff906548413eaf774f0c840547395eff9228ca0a2eb18880f496970725` |
| `it` | `e0aefa38b7ec57d45856cca449a94a20fc435412c6a5fc022ad23fdf6877eff8` |
| `es` | `d7e000a482f31ffb039defeb7753452fca9be4fc38418b0928817e6bb46eb741` |
| `pt` | `f796d35566ab2225afea7900b82430759981567d9f0c87557e9e0c968b6a2653` |

Catalog generation must recheck these four raw-byte values in the leader
integration worktree. The additive disclosure file does not alter any approved
locale artifact byte.

## Validation

Passed:

- candidate validator: 22 tours, 38 disclosure rows, five labels per row;
- direct source-row reconciliation: 38/38, zero mismatches;
- targeted editorial/localization/catalog unit suites: 3 files, 43 tests;
- JSON parsing and stable source-label SHA-256 validation;
- forbidden vendor/SEO/shouting/machine-marker lint; and
- `git diff --check`.

The Harness executable is absent from the isolated worker worktree. No Harness
or Plane mutation was attempted by WP1; the leader owns integrated tracking.
