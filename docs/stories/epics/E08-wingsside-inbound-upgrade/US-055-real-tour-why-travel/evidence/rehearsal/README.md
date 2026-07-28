# US-055 disposable PostgreSQL rehearsal

This rehearsal is local-only and fail-closed. It creates a uniquely named
`postgres:16` container and database containing `rehearsal`, publishes a random
PostgreSQL port on `127.0.0.1` only, uses no persistent Docker volume, and removes
the container and temporary backup on success or failure.

Run from `app/`:

```powershell
pnpm run rehearsal:wingsside:us055
```

The runner enforces `PAYLOAD_DB_PUSH=false`, applies committed Payload migrations,
seeds the exact sealed 22-tour source inventory, performs a PostgreSQL CRUD probe,
creates a custom-format backup, restores it into a second rehearsal-named database,
and compares the restored tour inventory checksum. Evidence never includes the
database password or a credential-bearing URL.

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
contract or hash mismatch fails the rehearsal. Supplying files does not bypass the
guarded runtime: `plan -> apply -> verify -> rollback -> verify` still requires the
leader-provided release SHA, protected catalog hash, signer/target proofs, operator,
backup checksum, restore evidence, and mutation confirmations required by the
production-semantic importer. No credential or production target belongs in this
file.

The baseline result is intentionally `baseline-ready-catalog-pending`; it must not
be interpreted as a release `SHIP` decision.
