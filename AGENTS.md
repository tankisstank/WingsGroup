# Agent Instructions

## Project-specific Instructions

This repository is the `WingsTravel` workspace.

Before changing code or strategy docs, read:

- `README.md`
- `source/strategy/19 Kiến trúc đề xuất nội bộ WingsTravel Payload.md`
- `source/strategy/20 Kiến trúc đề xuất gửi khách hàng WingsTravel.md`
- `source/strategy/18 Áp dụng Payload vào dự án WingsTravel.md`

Project rules:

- `source/` is the source of truth for business and strategy documents.
- `publish/` is output, not the primary editing location.
- The app implementation lives in `app/`.
- The current architecture is `Payload-first`, multisite-ready, with:
  - `SQLite` only for local bootstrap
  - `PostgreSQL` for staging and production
  - `Redis` as cache / KV support for production scale
- For deploying to Oracle Cloud VPS (ARM64 / aarch64 from Windows x64):
  - Always follow `docs/runbooks/oracle-vps-arm64-deployment.md`.
  - Use `deploy/oracle/package-release.ps1` to package clean releases (exclude `public/media` to avoid disk full).
  - Use `deploy/oracle/generate-symlinks.js` to ensure Linux ARM64 native binaries (`sharp`, `libvips`, `@libsql`) are provisioned.

For Windows in this repo:

- Prefer `scripts/harness.ps1` from PowerShell.
- `scripts/harness.cmd` is available as a simple wrapper.
- `scripts/harness` remains for shell-compatible environments.

## Browser Automation

Use `agent-browser` as the preferred browser automation tool in this repo. Run
`agent-browser --help` for all commands.

Default to `agent-browser` when the user asks to test, inspect, open, click,
fill, screenshot, review, QA, dogfood, or automate a browser page. This applies
even when the user casually says "Playwright" but the task is interactive
browser testing or visual/UI verification.

Use repo Playwright commands only when the task is specifically to run or update
the committed automated E2E suite under `app/tests/e2e` or `app/playwright.config.ts`.

Core workflow:

1. `agent-browser open <url>` - Navigate to page
2. `agent-browser snapshot -i` - Get interactive elements with refs (`@e1`,
   `@e2`)
3. `agent-browser click @e1` / `agent-browser fill @e2 "text"` - Interact
   using refs
4. Re-snapshot after page changes

Harness is an operational layer for agents. It does not replace the existing
strategy materials in `source/strategy/`.

<!-- HARNESS:BEGIN -->
## Harness

This repo uses Harness. Before work, read:

- `README.md`
- `docs/HARNESS.md`
- `docs/FEATURE_INTAKE.md`
- `docs/ARCHITECTURE.md`
- `scripts/harness query matrix`

Use the Rust Harness CLI as the main operational tool. Run it through the
stable repo-local entrypoint `scripts/harness`, which uses the prebuilt Rust
binary at `scripts/bin/harness-cli` in installed projects.
<!-- HARNESS:END -->

## Plane tracking

Plane is the customer-facing progress and documentation layer for this project.
Repo docs and Harness remain the source of truth, but Plane must be kept in sync
when agent work changes anything stakeholders track.

Use the local Codex skill `wingstravel-plane-sync` for Plane-related updates.

After changing any of the following, sync Plane before final response:

- Harness story status, proof, evidence, or dates.
- Story files under `docs/stories/`.
- Epic mappings, project mappings, or `docs/plane/manifest.json`.
- Customer-facing Plane pages under `docs/plane/pages/`.
- Roadmap, milestone, go-live review, or delivery status intended for customer
  tracking.

Run from `app/`:

```powershell
pnpm run plane:preview
pnpm run plane:sync:workitems
```

Also run `pnpm run plane:import:structure` when projects, epics, modules,
states, custom properties, or work item types changed. Run
`pnpm run plane:import:pages` when Plane documentation pages changed.

Before finishing, verify that Plane has the correct project, Epic, US work item,
sub-work item names, status, `start_date`, and `target_date`. At minimum,
confirm `missingCount` is `0`, no child task is named like `Tiêu chí chấp nhận
<number>`, and the relevant US items are children of the correct Epic.
