# Pilot: Verify the Multica Migration Contract

## Goal

Turn the existing read-only Multica preview into a repeatable repository check
so future migration changes cannot silently alter the proposed record model.

## Scope

- Add one small Node verification script under `app/scripts/`.
- The script must invoke `multica-import.mjs preview --json`, parse its JSON,
  and fail non-zero with an actionable message when the contract is invalid.
- Verify at least: `mode=dry-run`, `writes_performed=false`, 7 projects, 8
  Epics, 57 stories, 189 acceptance criteria, 5 declared-missing documents,
  and 7 Harness-only sources.
- Add an appropriate `pnpm` command for the verification.
- Run the new command and the existing preview commands.

## Constraints

- Do not import, assign, alter, or delete Multica records other than this issue.
- Do not run Plane synchronization commands, deployment commands, or access
  secrets.
- Preserve unrelated local changes.
- Keep `multica-import.mjs` read-only: it must not gain credentials, a network
  client, or a write action.

## Acceptance Criteria

- The verifier succeeds against the current repository state.
- A malformed/missing contract value yields a clear non-zero failure path.
- The new command is documented by its name in `app/package.json`.
- The agent reports files changed and exact verification output, then leaves
  this issue in `in_review` for human acceptance.
