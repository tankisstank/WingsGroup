# US-025 Departure Variant Model

## Status

implemented

## Lane

high-risk

## Product Contract

The platform must support bounded tour variants so the same base tour can be
sold under different departure origins, airlines, or presentation layers
without cloning the whole product page.

## Acceptance Criteria

- `departure-variants` exists as a structured collection
- variants can override a bounded subset of product content
- departures can link to variants
- public tour resolution merges base + variant + departure safely

## Evidence

- `departure-variants` collection implemented
- seed helper can create variants and link departures
- build and type checks passed
