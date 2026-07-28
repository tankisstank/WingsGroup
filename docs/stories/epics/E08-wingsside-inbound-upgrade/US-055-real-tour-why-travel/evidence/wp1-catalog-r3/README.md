# WP1 catalog authoring — S3 resume r3

Status: local deterministic rehearsal complete; production approval and write remain
out of scope.

## Source selection

- Accepted read-only source:
  `E:\repo\WingsTravel\app\payload-tourplatform.db`
- Size: `43,646,976` bytes
- Raw SHA-256 before and after export:
  `04b3c78cb8e38cfe476196a8faccdb95a3a55fef00042636fa596fc0703e1411`
- Inventory: 22 published WingSide English tours, 116 itinerary days, 331 stable
  service-row IDs, and 38 governed pricing rows.
- Rejected source:
  `E:\repo\WingsTravel-audit-r1-20260728\app\payload-tourplatform.db`
  because all nine required base/source tables were absent. The fail-closed export
  created no output files.

## Candidate and catalog results

- Full WP1 candidate checksum:
  `79dfd59a8b734d51c7771d2f02d7a8934ee35216d99e7e6c3d917316dde7c30a`
- Reconciled catalog-v2 checksum:
  `30e296dd91035c616307aec043a7385d4b6432309f6d9e0a4cbe09a6ee40d4c2`
- Reconciliation: 22 tours, 331 reviewed service rows, 38 D6-C dispositions,
  and five disclosure locales (`en`, `vi`, `it`, `es`, `pt`).
- The English candidate retains its historical `sourceChecksum` as
  `authoredAgainstSourceChecksum` and records a separate checksum of each current
  source tour. No historical checksum was silently relabeled.
- Input bindings record canonical JSON SHA-256, Git blob OID, current-worktree raw
  SHA-256, and the actual leader-worktree absolute path/raw SHA-256. Canonical JSON
  equality is the cross-EOL contract; raw hashes remain explicit evidence rather
  than a portable-content assumption.

## Rehearsal signing

The two signed rehearsal artifacts use fresh Ed25519 keys generated in memory.
Only public keys, policy metadata, review decisions, and signatures are stored.
No private key was written to the repository or filesystem.

The protected policy is:

- decision: `D6-C`
- policy ID: `wingsside-development-team-catalog-approval`
- policy version: `1`
- signer role: `development-team-release-approver`

Every committed signature is marked rehearsal-only and is not a production
authorization.

## Raw artifact SHA-256

| Artifact | SHA-256 |
| --- | --- |
| `source-snapshot.json` | `0c92ae30ca997cd9503f24a16d27c82e8a97d27f07f196a667a75e92cbe1b379` |
| `source-manifest-v2.json` | `8d0f232e427dcc2b3b2afb5f1a414b18a12ccfe41b8de7a70759dc7f43f5ad97` |
| `candidate-overlay.json` | `94c902672a7e7e63f47c686240f122eca4d0e7fd0def02de0ee6fe1488311a2a` |
| `candidate-review-packet.json` | `1c833e7704073ef635c25e43248a5f3d23f66c36493a259d2a0ded2d32292095` |
| `candidate-signed-rehearsal.json` | `3d140a7a0ea46d5bd8b575384f527c0fd234ea6cff1dcafbcf0936c642070a92` |
| `catalog-draft.json` | `1fdc8165b6cd0f76894a5a28c86b8ff3901c554bee3ac6f3b66d1ed75a620132` |
| `catalog-review-signed.json` | `bb06e59df5801cace596cf30b221b92495109096dc7ad5eb68a20bdc07b84330` |
| `catalog-public-policy.json` | `a571853d609922f3d616355c7c8bd02fa9621335ae1196a57da9607a0afe4313` |
| `catalog-v2.json` | `2e52883a18ff0676041f13339c02ba8abadccc0460670e40576c382eae97313f` |

## Validation

- Candidate validator: pass, 22 English tours and 38 × 5 disclosures.
- Candidate adversarial validator: 10/10 substitutions rejected.
- Focused unit: 19/19 pass.
- Full unit: 70 files / 618 tests pass.
- TypeScript: pass.
- Focused ESLint: pass.
- `git diff --check`: pass.

Tests explicitly reject checksum drift, row loss, locale substitution, policy
substitution, forged signatures, stale run IDs, and signed-evidence replay.
