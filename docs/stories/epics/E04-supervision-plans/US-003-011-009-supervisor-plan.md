# Supervisor Plan: US-003, US-011, US-009

## Purpose

This plan defines how a supervisor should delegate and audit implementation for:

- `US-003` Site registry and settings
- `US-011` Multisite theme foundation
- `US-009` Structured data and AI Agent SEO research

The goal is to let sub-agents work in parallel where safe, while forcing their
outputs through adversarial review before anything is accepted as complete.

## Current State

Harness status at planning time:

| Story | Status | Evidence |
| --- | --- | --- |
| `US-003` | planned | none |
| `US-011` | planned | none |
| `US-009` | planned | none |

Relevant docs:

- `docs/product/phase-1-scope.md`
- `docs/product/multisite-platform.md`
- `docs/product/ai-agent-seo-and-theme.md`
- `docs/product/ai-agent-seo-implementation-checklist.md`
- `docs/product/acceptance-and-kpis.md`

## Dependency Model

| Workstream | Can Start Now | Depends On | Notes |
| --- | --- | --- | --- |
| `US-003` site registry/settings | yes | none | Primary platform dependency. |
| `US-011` theme foundation | yes | existing site settings shape | Must avoid blocking on final `US-003`, but must reconcile with it before acceptance. |
| `US-009` research portion | yes | current docs and app shape | Implementation portion should wait for `US-003` site/domain rules and coordinate with `US-008`. |

Supervisor rule:

- Run `US-003`, `US-011`, and `US-009 research` in parallel.
- Do not accept `US-011` as complete until its theme override model works with
  the final `US-003` site settings shape.
- Do not accept `US-009` implementation as complete until canonical/domain/site
  assumptions are aligned with `US-003` and the future `US-008`.

## Sub-Agent Assignments

### Agent A: US-003 Site Registry And Settings

Mission:

Implement or audit the durable site model and site settings path so public
rendering and admin behavior can resolve the correct site context without
hardcoded brand coupling.

Primary files to inspect:

- `app/src/collections/Sites.ts`
- `app/src/collections/SiteSettings.ts`
- `app/src/utilities/siteContext.ts`
- `app/src/utilities/sitePaths.ts`
- `app/src/utilities/getSiteSettings.ts`
- `app/src/app/(frontend)/layout.tsx`
- `app/next.config.ts`
- `app/scripts/seed-subsites.ts`

Expected deliverables:

- Findings on current implementation versus `US-003` acceptance criteria.
- Patch if gaps are found and are safe to fix within the story.
- Updated or proposed validation evidence.
- Notes on the exact site settings fields other workstreams may depend on.

Acceptance gates:

- `sites` can represent identity, domain, locale support, and active status.
- `site-settings` can own brand, SEO, navigation, and shared contact data.
- Public rendering can resolve site context.
- Admin or CMS reads remain site-aware.
- Local path-prefix test paths are documented or verified.

Required commands:

```powershell
cd app
pnpm lint
pnpm run test:int
```

If commands fail for environmental reasons, the agent must provide:

- exact command
- exact failure
- whether it is a code issue, dependency issue, or environment issue
- smallest next action

Report format:

```markdown
## US-003 Report

### Changed Files

### What Was Verified

### Evidence

### Open Risks

### Needed Coordination
```

### Agent B: US-011 Multisite Theme Foundation

Mission:

Define and implement the shared theme foundation and site-specific override
model without breaking semantic HTML, reusable sections, or future multisite
composition.

Primary files to inspect:

- `app/src/app/(frontend)/globals.css`
- `app/src/cssVariables.js`
- `app/tailwind.config.mjs`
- `app/src/collections/SiteSettings.ts`
- `app/src/utilities/getSiteSettings.ts`
- `app/src/app/(frontend)/layout.tsx`
- `app/src/Header/Component.tsx`
- `app/src/Footer/Component.tsx`
- `app/src/blocks/RenderBlocks.tsx`
- representative block components under `app/src/blocks/`

Expected deliverables:

- Theme token proposal or implementation.
- Site-specific brand override path.
- Visual smoke evidence across at least two site identities.
- Handover notes explaining theme extension rules.

Acceptance gates:

- Shared colors, typography direction, spacing rhythm, CTA style, header, footer,
  and section styles are coherent.
- Site override does not create per-site one-off layouts.
- Theme work preserves heading hierarchy and crawlable links.
- Public pages still render correctly on mobile and desktop.

Required commands:

```powershell
cd app
pnpm lint
pnpm run test:int
```

Recommended visual proof:

- Screenshot of `http://localhost:3000/wingstravel`
- Screenshot of `http://localhost:3000/wingsgo`
- One mobile viewport screenshot for a representative site

Report format:

```markdown
## US-011 Report

### Theme Model

### Changed Files

### Visual Evidence

### Semantic/SEO Preservation

### Open Risks
```

### Agent C: US-009 Structured Data And AI Agent SEO Research

Mission:

Research and define the structured-data baseline, then implement only the
bounded JSON-LD path that is supported by current visible content and stable
site data.

Primary files to inspect:

- `docs/product/ai-agent-seo-and-theme.md`
- `docs/product/ai-agent-seo-implementation-checklist.md`
- `app/src/utilities/generateMeta.ts`
- `app/src/utilities/getURL.ts`
- `app/src/utilities/getSiteSettings.ts`
- `app/src/app/(frontend)/layout.tsx`
- `app/src/app/(frontend)/page.tsx`
- `app/src/app/(frontend)/[slug]/page.tsx`
- `app/src/app/(frontend)/posts/[slug]/page.tsx`
- `app/src/collections/Pages/index.ts`
- `app/src/collections/Posts/index.ts`

Expected deliverables:

- Research note with adopted and rejected structured-data types.
- Proposed route-type coverage for phase 1.
- Reusable JSON-LD implementation plan or patch.
- Validation notes showing schema matches visible content.

Acceptance gates:

- Adopted schema types are explicitly listed.
- Rejected or deferred schema types are explicitly listed.
- JSON-LD is generated through reusable utilities, not scattered page snippets.
- `Organization`, `WebSite`, `WebPage`, `BreadcrumbList`, and `Article` are
  considered against current content.
- `FAQPage` is used only if visible FAQ content exists.
- Implementation choices are written back to durable docs.

Required commands:

```powershell
cd app
pnpm lint
pnpm run test:int
```

Manual validation when possible:

- View source for a representative home page.
- View source for a representative standard page.
- View source for a representative post.
- Confirm JSON-LD is valid JSON and matches visible content.

Report format:

```markdown
## US-009 Report

### Research Summary

### Adopted Structured Data

### Deferred Structured Data

### Changed Files

### Validation Evidence

### Open Risks
```

## Supervisor Operating Sequence

### Round 1: Dispatch

Send the three agent prompts at the same time:

- Agent A gets `US-003`
- Agent B gets `US-011`
- Agent C gets `US-009 research + bounded implementation proposal`

Constraints to include in every prompt:

- Read `AGENTS.md`, `README.md`, Harness docs, and relevant product docs first.
- Do not update unrelated strategy or publish artifacts unless the story needs
  it.
- Do not mark the story implemented without evidence.
- Respect Payload-first, multisite-ready, SQLite-local, PostgreSQL-staging/prod,
  Redis-production-support direction.

### Round 2: First Audit

After each report arrives, the supervisor runs:

```powershell
scripts\harness.ps1 query matrix
```

Then inspect:

- changed files
- validation output
- missing evidence
- cross-story coupling
- whether docs were updated when product truth changed

### Round 3: Adversarial Review

For each agent result, ask these questions before acceptance:

- Did this work prove the story acceptance criteria, or only make plausible
  progress?
- Does the patch preserve multisite behavior for `WingsTravel`, `WingsGo`,
  `WingsSide`, `WingsPlus`, `WingsCare`, and `WingsPass`?
- Are site-specific values hardcoded where they should come from `sites` or
  `site-settings`?
- Did the agent confuse local path-prefix testing with production domain logic?
- Does the work weaken localization or role/site scoping?
- Are screenshots or command outputs strong enough to support the claim?
- Did the agent update durable docs when it changed product or architecture
  truth?

### Round 4: Integration Pass

Only after individual review passes:

- Re-run quick validation commands.
- Reconcile `US-011` theme settings with `US-003` site settings.
- Reconcile `US-009` schema assumptions with `US-003` site/domain rules.
- Capture evidence in the relevant story files.
- Update Harness story status from `planned` to `implemented` only when the
  evidence is strong enough.

## Cross-Story Risk Register

| Risk | Applies To | Supervisor Check |
| --- | --- | --- |
| Site settings shape changes after theme work | `US-003`, `US-011` | Confirm theme reads final settings shape. |
| Schema assumes wrong canonical/domain model | `US-003`, `US-009` | Confirm schema URLs use final site/domain resolution. |
| Theme hides semantic links/headings | `US-011`, `US-009` | Inspect rendered HTML and heading/link structure. |
| Local test paths leak into production metadata | `US-003`, `US-009` | Review canonical and structured-data URL builders. |
| Docs drift from implementation | all | Compare product docs, story evidence, and changed code. |

## Evidence Matrix

| Story | Minimum Evidence Before Acceptance |
| --- | --- |
| `US-003` | Code diff, lint/test output or explained blocker, site context proof, site settings proof. |
| `US-011` | Code diff, lint/test output or explained blocker, screenshots for two site identities, theme handover note. |
| `US-009` | Research note, adopted/deferred schema list, code diff or implementation plan, JSON-LD samples, validation notes. |

## Sub-Agent Prompt Templates

### Prompt For Agent A

```text
You are implementing US-003 for WingsTravel. Read AGENTS.md, README.md,
docs/HARNESS.md, docs/FEATURE_INTAKE.md, docs/ARCHITECTURE.md,
docs/product/phase-1-scope.md, docs/product/multisite-platform.md, and
docs/stories/epics/E02-phase-1-multisite-platform/US-003-site-registry-and-settings.md.

Focus only on site registry and site settings. Inspect the app files listed in
the supervisor plan. Implement or report gaps needed for US-003 acceptance.
Run pnpm lint and pnpm run test:int from app if possible. Return the US-003
Report format exactly.
```

### Prompt For Agent B

```text
You are implementing US-011 for WingsTravel. Read AGENTS.md, README.md,
docs/product/phase-1-scope.md, docs/product/ai-agent-seo-and-theme.md,
docs/product/acceptance-and-kpis.md, and
docs/stories/epics/E03-ai-agent-seo-and-theme/US-011-multisite-theme-foundation.md.

Focus only on the multisite theme foundation. Do not redesign unrelated flows.
Inspect the app files listed in the supervisor plan. Produce theme changes,
visual proof, and handover notes. Run pnpm lint and pnpm run test:int from app
if possible. Return the US-011 Report format exactly.
```

### Prompt For Agent C

```text
You are implementing US-009 for WingsTravel. Read AGENTS.md, README.md,
docs/product/ai-agent-seo-and-theme.md,
docs/product/ai-agent-seo-implementation-checklist.md, and
docs/stories/epics/E03-ai-agent-seo-and-theme/US-009-structured-data-and-ai-agent-seo-research.md.

Focus on structured-data research and a bounded implementation path. Use only
schema types that match visible content. Inspect the app files listed in the
supervisor plan. Run pnpm lint and pnpm run test:int from app if possible.
Return the US-009 Report format exactly.
```

## Completion Rule

This supervisor plan is complete when:

- all three sub-agent prompts are ready to dispatch
- acceptance gates are explicit
- adversarial audit questions are explicit
- integration risks are listed
- evidence requirements are clear enough to update Harness story statuses later

## Execution Outcome

2026-05-27 supervisor pass:

- Dispatched and reviewed parallel implementation reports for `US-003`,
  `US-011`, and `US-009`.
- Accepted `US-003` after verifying durable `sites` / `site-settings`,
  active-site lookup, local path-prefix middleware, and site-aware links.
- Accepted `US-011` after verifying shared `--site-*` tokens, layout-level
  brand/accent overrides, and semantic header/footer/nav link preservation.
- Corrected `US-009` during adversarial review by removing premature
  `BreadcrumbList` route emission until US-010 provides visible breadcrumb UI.
- Parent validation: `cd app; pnpm run test:int` passed with 4 files and 12
  tests.
- Blocked validation: `cd app; pnpm lint` fails before linting on an existing
  ESLint 9 circular config issue.
- Blocked validation: full `tsc --noEmit` fails on existing baseline issues;
  filtered output for touched US-003/US-009/US-011 files returned no matches.
