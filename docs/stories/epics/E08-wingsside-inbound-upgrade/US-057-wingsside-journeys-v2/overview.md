# US-057: Upgrade WingSide Journeys v2

## Status

in progress / Chờ xác nhận — production data activation and app promotion
completed on 2026-07-31. The story remains open for stakeholder confirmation;
it is not auto-promoted to accepted or complete.

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
