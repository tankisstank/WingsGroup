# US-055 disposable PostgreSQL rehearsal

This rehearsal is local-only and fail-closed. It creates a uniquely named
PostgreSQL 16 container and database containing `rehearsal`, resolves
`postgres:16` to an immutable official `postgres@sha256:...` digest before launch,
publishes a random PostgreSQL port on `127.0.0.1` only, uses no persistent Docker
volume, and removes the container and temporary backup on success or failure.

Run from `app/`:

```powershell
pnpm run rehearsal:wingsside:us055
```

The readiness probe explicitly uses TCP `127.0.0.1:5432` inside the container.
It therefore cannot mistake the image's temporary init-only Unix-socket server for
the final PostgreSQL server.

The runner enforces `PAYLOAD_DB_PUSH=false`, applies committed Payload migrations,
and seeds [frozen-source-snapshot.json](frozen-source-snapshot.json). That artifact
is bound by raw SHA-256 and its internal canonical snapshot checksum and contains
exactly 22 tours, 116 itinerary days, and 331 stable service rows.

Before backup and after restore, the runner reconstructs the complete English
source content from PostgreSQL. It verifies:

- every title and summary;
- all 331 service row IDs, buckets, ordering, labels, and row checksums;
- all 116 stable `slug + dayNumber` itinerary identities and complete day content;
- one canonical checksum for each tour and the full 22-tour artifact.

The child process environment is built from an operating-system allowlist.
SMTP, Redis, release SHA, cron, production operator, and protected production
catalog variables are explicitly blanked. Evidence never includes the database
password or a credential-bearing URL.

## Catalog r3 input contract

Catalog-dependent phases remain `pending` until the leader supplies a JSON file
through `US055_REHEARSAL_ARTIFACT_CONTRACT`. The file must contain all fields:

```json
{
  "catalogPath": "absolute-or-app-relative/catalog-v2.json",
  "catalogSha256": "lowercase-sha256",
  "planPath": "absolute-or-app-relative/plan.json",
  "planSha256": "lowercase-sha256"
}
```

The runner freezes the contract by recalculating both file hashes. A partial
contract or hash mismatch fails the rehearsal. Even when all four artifacts are
present and valid, the lifecycle check remains explicitly `pending` with
`validatedArtifacts: true`; artifact validation never implies that
`plan -> apply -> verify -> rollback -> verify` ran. That lifecycle still requires
the leader-provided release SHA, protected catalog hash, signer/target proofs,
operator, backup checksum, restore evidence, and mutation confirmations required
by the production-semantic importer. No credential or production target belongs
in this file.

The baseline result is intentionally `baseline-ready-catalog-pending`; it must not
be interpreted as a release `SHIP` decision. Evidence files created before the
full-content corrective round are retained as history but are superseded by runs
that contain `frozen-source-artifact`, `seed-full-frozen-source`,
`postgres-final-server-readiness`, and full-content `restore-drill` checks.

## R4 applied lifecycle contract

The root-level R3 JSON files remain immutable historical baseline evidence.
R4 executes the protected catalog in disposable PostgreSQL 16 only, bound to
IPv4 loopback, an unprivileged port, a rehearsal database name and the exact
worktree HEAD.

The accepted integration run is:

- terminal evidence: `r4/r4-ce5a67620250.json`;
- evidence SHA-256:
  `2151bcdaa470288b333e1390b73b42c0fe98f7ab27a98f74305450f32a622706`;
- journal: `r4/us055-rehearsal-ce5a67620250.journal.jsonl`;
- journal SHA-256:
  `eb3393ed189a256cf1630e8fd1fe098ad4d58391a04d5bcf7340a4eac93ac0e5`;
- release HEAD: `ef729d768e6d6f01049374f04f20491fb3ea0b76`; and
- terminal state: `catalog-lifecycle-complete`.

Independent exact-integration reviews:

- `r4/final-integration-lifecycle-review-report.json`, SHA-256
  `6231d4067da097631014c44b773cf0c9711375206c0d87a9c34f11e4c64779ec`;
- `r4/final-integration-home-review-report.json`, SHA-256
  `ae491c10984908b0023246a891e6dd4c79d26a8328e8e8c0ac674f90e8cf4c5e`;
- verdict: local technical `ACCEPT`.

The lifecycle is plan → apply → verify-after → exact two-spec applied-state
Playwright → rollback → verify-before. The artifact binds the exact
22/116/331/38/5 catalog, nested applied frozen-source checksum, four-role
five-locale Home proof, baseline/final Home checksum equality, backup/restore,
spec/report hashes and cleanup. It passes 18/18 checks, 110/110 verification on
both sides, Home 40 cases, and confirms the Docker container and selective
seed media are absent. A catalog contract without terminal execution remains
pending and is not lifecycle proof.
