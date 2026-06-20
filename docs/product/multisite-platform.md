# WingsGroup Multisite Platform

## Purpose

This document defines the durable platform rules behind the current
`Payload-first` architecture.

## Core Architecture

`WingsGroup` is built as:

- one `Next.js + Payload` codebase
- one CMS and frontend stack
- many site identities resolved by site context

The platform is content-first. Public rendering, metadata, and admin behavior
must all stay site-aware.

## Core Domain Objects

### Site

The `site` entity is the root scope for:

- domain mapping
- locale support
- content ownership
- branding defaults
- admin access scope

Expected site fields:

- `name`
- `code`
- `primaryDomain`
- `additionalDomains`
- `supportedLocales`
- `defaultLocale`
- `isActive`

### Site Settings

Each site owns dedicated settings rather than relying on one global singleton.

Expected settings include:

- site name and tagline
- brand colors and logo assets
- SEO defaults
- header and footer navigation
- support contact details

### Site-Scoped Content

These content areas are expected to remain scoped by `site`:

- pages
- landing pages or equivalent page variants
- posts
- services when introduced
- media when isolation is required
- categories when they appear on the public experience

## Public Rendering Rules

- Site resolution must happen before data access and link generation.
- Frontend metadata must use site-specific defaults.
- Header, footer, and other shared surfaces must read from site settings rather
  than hardcoded defaults.
- Local development may use path prefixes for site simulation.

## Editorial Rules

- Editors should not need code changes for routine content updates.
- Localized fields belong in Payload, not in frontend-only conditionals.
- New content structures must answer three questions before adoption:
  - Is this shared or site-scoped?
  - Is this localized?
  - Which roles may read, edit, publish, or delete it?

## Current Local And Production Topology

- Local development: `SQLite`
- Staging: `PostgreSQL`
- Production: `PostgreSQL + Redis`

`SQLite` is accepted only as a local bootstrap convenience. Production truth
must not depend on it.
