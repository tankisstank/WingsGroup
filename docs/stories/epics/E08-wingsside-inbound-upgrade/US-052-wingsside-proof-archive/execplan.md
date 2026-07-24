# Exec Plan

## Goal

Replace the WingSide Credentials & Awards carousel with a CMS-backed Proof
Archive that makes original documents inspectable without layout shifts,
autoplay, or locale-copy record fallback.

## Scope

In scope:

- Credentials section renderer.
- Pure CMS-to-public ProofRecord mapper.
- Credentials block schema compatibility/admin choices.
- Locale UI labels only.
- Focused unit/component/integration/E2E tests.
- Lightweight evidence under this story packet.

Out of scope:

- Production services, production databases, migrations, deploys, Plane sync,
  merge, push, PR creation, and port 3000.
- Other WingSide sections.

## Risk Classification

Input type: Change request.

Lane: high-risk.

Risk flags:

- Data model/view-model.
- Public behavior.
- Cross-platform.
- Existing behavior.
- Weak proof.

Hard gates:

- Public behavior changes.
- Existing validation surface changes.

## Work Phases

1. Read required repo, harness, strategy, design, audit, and brand docs.
2. Audit actual render/data flow and legacy fallback surfaces.
3. Build pure mapper and replace carousel UI with Proof Archive.
4. Move styling into `hifi-sections.css` and remove obsolete selectors from
   `hifi-pages.css`.
5. Update schema compatibility, tests, and story packet.
6. Run typecheck/lint/focused tests and capture responsive evidence where the
   local environment allows it.

## Stop Conditions

Pause for human confirmation if:

- A destructive migration is required.
- Production data access is required.
- A non-credentials WingSide section must change.
- Required validation cannot run and no lower-risk substitute exists.

## Harness Notes

The worker did not modify the external release Harness database. During root
audit, intake `#104`, story `US-052`, and trace `#225` were recorded in the
durable release database after the implementation and validation evidence had
been reviewed.
