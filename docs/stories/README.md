# Stories

Stories are work packets. They turn product intent into bounded implementation
and validation work.

Current seeded epic:

- `E02-phase-1-multisite-platform`
  - `US-003` site registry and settings
  - `US-004` localization and site-aware routing
  - `US-005` page and landing page composer
  - `US-006` site-scoped editorial access
  - `US-007` first site launch readiness
- `E03-ai-agent-seo-and-theme`
  - `US-008` metadata, canonical, and sitemap baseline
  - `US-009` structured data and AI Agent SEO research
  - `US-010` breadcrumbs, internal linking, and SEO fields
  - `US-011` multisite theme foundation
- `E05-cms-theme-management`
  - `US-014` CMS-managed multisite theme configuration

## Normal Story

Use `docs/templates/story.md` for normal feature work.

Suggested path:

```text
docs/stories/epics/E01-domain-name/US-001-short-story-title.md
```

## High-Risk Story

Use `docs/templates/high-risk-story/` when the feature intake classifies work as
high-risk.

Suggested path:

```text
docs/stories/epics/E02-risky-domain/US-012-risky-story-title/
  execplan.md
  overview.md
  design.md
  validation.md
```

## Status Flow

```text
planned -> in_progress -> implemented
                  |
                  v
               changed
                  |
                  v
               retired
```
