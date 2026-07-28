# D4-C R4 governed replacement analysis

## Outcome

R4 does not accept any replacement and does not claim D4-C completion.

- Canonical source snapshot: `707a1acc8655663937c043143c24b062ee478d28d888ee029a2858da331fa446`
- Source hashes/bytes verified read-only: `586 / 233,893,714`
- R3 historical disposition: `191` positive / `395` clean
- R4 prior-clean hashes manually re-audited: `395 / 395`
- R4 false negatives reclassified positive: `29`
- R4 superseding disposition: `220` positive / `366` clean
- Exact clean replacements accepted: `0`
- Near-duplicate pairs initially eligible for review: `4`
- Near-duplicate pairs rejected after manual review: `4`
- Faithful governed mappings: `0`
- Remaining blocked positive hashes: `220`

The four near-duplicate candidates that motivated the corrective audit all
retained visible BestPrice Travel branding. The expanded original-resolution
zone audit found 25 additional false negatives. R3 remains immutable historical
evidence; `superseding-disposition.json` is the R4 technical disposition.

This is a visual technical classification only. It does not assert ownership,
license rights, or permission to publish any asset.

## Deterministic proof

`clean-zoom-index.json` seals 25 sheets covering all 395 R3-clean hashes. Each
cell contains the full frame plus enlarged top-right, bottom-left and
bottom-right decoded-source quadrants. `clean-zoom-decisions.json` records the
manual disposition and the exact 29 reclassified hashes.

`candidate-ranking.json` binds all 586 source hashes and 233,893,714 bytes, then
ranks only the 366 revalidated-clean hashes using deterministic grayscale dHash,
aspect compatibility, same-tour preference, semantic role and gallery-slot
distance. No pair passes the governed review threshold after superseding
reclassification.

From `app/`:

```powershell
$env:TEMP = 'E:\temp\us055-r4-media'
$env:TMP = $env:TEMP
pnpm exec tsx scripts/analyze-wingsside-tour-media-d4c-replacements.ts verify `
  --inventory scripts/data/wingsside-tour-media-d4c/source-inventory.json `
  --disposition ../docs/stories/epics/E08-wingsside-inbound-upgrade/US-055-real-tour-why-travel/evidence/wp2-media/r3/disposition-manifest.json `
  --media-root E:\repo\WingsTravel\app\public\media `
  --evidence-root ../docs/stories/epics/E08-wingsside-inbound-upgrade/US-055-real-tour-why-travel/evidence/wp2-media/r4
```

The verifier re-reads the approved media root through the guarded path/file
contract, confirms every hash and byte length, regenerates ranking and
superseding dispositions, verifies all 25 zoom-sheet hashes, and validates the
empty no-write mapping contract.

## No-write apply contract

`candidate-mapping.json` is deliberately empty. It preserves source media IDs
and forbids source-media or production writes. A future non-empty mapping would
require an independently approved existing-clean media ID, exact source binding,
an authorized apply plan and rollback evidence.
