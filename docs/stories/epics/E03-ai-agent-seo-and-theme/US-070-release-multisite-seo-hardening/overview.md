# Overview

## Current Behavior

The six public WingsTravel domains run from one Payload/Next.js application. The SEO hardening changes are implemented locally but are not yet represented by a clean production release.

## Target Behavior

Release the verified locale canonicalization, article social metadata, email-protection source handling, `llms.txt`, organization/FAQ structured data, hreflang/LCP, and safe BFCache header changes. Validate their production behavior on every public domain.

## Affected Users

- Public visitors and search crawlers.
- Content editors publishing articles and FAQ blocks.
- Platform operators responsible for releases.

## Affected Product Docs

- `docs/handover/08-deployment-server-domain-email.md`
- `source/strategy/18 Áp dụng Payload vào dự án WingsTravel.md`

## Non-Goals

- Cloudflare Email Address Obfuscation configuration.
- Shared CDN HTML caching; the release keeps HTML cache private until cookie-aware edge bypass rules are configured.
