# WP1 content inventory and redline

- Run: `wingsside-us055-s3-20260728-r2`
- Package: `WP1`
- Base: `84aa2c835b9afd6863556a424ff435e148865b13`
- Decision scope: `D1-A`, `D2-A`, `D5-A`
- Status: ready for leader review; no production write or runtime integration

## Delivered inventory

| Artifact | Inventory | SHA-256 in this worker worktree |
| --- | ---: | --- |
| `app/scripts/data/wingsside-tour-content-candidates/en.json` | 22 unique English tour candidates | `ba70b2f64823808a2e94c0b8d9043d13291579a4294809d53bb5841efc326059` |
| `app/scripts/data/wingsside-tour-content-candidates/pricing-disclosures.json` | 38 unique source-row decisions; 5 labels per row | `bdf4e8653aae2b052e81235e78012c722b9494e8527f4baa96b292fa2ff85ee4` |
| `app/scripts/data/wingsside-tour-content-candidates/governed-source-rows.json` | sealed 38-row canonical identity/checksum snapshot | `5abd48991ec965f76e71e02a19f2d34b14094144a525caa3e8144ada5756dceb` |
| `app/scripts/data/wingsside-tour-content-candidates/validate.mjs` | deterministic schema, inventory, checksum and copy lint | `992cfdae89f6a501ea08e5bbddc08d46c4de13e6ac39613175d6266496909596` |
| `app/scripts/data/wingsside-tour-content-candidates/validate-adversarial.mjs` | eight false-pass probes | `9a4f14435b976260f1af5242f17bfc60504bd20628f62609ba7e313ed3fc286b` |

The EOL-independent canonical content checksums are
`39bf048e50502756a46662e2cd6274b15920e131081fa307c83ace4dc1fdb09f`
for the English candidate and
`4538cb5e7df76c8d1e7f25a3d4f98cee55f5be7cd0a0aa7620b15d955ec22f06`
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
It moves each row to `excludes`, because the source wording describes an amount
outside the base package price. The customer wording preserves the source
condition, 15% threshold and singular charge scope without adding a booking
promise.

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

## Corrective review round 1

Independent review found three P1 false-pass/content risks. The corrective
commit closes each one:

1. Unsupported `private`, adaptable and customization language was removed
   from all tours except the two Ninh Binh products whose canonical slugs
   explicitly bind private operation. Group/SIC inventory now uses neutral
   journey wording and non-customization CTAs.
2. The four unconditional compulsory-dinner rows
   `6a5a42d0e9a62d80e46ba98f`, `6a5a42e4e9a62d80e46baae1`,
   `6a5a42e6e9a62d80e46bab10` and `6a5a42e8e9a62d80e46bab28`
   now remain unconditional in all five locales. All peak-season wording uses
   a singular surcharge. Conditional language appears only where the source
   says `(if any)`, and fuel rows preserve the source 15% condition.
3. The validator is bound to a sealed 38-row snapshot containing exact
   slug/row-ID/source-bucket/source-label-checksum/eligibility tuples. The
   snapshot has a hard-coded EOL-independent checksum. Eight adversarial probes
   prove rejection of unknown IDs, swapped slug/ID pairs, self-rehashed labels,
   missing rows, extra rows, snapshot tampering, unsupported private claims and
   softened unconditional-dinner wording.

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
- eight adversarial false-pass probes;
- `git diff --check`.

The Harness executable is absent from the isolated worker worktree. No Harness
or Plane mutation was attempted by WP1; the leader owns integrated tracking.
