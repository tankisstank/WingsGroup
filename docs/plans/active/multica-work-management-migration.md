# Execution Plan: Migrate Work Management From Plane To Multica

Date: 2026-08-07

## Status

Active

## Outcome

Use Multica as the internal work-management and agent-execution control plane
for WingsTravel, while preserving repository documents as the source of truth.
Plane remains read-only until the migration acceptance gates are met.

## Context

- `AGENTS.md` currently requires Plane synchronization for stakeholder tracking.
- `docs/plane/manifest.json` maps 57 stories and 189 acceptance tasks into
  Plane projects, Epics, properties, milestones, and Pages.
- `app/scripts/plane-import.mjs` is the existing source-to-tracker adapter.
- `docs/WORKFLOW.md` makes the repository the default operational authority and
  treats the legacy Harness control plane as a compatibility surface.
- Multica workspace `WingsGroup` exists, but it has no projects, squads,
  workspace skills, or migration importer yet.

## Scope

In scope:

- Define the target Multica model, status mapping, prompts, skills, and
  migration safety gates.
- Build and validate a dry-run importer from the repository's authoritative
  story/manifest data.
- Pilot the model with new work before changing the repository's Plane rules.
- Preserve traceability for historic Plane delivery/proof states.

Out of scope:

- Deleting Plane data, credentials, scripts, or customer-facing pages.
- Automatically assigning historic work to agents.
- Releasing to production or changing application behavior.
- Replacing repository documentation with Multica content.

## Approach

1. Freeze the target contract in this plan and the associated decision record.
2. Add a dry-run-only Multica importer. It must emit the intended projects,
   Epic parents, US issues, acceptance sub-issues, metadata, and state changes
   without writing to Multica.
3. Review a deterministic migration report against the Plane preview: 57 US
   stories, 189 acceptance tasks, source paths, proof status, and dates.
4. Configure the Multica workspace only after the dry run is accepted:
   projects, reusable WingsTravel skill, repository-aware agents, and least-
   privilege runtime access. Imported historic records are unassigned.
5. Pilot one new bounded work item. Confirm agent context, review workflow,
   PR/proof linkage, and human completion behavior.
6. Perform the first controlled import. Keep Plane read-only for one complete
   delivery cycle, then decide whether to retire its mandatory sync rules.

## Risks And Recovery

- Assignment or `@` mention can trigger an agent. Import all historic issues
  unassigned, and do not use agent/squad mentions in imported descriptions.
- Multica collapses Plane's `Đã bàn giao` and `Hoàn tất` into `done`. Preserve
  the original delivery state and proof status as metadata.
- Multica's task runtime is not the security boundary. Use a dedicated daemon
  user or container with scoped credentials before enabling autonomous work.
- A failed importer must not write partial state. Start with dry run, then
  idempotent create/update keyed by immutable source identifiers and retain an
  export report for rollback.
- If the pilot fails, keep Plane as the active tracker and retain only the
  migration plan and dry-run evidence.

## Progress

- [x] Assess Plane use, rules, prompts, and remote limitation evidence.
- [x] Assess the current Multica workspace and official product capabilities.
- [x] Accept the target direction with the project owner.
- [x] Record the migration decision and safety boundary.
- [x] Define the import schema and dry-run report contract.
- [x] Implement and validate the dry-run importer against the Plane record counts.
- [x] Review migration output and classify all source-provenance exceptions.
- [x] Configure seven projects, one private delivery agent, and its reusable skill.
- [x] Accept the current runtime for a constrained read-only pilot; no production or secret access is authorized.
- [x] Chủ sở hữu đã chấp nhận hoãn hardening runtime cho môi trường Multica
  migration mới, rỗng; không yêu cầu lại phê duyệt này trong các giai đoạn
  migration.
- [x] Execute the constrained read-only pilot (`WIN-2`) on the current runtime.
- [x] Accept the read-only pilot in human review, then authorize a delivery pilot.
- [x] Run the delivery pilot (`WIN-3`) against the approved local checkout; it
  added and proved the read-only migration-contract verifier.
- [x] Accept `WIN-3` in human review before allowing historic import preparation.
- [x] Build and review the guarded importer; no historical write occurs in this step.
- [ ] Import history and run the dual-read validation cycle.
- [ ] Decide the Plane cutover and update repository instructions.

## Decisions

- 2026-08-07: Multica will become the internal work-management and
  agent-execution control plane; repository files remain authoritative.
- 2026-08-07: Plane is not deleted or mutated during planning and dry-run
  phases; customer-facing documentation remains in the repository until a
  replacement view is accepted.
- 2026-08-10: Chủ sở hữu chấp nhận dùng runtime đã xác thực hiện tại cho môi
  trường Multica migration mới và hoãn service identity riêng, secret manager,
  runtime cô lập, kho artifact append-only trong toàn bộ migration. Quyết định
  này không áp dụng cho application production, sửa Plane, lộ secret hoặc
  workspace đã có dữ liệu production.

## Validation

- Focused proof: dry-run output matches the current Plane preview counts and
  source mapping exactly.
- Integration proof: a disposable Multica target receives the expected parent,
  child, metadata, and status relationships without agent task creation.
- Pilot proof: a new issue completes agent execution, review, evidence, and
  human acceptance with an auditable Multica timeline.
- Repository-required checks: no Plane sync command runs until cutover is
  explicitly approved.

## Result

The read-only importer contract was implemented on 2026-08-07. Its preview
matches Plane's 7 projects, 8 Epics, 57 stories, and 189 acceptance tasks.
Twelve historic stories have no resolvable current markdown file: five retain a
declared-but-missing former path and seven use their durable Harness record as
the source reference.

The Multica `WingsGroup` workspace now has seven planned projects linked to
the WingsGroup repository, plus one private, idle delivery agent with one
repository-owned operating skill. No migration records were imported, assigned,
or run.

The constrained read-only pilot `WIN-2` completed successfully and was accepted
as `done`: it loaded the repository context, confirmed the no-write preview
counts, and made no repository, Plane, deployment, secret, or additional
Multica changes. The preview's human-readable provenance summary was corrected
after the pilot. Human acceptance of `WIN-2` remains required before a delivery
pilot or historic import is authorized.

The first delivery pilot `WIN-3` first correctly reported a worktree handoff
blocker: Multica checked out the remote branch while the migration implementation
was local and uncommitted. The project was then deliberately configured with
the approved local-directory resource, which serializes work on the current
checkout. The rerun added `app/scripts/verify-multica-contract.mjs` and the
`multica:verify` command; normal, malformed-contract, lint, and diff checks
passed. `WIN-3` was accepted as `done`. No historic
record was imported and Plane was not synchronized.

The guarded-history-import preparation `WIN-4` adds explicit `plan` and
`apply` contracts. `apply` fails closed unless the operator supplies the exact
confirmation token and independently acknowledges all four expected record
counts. Its successful path remains a non-writing operation report: no Multica
client or writer exists in this revision, so a later human-approved change is
required before any historic records can be created or updated. The report
lists all 261 intended project, Epic, story, and acceptance-criterion
operations while proving `assignee: null` and zero agent-trigger mention
syntax. Focused verification passed without any Plane or historic-Multica
mutation.

The remaining execution work is represented in Multica by parent `WIN-5` and
strictly ordered child stages `WIN-6` through `WIN-12`. Only `WIN-6` (human
acceptance of `WIN-4`) is active; all subsequent stages remain unassigned in
`backlog`. The sequence inserts a hardened-runtime step, disposable-target
validation, and a second human go/no-go gate before the production history
import. See `docs/multica/sequential-migration-issues.md` for the full scope.
