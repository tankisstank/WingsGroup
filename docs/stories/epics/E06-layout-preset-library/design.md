# Design

## Model

The system uses three layers:

- Block family: reusable Payload block schema such as feature grid, stats, FAQ,
  pricing, testimonials, and comparison.
- Presentation variant: a controlled enum that changes layout only.
- Page preset: code-owned composition that creates a draft page snapshot.

## Data Flow

```text
Page Wizard preset selection
  -> layout preset registry
  -> Payload draft page
  -> Pages.hero + Pages.layout snapshot
  -> frontend RenderBlocks registry
  -> theme-token based public markup
```

## Rules

- Presets live in code, not CMS records.
- Presentation values are registered enums, not arbitrary CSS.
- Renderer components never branch on site code, hostname, or pathname.
- Legacy records without presentation fields use component defaults.
- Auth, dashboard, onboarding, nav, footer, cookie, 404, and loading UI are not
  page content layout.

## Schema Impact

- `pages.layoutPresetKey` records the selected preset.
- Existing blocks gain optional `presentation` fields.
- `Stats`, `Testimonial`, and `Comparison` are new page blocks.
- PostgreSQL migration adds matching block tables and version tables.

