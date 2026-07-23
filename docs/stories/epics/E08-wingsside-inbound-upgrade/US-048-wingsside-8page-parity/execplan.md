# Exec Plan

## Goal

Close the P0 and P1 findings in the independent WingsSide eight-page audit with verified DOM, responsive, visual, build, and go-live evidence.

## Scope

In scope:

- Form ownership and duplicate DOM remediation.
- Hero media, hero rhythm, CTA, typography, and header parity.
- CMS-backed Packages and Contact content completion.
- Stable card/control markers and Guide inventory coverage.
- Eight-route desktop/mobile visual proof and six-breakpoint overflow checks.

Out of scope:

- Production deployment or VPS changes.
- Tour detail remediation beyond regression checks.
- Lead delivery testing against a real production sink.

## Risk Classification

Risk flags:

- Data model and CMS content.
- Cross-platform responsive behavior.
- Existing behavior across eight public routes.
- Weak visual and DOM proof identified by the audit.

Hard gates:

- No data deletion or architecture change.
- No production form submission.

## Work Phases

1. Verify runtime worktree and baseline against audit/prototype.
2. Fix form composition and hero/layout P0 findings.
3. Complete CMS content and marker contracts.
4. Add targeted automated assertions.
5. Run static, build, DOM, responsive, and visual verification.
6. Update audit, Harness, and Plane tracking.

## Stop Conditions

Pause for human confirmation if:

- Payload content would require destructive migration.
- The prototype conflicts with current accepted business content outside the named parity points.
- Validation would require sending a real lead.
- A fix would affect another site or route family.
