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

For Windows in this repo:

- Prefer `scripts/harness.ps1` from PowerShell.
- `scripts/harness.cmd` is available as a simple wrapper.
- `scripts/harness` remains for shell-compatible environments.

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
