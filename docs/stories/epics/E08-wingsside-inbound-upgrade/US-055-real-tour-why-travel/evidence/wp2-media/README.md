# WP2 D4-C media evidence

## Outcome

WP2 is **blocked**, not ready for integration as a completed watermark-removal
package.

The deterministic inventory covers the exact 22 governed public tours and every
media binary referenced by their current `TourProduct` rows:

- 714 references;
- 714 unique Payload media IDs;
- 586 unique content hashes after byte-level deduplication;
- zero missing or empty source files; and
- sealed source snapshot
  `707a1acc8655663937c043143c24b062ee478d28d888ee029a2858da331fa446`.

The canonical inventory is
`app/scripts/data/wingsside-tour-media-d4c/source-inventory.json`. It preserves
every reference for duplicate content instead of silently collapsing the
observations.

## Why processing stopped

Manual inspection confirmed visible `BestPrice Travel` watermarks on at least
media IDs `5626`, `5698` and `6202`.

RapidOCR 1.4.4 detected the mark on `5626` and `6202`, but missed the visible
translucent mark on `5698`, including contrast-enhanced variants. That
demonstrated false negative means the OCR run cannot be used to attest that the
remaining inventory is clean.

The required image-generation edit was attempted for media `5626`. The
candidate removed the mark but regenerated the full photograph, changing
people, framing, detail and dimensions from `800x450` to `1672x941`. The
candidate was rejected and was not copied into the repository.

The existing authenticated evidence contract also requires owned-or-licensed
rights evidence plus signed manual-review and OCR artifacts. No such protected
artifacts were supplied for this run.

## Source immutability

No source media file was overwritten or deleted. The inventory generator was
run once in `generate` mode and again in `verify` mode against the original
Payload database and `public/media` snapshot. Both runs produced the same
source snapshot checksum.

## Reproduction

From `app/`, with a populated local Payload snapshot:

```powershell
pnpm exec tsx scripts/audit-wingsside-tour-media-d4c.ts generate `
  --database <payload-snapshot.db> `
  --media-root <payload-public-media> `
  --editorial-manifest scripts/data/wingsside-tour-editorial/source-manifest.json `
  --inventory scripts/data/wingsside-tour-media-d4c/source-inventory.json

pnpm exec tsx scripts/audit-wingsside-tour-media-d4c.ts verify `
  --database <payload-snapshot.db> `
  --media-root <payload-public-media> `
  --editorial-manifest scripts/data/wingsside-tour-editorial/source-manifest.json `
  --inventory scripts/data/wingsside-tour-media-d4c/source-inventory.json
```

`generate` intentionally uses exclusive creation and will not overwrite an
existing sealed manifest.

## Required continuation

Before D4-C can pass:

1. run a watermark detector/OCR workflow that has no false negative on the
   known-positive samples;
2. disposition all 586 unique source hashes;
3. create new non-destructive outputs for every positive asset;
4. reject any output that changes subject, framing or tour meaning;
5. complete an independent visual contact-sheet review; and
6. provide the protected rights, reviewer and OCR artifacts required by the
   authenticated release evidence producer.

## R4 superseding outcome

The canonical R4 package is `r4/README.md`. It verifies all 586 unique source
hashes and 233,893,714 bytes without source mutation. R3 remains immutable
historical evidence at 191 positive / 395 clean. R4 re-audited all 395
previously clean hashes, reclassified 29 false negatives and supersedes the
technical disposition with 220 watermark-positive / 366 clean.

Four near-duplicate candidates were manually reviewed and all four were
rejected because visible BestPrice Travel branding remained. Faithful governed
mappings and accepted replacements are both zero. The package is accepted as
an exact audit and empty no-write contract, not as D4-C completion. All 220
positive hashes, rights evidence and publication approval remain blocked.
