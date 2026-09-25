# Lead triage access evidence

## Candidate contract

The public form submission path remains the only create path. The candidate adds
bounded operational metadata through the specialized triage endpoint:

- `salesStatus`;
- nullable `assignedTo` resolved only from an existing user in the same site
  scope;
- bounded plain-text `salesNote` (maximum 2,000 characters);
- server-managed actor/time/from/to and optimistic version fields.

`deliveryStatus`, delivery timestamps and delivery error fields are not in the
update allowlist. The response omits `submissionData` and does not log or return
credential/PII lookup fields.

## Role/site matrix

| Actor | Read triage | Write triage | Scope |
| --- | --- | --- | --- |
| Super Admin | Yes | Yes | Authorized site scope |
| Site Manager | Yes | Yes | Own site |
| Editor | Yes | No | Own readable site scope |
| Visitor/public form | No admin read | No triage write | Public create only |

The integration suite covers manager read/assignment, editor `403`, an update
that attempts to touch only triage fields, and stale-version `409`. No real
submission was modified during this evidence run.

## Vocabulary gate

The implementation candidate currently follows the original audit vocabulary:
`new`, `contacting`, `won`, `no_answer`, `lost`, labeled respectively Mới tiếp
nhận, Đang gọi tư vấn, Đã chốt, Không nghe máy, Không phù hợp. The design document
still proposes six values including `qualified` and `no_response`. This is an
open product decision, not a hidden compatibility alias; WP-7 cannot be marked
complete until one vocabulary is approved and synchronized across API, migration,
UI and tests.

No account was created, removed, renamed, disabled, reset, re-permissioned or
used as a cleanup target.
