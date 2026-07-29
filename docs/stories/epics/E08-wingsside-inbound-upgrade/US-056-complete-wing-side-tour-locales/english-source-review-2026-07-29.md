# US-056 English production baseline review — 2026-07-29

## Decision

The customer approved the current English production catalog of 22 published
WingSide tours as the new editorial baseline.

## Review finding

All 22 tours contained usable English source copy, but the commercial arrays
had a consistent storage defect:

- `excludes` was empty;
- genuine inclusions and exclusions had been concatenated into `includes`;
- itinerary structure and source wording remained usable.

This was not treated as new copywriting or silently accepted as correct data.
The review preserved every English sentence and restored only its commercial
classification. The split point for each tour came from the previously
approved locale catalog, whose four locales agreed on the same per-tour
inclusion and exclusion cardinality.

## Approved normalized inventory

| Measure | Result |
| --- | ---: |
| Published English tours | 22 |
| True inclusions | 129 |
| Exclusions | 202 |
| Tours with empty exclusions after normalization | 0 |
| Source manifest checksum conflicts | 0 |
| Target locale catalog findings | 0 |

## Editorial quality rule

VI, IT, ES and PT copy was reconciled against this normalized source using a
calm, specific and consultative travel voice. The review rejected:

- verbatim English fallback;
- word-for-word English sentence structure;
- missing accents or unaccented Vietnamese;
- unsupported promises, prices or operational claims;
- missing peak-season, fuel, visa, passport or compulsory-meal clauses that
  are present in the approved English source.

## Release implication

The checked-in source manifest now represents the approved normalized English
baseline. Production English data still needs the same semantic array
normalization as a guarded production mutation; the manifest update alone does
not alter the production database.
