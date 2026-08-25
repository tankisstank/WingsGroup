# US-067 — Align WingsGroup v3 corporate subpage fidelity

## Current Behavior

The published corporate-route implementation resolves the core route set and
the CMS-backed news archive, but it does not consistently present the approved
v3 editorial system. The shared header and breadcrumb have card/pill treatment,
several subpages use generic route blocks, and the services hero can render
without governed media. The approved prototypes in `publish/html/subpages/`
define the target visual hierarchy, not a separate product surface.

## Target Behavior

Every public WingsGroup corporate route uses one coherent editorial shell:

- flat text navigation, one amber consultation CTA, and secondary locale control;
- a text breadcrumb aligned to the title and the desktop editorial rails;
- a media-led, route-specific hero with a safe non-empty governed-media state;
- page archetypes for services, ecosystem, about, trust and news that preserve
  the five-brand ecosystem and fail-closed proof/deep-link rules;
- parallel Vietnamese and natural premium English content; and
- a CMS-rendered news archive and article routes, rather than a hard-coded post list.

## Affected Users

- Public visitors on desktop and mobile.
- WingsGroup editors managing Pages, Posts and governed Media in Payload.

## Affected Product Docs

- `docs/product/wingsgroup-v3-fidelity-contract.json`
- `docs/product/wingsgroup-v3-media-manifest.json`
- `docs/product/wingsgroup-v3-release-gates.json`
- `docs/product/editorial-operations.md`
- `source/strategy/18 Áp dụng Payload vào dự án WingsTravel.md`

## Non-Goals

- No production CMS import, deployment, traffic cutover or external deep-link enablement.
- No new legal proof, partner, certification or review claim.
- No replacement of Payload Posts with static article content.
