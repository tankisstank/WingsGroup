# US-057: Upgrade WingSide Journeys v2

## Status

in progress / Đang thực hiện — the production commerce delivery remains live,
but the stakeholder reopened US057 on 2026-07-31 because the public Journeys
page does not meet the locked hi-fi v2 visual fidelity. This remediation is
app-only: data, classification and departure contracts remain accepted.

## Lane

high-risk

## Contract

Upgrade the existing `/journeys` discovery route without replacing its tenant,
SEO, locale, or context contracts. It adds strict `q` and `type` URL filters,
with absent type mapping to private, and distinguishes small-group, private and
hybrid card posture.

The production activation package classifies the exact 22-tour BestPrice
batch, captures exact visible departure rows, and provides signed
plan/canary/apply/verify/receipt-recovery/rollback phases. It does not seed or
backfill production implicitly: deployment, backup and each production
mutation remain explicit release gates.

Production now runs the governed 22-tour classification and departure
postimage from data release `e0021aaebd8cfb2208b52a61c2d7b697c55cb92f`.
The public app runs the context-recovery hotfix
`1dc91b0de859626e2ba233065117b2be61aa670d`. Expired departures remove only
price/date/availability claims and fall back to Contact; they do not remove the
tour from discovery.

## Visual remediation pass

The remediation restores the locked poster hero, filter workspace, card
hierarchy, editorial decision band, image-led destination rail, decision FAQ
and bottom conversion panel. It preserves the existing route, URL state,
Payload query and truthful commerce fallback, and does not add sample tours,
shortlist storage or a booking capability.

The implementation passed two independent visual-spec review cycles, an
isolated app-only real-tenant canary, and an approved app-only public promotion
at desktop and mobile. Public traffic now runs the immutable app SHA
`ee69e4a9e2c52ba9440805f5ecf7f44d09470403`; data, classification and
departure contracts remain unchanged. US-057 awaits stakeholder visual
confirmation before closure.
