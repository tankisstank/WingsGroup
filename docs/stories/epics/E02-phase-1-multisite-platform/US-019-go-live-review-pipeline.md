# US-019 Go-live Review Pipeline

## Status

implemented

## Lane

normal

## Product Contract

Project managers and site managers can run a repeatable local pipeline that
reviews public WingsTravel pages before go-live and produces PM-facing launch
evidence.

The pipeline must review rendered pages across desktop and mobile, not only CMS
records, and must cover both technical readiness and content/copy readiness.

## Relevant Product Docs

- `docs/product/go-live-review-pipeline.md`
- `docs/product/phase-1-launch-readiness.md`
- `docs/product/page-composer-and-landing-pattern.md`

## Acceptance Criteria

- A repo-local command can run a go-live review against a running local or
  preview WingsTravel app.
- The command can review all sites or a focused site/path.
- The report includes desktop and mobile screenshots.
- The report checks route status, browser errors, horizontal overflow, title,
  meta description, canonical, H1, and image alt coverage.
- The report includes content/copy findings by page purpose, including
  conversion CTA and inquiry-path checks for campaign and travel-product pages.
- The output includes machine-readable JSON and a Markdown report.

## Design Notes

- Command: `cd app && pnpm run go-live:review`
- Focused command: `pnpm run go-live:review -- --site wingsgo --path /wingsgo/campaign`
- Script: `app/scripts/go-live-review.mjs`
- Artifacts: `output/go-live-review/<timestamp>/`
- Exit codes: `0` for pass/pass with notes, `1` for needs fix, `2` for blocked.
- This first version is rule-based and does not call external AI or paid review
  APIs.

## Validation

| Layer | Expected proof |
| --- | --- |
| Unit | Not added; script is a release/operational pipeline. |
| Integration | `pnpm exec eslint scripts/go-live-review.mjs` passes. |
| E2E | Run `pnpm run go-live:review` against a running app. |
| Platform | Generated JSON, Markdown, and screenshot artifacts under `output/go-live-review/`. |
| Release | Attach report output to launch evidence before customer go-live. |

## Harness Delta

The launch readiness product doc now names the go-live review pipeline as a
formal pre-launch evidence source.

## Evidence

Implementation added in this story:

- `app/scripts/go-live-review.mjs`
- `app/package.json` script `go-live:review`
- `docs/product/go-live-review-pipeline.md`
- `docs/product/phase-1-launch-readiness.md` checklist update

