# WingsTravel Editorial Operations

## Purpose

This document captures the minimum editorial and administrative behaviors that
phase 1 must support.

## Core Editorial Flows

### Page Management By Site

An editor or site manager must be able to:

- sign in to the CMS
- work only within assigned sites
- create or update site pages
- preview changes before publish when enabled
- publish approved content

### Landing Page Management

The team must be able to:

- create a landing page from a reusable structure
- set site and locale context
- adapt hero, value proposition, CTA, and supporting sections
- publish without frontend code edits for standard campaign cases

### Localization Workflow

The team must be able to:

- switch locale while editing content
- maintain translated content per page or page section
- avoid cross-locale leakage on the main public routes

### Access Governance

The platform must support:

- `super-admin` platform-wide control
- `site-manager` access limited to assigned sites
- `editor` access limited to assigned sites and editorial scope

Sensitive fields such as site assignments, role, domain, and active status
should stay restricted to higher-privilege users.

## Content Surfaces In Scope

The first release should cover these editorial surfaces:

- home and core marketing pages
- child-site pages that must operate as independent public experiences
- service or tour content
- landing pages
- posts or editorial content where already present
- media assets
- shared site settings such as navigation, footer, and contact info

Post management, publishing, content administration, and media handling on
these surfaces must be production-ready for normal business use, not only demo
ready.

## Operational Requirement

Routine updates to the following must not require code edits:

- page copy
- shared site content
- localized text
- basic media replacement
- SEO defaults per site

## Documentation Requirement

Phase 1 must include operating guidance for the main user roles so the platform
can be handed over cleanly.

Minimum guidance set:

- `super-admin`: platform setup, site assignment, governance controls
- `site-manager`: editorial workflow, publish responsibilities, site-specific
  management tasks
- `editor`: create, edit, preview, and submit or publish content in assigned
  scope

## Customer Handover Package

Phase 1 must end with a customer-ready handover documentation set, not only
internal notes.

Minimum package:

- project overview and delivered scope
- site map or page inventory for the launched sites
- role-based operating guides
- content update and publishing guide
- media and asset management guide
- access and account handover notes
- deployment environment notes
- server or VPS configuration notes
- domain and DNS configuration notes
- email server or transactional email configuration notes when present
- known scope boundary and next-phase recommendations

## Content Completion Requirement

Before a child site is considered ready, its required pages must be filled with
approved copy and image assets rather than placeholder content.
