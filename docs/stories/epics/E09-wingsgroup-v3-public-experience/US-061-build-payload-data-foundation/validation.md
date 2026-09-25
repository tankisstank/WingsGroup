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

## Follow-up focused validation — 2026-09-25

- The focused US-061 foundation/media/release-gate suite initially found one
  real regression in governed derivative lookup: public derivative requests
  matched Payload `sizes.*.filename` entries but not the corresponding
  `governance.responsiveDerivatives.url` ledger entry.
- The shared `publicMediaWhere()` predicate now accepts either exact governed
  ledger URL matching or one of the six exact Payload derivative filenames.
  The existing site scope, publication, rights, derivative verification,
  provenance and source-evidence conditions remain mandatory; no anonymous
  access broadening was introduced.
- Focused suite after the fix: **4 files, 31/31 tests passed**. The release-gate
  validator remains correctly fail-closed because mandatory
  `privacy-consent=pending-update` and `locale-completeness=route-ready` gates
  are not approved. PostgreSQL backup/restore rehearsal and production rollout
  remain open, so this source fix is not yet production proof.

## Disposable PostgreSQL rehearsal — 2026-09-26

- `node scripts/wingsgroup-v3-content-postgres-smoke.mjs` completed with
  `status=pass` in an isolated PostgreSQL 16 container. Production database,
  Redis and CMS records were not touched.
- Current-schema migration and bootstrap passed. Governed media apply created
  `13/13` records; publish verified `26` localized alt values and `78/78`
  responsive derivatives; media verify confirmed `13/13` records.
- Recovery proof passed: the induced mid-content-write failure rolled back with
  `pageWrites=1`, `formCount=0`, `pageCount=0` and unchanged settings.
- Legacy cleanup passed (`35` legacy text matches and `2` legacy hero links
  removed), followed by content apply and re-apply with `20` writes each,
  `publishedLocales=16`, `publicJargonCount=0`, zero remaining metadata group
  fields and zero remaining legacy links.
- The rehearsal initially exposed and then fixed a harness-only verification
  alias omission; the final run passed all phases: bootstrap, apply, publish,
  verify, content-rollback, legacy-content and content.

## Release-gate recheck — 2026-09-26

- Read-only production probes returned HTTP `200` for `/`, `/en`,
  `/chinh-sach-bao-mat` and `/en/chinh-sach-bao-mat`. The privacy pages expose
  the expected privacy, retention and data-subject wording, and the homepage
  contains consent/privacy markers.
- At the time of this read-only probe, route reachability and rendered policy
  copy were proven only; consent persistence and Content Owner approval were
  still intentionally unverified. The authorized smoke and approval recorded
  below supersede that interim state. No technical route failure was found.

## Consent persistence and Content Owner approval — 2026-09-26

- The authorized production smoke used the normal WingsGroup homepage form and
  a synthetic, explicitly labelled test submission. The endpoint returned
  HTTP `202` with `{\"status\":\"accepted\"}` and request ID
  `5db0c351-3b36-4409-a084-0a14239a9abb`.
- Production CMS verification found exact record ID `8` under site
  `WingsGroup` (`site=1`), locale `vi`, source path `/`, consent version
  `wingsgroup-contact-v1`, non-null consent timestamp, retention exactly 24
  months later, `deliveryStatus=delivered`, and no delivery error. This proves
  persistence and the configured database-only delivery path; it does not claim
  external email delivery.
- Cleanup was authorized and completed narrowly: the five child submission rows
  and parent record ID `8` were deleted in one transaction. Follow-up CMS API
  lookup returned `404` and PostgreSQL counts for the exact parent and children
  were both zero. No other production record was changed.
- Content Owner approval was recorded for the required `vi` and `en` locale
  scope on 2026-09-26. The approval covers the route/chrome/content inventory
  already checked in production; it does not approve an unlisted locale.
- The release-gate register now records `privacy-consent=approved` and
  `locale-completeness=approved`, both approved on 2026-09-26. This gate result
  is independent of the still-open application rollout/source-release status.
