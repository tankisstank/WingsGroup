# E09 - Trải nghiệm public WingsGroup v3

## Status

in_progress — production live; post-deployment operational acceptance remains in progress.

## Classification

- Input type: new initiative.
- Lane: high-risk.
- Risk flags: authorization/site scope, data model, audit/security, external
  systems, public contracts, cross-platform, existing behavior, and
  multi-domain.
- Hard gates: privacy/security and external provider behavior.

## Source

- Multica parent issue: `WIN-20`.
- Handoff attachment ID: `019ff9e2-a63a-72e3-b769-205608264d46`.
- Handoff checksum:
  `eea0c9fdcdae0475b82adf35e5b3161e9a99667f4ba98c92d65e5cd53a1ba98b`.
- Product contract: `docs/product/wingsgroup-v3-public-experience.md`.

## Objective

Deliver the approved WingsGroup v3 public experience as a governed,
site-scoped upgrade in the existing Payload-first multisite application. The
initiative delivered the supplied prototype and 13 editorial assets to the
public WingsGroup site. Production is live; the remaining work is operational
acceptance and preservation of safe fallbacks for unconfigured channels, proof
and ecosystem destinations.

## Working Timeline

- Start date: 2026-08-13.
- Production confirmation: 2026-08-26.
- Post-deployment target: 2026-08-28 for backup/restore evidence, authorized
  lead-path verification, and initial monitoring review.

## Scope Checkpoint

- Vietnamese and English are required E09 delivery locales. English is built in
  parallel and remains hidden per route until route, chrome, metadata, and
  editorial review are complete.
- The 13 handoff images are licensed for project use. They remain unpublished
  until each record has provenance, bilingual alt text, WingsGroup scope, and
  responsive derivatives.
- The approved brand spelling is `WingSide`; its canonical path slug is
  `/wing-side`. `/wingsside` is redirect-only compatibility and must not appear
  in new public links, canonicals, tracking or CMS records.
- Privacy input is approved: consent `wingsgroup-contact-v1` is mandatory, lead
  retention is 24 months, the data-subject contact is
  `info@doicanhviet.com`, and consultation requests may be routed to the
  appropriate branch within the same organization.

## Workstreams

| Harness | Multica | Lane | Status | Workstream |
| --- | --- | --- | --- | --- |
| US-060 | WIN-28 | high-risk | implemented | Chốt governance và release gates |
| US-061 | WIN-29 | high-risk | in_progress | Xây nền dữ liệu Payload (đã live; thiếu evidence PostgreSQL rehearsal) |
| US-062 | WIN-30 | high-risk | implemented | Implement shell và editorial hero |
| US-063 | WIN-31 | high-risk | implemented | Implement homepage v3 |
| US-064 | WIN-32 | high-risk | in_progress | Hoàn thiện lead intake (đã live; chờ test lead có ủy quyền) |
| US-065 | WIN-33 | high-risk | implemented | Áp dụng v3 cho corporate và policy routes |
| US-066 | WIN-34 | high-risk | in_progress | QA SEO và post-deployment acceptance |

## Dependency Order

```text
US-060
  -> US-061
      -> US-062
          -> US-063
              -> US-064
                  -> US-065
                      -> US-066
```

Parallel work is allowed only after the upstream data and governance contracts
used by that workstream are accepted.

## Validation Shape

- Unit proof for parsers, state transitions, responsive helpers, and validation
  rules.
- Integration proof for Payload schema, site scope, locale, media, form, and
  SEO behavior.
- E2E proof for public routes, navigation, carousel, contact dialog, form
  states, tenant links, and accessibility.
- Platform proof for PostgreSQL migration, build, go-live review, responsive
  screenshots, canonical, sitemap, robots, CSP, and analytics events.

## Open Decisions

- The official **Wingsgroup - Vietwings Travel** Zalo OA is approved and live
  in direct-contact and consultation-dialog surfaces. WhatsApp and Messenger
  endpoint owners and SLAs remain pending-update; the built-in form is the
  non-blocking fallback.
- Proof sources and publication permissions remain pending; proof is not
  published.
- Ecosystem deep links remain disabled until destination checks pass; CTA
  fallback remains the WingsGroup intake form.
- Production backup/restore evidence, an authorized real-lead check, and the
  initial 24–48 hour monitoring review remain operational acceptance work.

## Exit Criteria

- US-060 through US-065 have implementation and public-smoke evidence.
- US-066 records post-deployment operational evidence and explicit acceptance.
- Harness, Multica, and Plane show the same parent, child titles, states, and
  dates.
- No production promotion occurs without explicit release approval.
