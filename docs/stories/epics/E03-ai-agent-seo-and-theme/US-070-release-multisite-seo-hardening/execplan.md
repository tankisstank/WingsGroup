# Exec Plan

## Goal

Safely publish and verify multisite SEO hardening without changing production content or data unnecessarily.

## Scope

In scope:

- Source-only production release for all six public domains.
- Read-only migration-state verification and health checks.
- Production HTTP, metadata, schema, locale, and crawler validation.

Out of scope:

- Cloudflare dashboard changes.
- New CMS FAQ content where no FAQ block exists.

## Risk Classification

Risk flags:

- Existing behavior.
- External systems.
- Multi-domain.
- Weak proof for edge/CDN behavior.

Hard gates:

- Production deployment.

## Work Phases

1. Confirm active production release, rollback image, health, disk, and migration state.
2. Validate and commit only the scoped SEO source changes.
3. Archive, upload, build, and atomically switch the application release without recreating PostgreSQL or Redis.
4. Verify health and public behavior across all domains.
5. Record evidence in Harness and Plane.

## Stop Conditions

Pause for human confirmation if:

- A production migration is required but lacks a verified rollback/restore path.
- The release archive would include unscoped user changes.
- Any health or public-domain check fails after switching the app.
