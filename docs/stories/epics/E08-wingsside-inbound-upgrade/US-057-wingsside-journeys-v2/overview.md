# US-057: Upgrade WingSide Journeys v2

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
