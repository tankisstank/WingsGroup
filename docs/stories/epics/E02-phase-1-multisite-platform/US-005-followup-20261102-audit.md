# US-005 follow-up AC4–AC5 — 2026-11-02

Owner c0508g, baseline8efdbbf, candidate `followups-20261102/candidate`.

## Review decisions

The heading updater targets only published WingsGo `/campaign` in VI and accepts exactly one plain text H1 matching the approved old/new text. Unknown/multiple/split H1 aborts. It recomputes the permitted transformation from the snapshot, checks live site/path/content/updatedAt, locks PostgreSQL pages and refuses pending editor drafts in all supported locales. The recovery journal is exclusively created and synced before writing; rollback is targeted and refuses later edits. EN H1, H2, layout, media and links remain data-driven.

Root review rejected the first `includes` transformation, missing live-path guard and optional applied sidecar write. AGY corrected these before independent PostgreSQL verification. Root then stopped split-formatting writes explicitly, preserving editor node formatting through a fail-closed boundary. Seven unit cases cover exact replacement, noop, unknown/prefix/suffix, missing/multiple and split H1. PostgreSQL rehearsal covers tampered snapshot, wrong route, stale version, EN draft, noop, immutable journal, recovery rollback, rollback draft and subsequent hero conflict.

`showMediaCaption` defaults true in MediumImpactHero and is forwarded by RenderHero. The caller disables it only for WingsGo `/campaign`, including its EN route; shared media caption data remains intact. Three component tests use the actual media component with a mocked Next image boundary, preserving video/image/absent-media behavior.

## Evidence

- `followups-20261102/us005-independent-pg-proof.json`, `postgres-final.log`.
- `followups-20261102/unit-final.log`, `safety-unit-final.log`, `component-regression.log`.
- `followups-20261102/campaign-browser-desktop.json`, `campaign-browser-mobile.json`, `campaign-browser-en.json`.
- `followups-20261102/campaign-caption-control.json`, `campaign-cta-click.json`, campaign screenshots.
- `followups-20261102/final-codex-review.md`: independent review found no P1/P2/P3;22unit and6component passed. Reviewer deliberately did not mutate PostgreSQL; root ran it independently.

Browser video played with readyState4 and pausedfalse at desktop/mobile390; one exact H1, caption absent, no overflow, CTA navigated to the contact anchor. Caption-control used the same media and retained both caption title and description. EN H1 stayed unchanged.

## Build prerequisites and limits

Next build exposed existing invalid helper exports from page-wizard/site-review/tour-authoring route modules. Helpers were moved to utility modules with unchanged behavior, and their test imports updated. This is the sole application scope addition needed for the required build gate; no HTTP API/schema/dependency changes.

Candidate is in review / Partial, not deployed. No production CMS changes, real calls/leads, Safari/iOS, physical devices or authenticated production draft inventory were performed. Content apply/verify/rollback preparation is in `followups-20261102/CONTENT-RUNBOOK.md`.
