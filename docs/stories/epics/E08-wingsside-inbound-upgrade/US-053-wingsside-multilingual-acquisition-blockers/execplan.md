# US-053 Exec Plan

## Goal

Close the reproducible P0 public-acquisition defects across all five configured
WingSide public locales and produce production evidence strong enough to reopen
the site-level release decision.

## Scope

In scope:

- Tenant-scoped robots, sitemap, canonical and reciprocal hreflang output.
- Accessible Plan and Contact form labels, errors, focus and submit controls.
- Same-locale internal route inventory and zero-4xx crawl.
- Editorial marker detection and approved copy for VI/IT/ES/PT.
- Regression proof for US-050 and US-052.

Out of scope:

- P1/P2 navigation, copy strategy and visual-polish changes in CR-WS-002.
- New locale schema beyond EN/VI/IT/ES/PT.
- Real lead submission or business approval of prices/legal claims.

## Risk Classification

Risk flags:

- Existing production behavior.
- Public SEO and route contracts.
- Cross-tenant isolation.
- Accessibility and conversion behavior.
- Multi-locale content and multi-domain regression exposure.
- Current audit conflicts with earlier release evidence.

Hard gates:

- No deployment while sitemap/robots output contains a foreign hostname.
- No production content apply without an approved, reviewable locale plan.
- No weakening the five-locale or accessibility validation matrix.

## Work Phases

1. Reproduce BUG-WS-002..005 against the current immutable production release.
2. Record the exact route, field and hostname inventory for all five locales.
3. Patch tenant/SEO and route-generation defects with unit/integration coverage.
4. Patch form semantics and keyboard/error behavior with component/E2E proof.
5. Produce and review an idempotent editorial remediation plan for VI/IT/ES/PT.
6. Validate locally, on canary and on production without sending a real lead.
7. Update bug files, story proof, Harness and Plane only from observed evidence.

## Stop Conditions

Pause for human confirmation if:

- A proposed fix changes the public locale registry or canonical domain model.
- Editorial copy, price, legal or credential claims lack an owner decision.
- A production apply is not guarded by backup, dry-run and rollback evidence.
- Validation would require submitting a real customer lead.
