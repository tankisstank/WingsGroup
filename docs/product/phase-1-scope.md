# WingsGroup Phase 1 Scope

## Purpose

This document turns the current strategy set into a durable phase-1 product
contract for implementation and acceptance planning.

## In Scope

Phase 1 for `WingsGroup` is a `Payload-first` multisite content platform that
must deliver:

- one public site ready for first launch
- the required child sites operating as fully usable and independent site
  surfaces within the shared platform
- one shared CMS codebase that can serve multiple sites
- localized content management for the first approved locales
- site-specific branding, SEO, navigation, and shared settings
- an approved theme system for the public experience and child-site brand
  variation
- reusable pages and landing pages built from structured content blocks
- site-scoped admin access for `super-admin`, `site-manager`, and `editor`
- AI-agent-friendly SEO research and implementation on launch-critical routes

## Sites Covered By The Architecture

The shared platform is expected to support at least these site identities:

- `WingsGroup`
- `WingsGo`
- `WingSide`
- `WingsPlus`
- `WingsCare`
- `WingsPass`

`WingsGroup` is the umbrella site. The other listed sites are phase-1 child
sites being developed in parallel on the same platform.

## Required Capabilities

### Multisite

- A central `sites` model defines site identity, domains, supported locales,
  and active status.
- Shared code must render public pages based on the resolved site context.
- Each site must have isolated content scope and configurable shared settings.

### Localization

- The system starts with `vi` and `en`.
- Additional locales can be added without changing the core architecture.
- Editors manage localized content from the CMS instead of hardcoded frontend
  strings.

### Content And Experience

- The first release includes core website pages plus reusable landing page
  structure.
- Shared content sections are block-based and reusable across pages.
- Brand and SEO defaults are configurable per site.

### Governance

- `super-admin` can manage the full platform.
- `site-manager` is restricted to assigned sites.
- `editor` is restricted to assigned sites and editorial actions.

## Out Of Scope By Default

These are not part of the default phase-1 contract unless a later intake adds
them explicitly:

- CRM workflow
- booking and payment flows
- internal operator workflow
- advanced analytics dashboards
- automation orchestration
- AI or RAG features

## Delivery Shape

Phase 1 is considered complete only when product docs, story packets, and proof
records can demonstrate:

- the first site can launch
- the approved child sites can operate independently with their own content and
  settings
- the multisite model remains clean
- localized content and site scoping work on the main editorial flow
- the admin experience supports routine content updates without code changes
- production-ready editorial features exist for post management, publishing,
  and content administration
- role-specific operating guidance exists for the main user roles
- a customer handover documentation package exists for post-phase-1 operation
