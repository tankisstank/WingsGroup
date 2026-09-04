# US-060 Design

## Domain Model

A release gate has a stable key, scope, owner, state, evidence references,
blocking behavior, and verification timestamp. States are `pending`,
`approved`, `rejected`, or `not-applicable`.

## Application Flow

Release review reads all mandatory gates, verifies evidence, and returns a
fail-closed result when any mandatory gate is not approved.

## Interface Contract

The contract is represented in versioned product/story docs first. Any later
CLI or application implementation must emit a machine-readable pass/fail result
without exposing secrets or private legal material.

## Data Model

No production schema change is authorized by this story. Downstream schema
must reference approved state enums and retain evidence pointers rather than
copying unstructured claims.

## UI / Platform Impact

Pending legal proof, channels, locales, and deep links render safe fallback
states. They do not disappear into implicit defaults.

## Observability

Release checks report gate key, result, non-sensitive evidence reference, and
timestamp. Private content and credentials are never logged.

## Alternatives Considered

1. Keep blockers only in comments. Rejected because comments are not a durable release contract.
2. Block all UI work. Rejected because safe pending states can be developed independently.
