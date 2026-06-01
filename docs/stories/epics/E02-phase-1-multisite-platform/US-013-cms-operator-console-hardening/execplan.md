# Exec Plan

## Goal

Complete the CMS UI/UX audit backlog with an operator-focused console and safer role-aware admin surfaces.

## Scope

In scope:

- `/admin/console` custom view.
- Role-aware nav entry points and advanced links.
- Vietnamese collection labels/groups/help text.
- Lead empty guidance.
- Import/export guidance and sample links.
- Page edit guidance and clearer labels.
- Local production start script for standalone mode.

Out of scope:

- CRM pipeline.
- Custom import engine.
- New persistent data model.
- Production PostgreSQL/Redis migration.

## Risk Classification

Risk flags:

- Authorization.
- Public contracts.
- Cross-platform.
- Existing behavior.
- Weak proof.
- Multi-domain.

Hard gates:

- Authorization.

## Work Phases

1. Add story and harness tracking.
2. Implement console and nav.
3. Harden collection labels, lead, import/export, and page edit guidance.
4. Add start script and handover docs.
5. Update tests and run validation.
6. Record acceptance evidence.

## Stop Conditions

Pause for human confirmation if:

- Payload admin APIs require replacing the import/export plugin.
- Any database migration becomes necessary.
- Existing role access would need to be weakened.
