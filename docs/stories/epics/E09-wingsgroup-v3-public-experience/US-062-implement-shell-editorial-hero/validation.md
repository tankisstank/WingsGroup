# US-062 Validation

## Proof Strategy

Prove visual fidelity, accessibility, responsive stability, tenant isolation,
and deterministic motion behavior.

## Test Plan

| Layer | Cases |
| --- | --- |
| Unit | Presentation selection, CTA fallback, and reduced-motion decisions. |
| Integration | WingsGroup site settings/page data resolve to the correct shell and hero. |
| E2E | Desktop/mobile nav, keyboard, Escape, carousel controls, pause, CTA, and locale state. |
| Platform | Build, 360–1920px overflow matrix, screenshots, WingsGo/WingSide no-leak smoke. |
| Performance | Hero image sizing, priority, and layout-shift budget. |
| Logs/Audit | CTA events carry site/locale/source without PII. |

## Fixtures

- WingsGroup Vietnamese home page with four hero slides.
- Reduced-motion browser context.
- WingsGo and WingSide regression pages.

## Commands

```text
pnpm lint
pnpm test:int
pnpm test:e2e
pnpm build
```

Use `agent-browser` for interactive desktop/mobile review.

## Acceptance Evidence

Implemented. Independent visual/security review accepted the tenant-scoped
shell and governed draft-preview correction. The production smoke on 2026-08-26
found the four-slide hero, accessible navigation, locale switch and
consultation chooser present without browser errors.
