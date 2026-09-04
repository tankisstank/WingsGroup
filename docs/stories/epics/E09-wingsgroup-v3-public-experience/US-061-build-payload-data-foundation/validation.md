# US-061 Validation

## Proof Strategy

Prove the model is additive, site-scoped, localized where required, safe for
existing tenants, and reproducible on PostgreSQL.

## Test Plan

| Layer | Cases |
| --- | --- |
| Unit | Parsers, enums, publication states, channel states, and media metadata rules. |
| Integration | Payload config, access scope, site resolution, seed/import, generated types, and PostgreSQL migration. |
| E2E | Authenticated editor/site-manager visibility and authoring of governed fields. |
| Platform | PostgreSQL apply/rollback/idempotence and existing-tenant smoke. |
| Performance | Responsive media derivatives and payload-size budget. |
| Logs/Audit | Plan checksum, counts, target site, and rollback evidence. |

## Fixtures

- WingsGroup site and settings.
- One user per CMS role.
- Thirteen supplied media files with approved and pending metadata variants.
- One publishable and one pending proof record.

## Commands

```text
pnpm lint
pnpm test:int
pnpm test:e2e
pnpm build
```

Migration-specific commands must be added after the implementation plan names
the exact migration and import scripts.

## Acceptance Evidence

Implementation is live and formal PostgreSQL rehearsal evidence remains open.
The content foundation is site-scoped and bilingual; the
governed media import/publish recorded 13 handoff records with provenance,
rights, Vietnamese/English alt text and 78 responsive derivatives. The local
preview regression boots a current-schema disposable SQLite baseline containing
`site_settings.sales_email`, seeds all 13 assets twice and verifies the
governed pending-media perimeter without exposing its token. The remaining
operational proof is a recorded production PostgreSQL backup/restore rehearsal.
