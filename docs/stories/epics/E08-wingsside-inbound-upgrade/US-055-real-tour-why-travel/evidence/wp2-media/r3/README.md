# D4-C technical review — S3 resume r3

## Outcome

This package closes the deterministic inventory and visual-disposition gap, but
does **not** claim D4-C release completion.

- Canonical source snapshot: `707a1acc8655663937c043143c24b062ee478d28d888ee029a2858da331fa446`
- Unique source hashes reviewed: `586 / 586`
- Visually clean at contact-sheet review scale: `395`
- Visible watermark-positive: `191`
- Uncertain: `0`
- Accepted processed outputs: `0`
- Rejected image-generation candidates: `3`

All 191 positive content hashes are listed individually in
`technical-blockers.json`. The three model-edit attempts and their rejected
candidate hashes are recorded in `imagegen-edit-attempts.json`; the rejected
files remain under `rejected-candidates/` so adverse evidence is not hidden.

## Evidence contract

`disposition-manifest.json` binds each disposition to the canonical source
SHA-256, byte length, media IDs, filename, contact sheet and cell. The 24 sheet
hashes are sealed in `contact-sheet-index.json`.

The review classified a source as positive when a visible BestPrice Travel
wordmark, logo or branded map overlay was present. Project-owner direction to
proceed with D4-C is recorded only as direction. It is not represented as
ownership or license evidence.

## Image edit stop condition

The built-in image edit was tried against the three previously confirmed
positives, media IDs `5626`, `5698` and `6202`, using strict precise-object-edit
prompts. Every candidate:

- changed dimensions from `800x450` to `1672x941`;
- regenerated protected people and/or scene detail; and
- therefore failed the required subject, framing and dimensional invariants.

The attempt budget stopped after the same material failure on all three known
positives. No candidate was accepted, reused or placed in the processed path.
Applying the same failing model operation to the remaining positives would not
produce truthful release artifacts.

## Deterministic verification

From `app/`:

```powershell
pnpm exec tsx scripts/prepare-wingsside-tour-media-d4c-review.ts verify `
  --inventory scripts/data/wingsside-tour-media-d4c/source-inventory.json `
  --media-root <approved Payload public/media snapshot> `
  --evidence-root ../docs/stories/epics/E08-wingsside-inbound-upgrade/US-055-real-tour-why-travel/evidence/wp2-media/r3
```

The verifier re-reads all 586 source files through the guarded root/file
contract, checks SHA-256 and byte length against the sealed inventory, and
strictly parses the full disposition manifest.

## Remaining release blockers

- All 191 positive assets still need faithful non-destructive outputs.
- No protected owned-or-licensed rights evidence was supplied.
- No signed independent reviewer or reliable zero-false-negative OCR artifact
  was supplied.
- Production write, deployment and canary remain outside this package.
