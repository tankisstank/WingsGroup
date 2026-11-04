# Independent release consultations

## final-codex-review.md

# Independent release review

Compared candidate against commit `8efdbbf` (`HEAD`). No files were modified.

## Findings

**No P1, P2, or P3 findings.**

Verified:

- CTA snapshot validation recomputes hashes and transformations, rejecting tampered output.
- Recovery journals use exclusive `wx` creation and `sync()`, preventing overwrite on rerun.
- Apply never rewrites the precommit journal after commit.
- Lock acquisition failures clear `req.transactionID` and roll back the opened transaction.
- Apply and rollback reject caller-owned transactions.
- Row locks cover all target-site pages before live checks and writes.
- Draft protection checks title, hero, layout, and metadata across locales.
- Tenant checks validate the live WingsGo site and page ownership.
- Campaign heading update enforces `/campaign`, exactly one H1, unsplit text, and the expected old/new values.
- Caption suppression is scoped to WingsGo `/campaign`; shared media captions remain enabled elsewhere.
- Feature grid newline preservation and long-word wrapping are covered.
- Plane acceptance criteria no longer truncate at six items.

## Verification

Passed:

```text
pnpm exec vitest run --config ./vitest.unit.config.mts tests/unit/updateWingsGoCtaHotline.unit.spec.ts tests/unit/campaignHeading.unit.spec.ts
```

`2 files passed, 22 tests passed`

```text
pnpm exec vitest run --config ./vitest.component.config.mts tests/component/campaignCaption.component.spec.tsx tests/component/featureGridLineBreaks.component.spec.tsx
```

`2 files passed, 6 tests passed`

```text
pnpm exec vitest run --config ./vitest.config.mts tests/int/followupsIndependent.int.spec.ts tests/int/campaignHeadingIndependent.int.spec.ts tests/int/followupsBrowserFixture.int.spec.ts
```

`3 files skipped, 4 tests skipped` because the disposable PostgreSQL guard was not enabled. No PostgreSQL mutation was performed.

```text
git diff 8efdbbf --check
```

Passed.

Scoped ESLint completed with no errors; only existing-style warnings for `any` and mocked `<img>` usage.

## Limitations

I did not run the independent PostgreSQL proof because the request explicitly prohibited PG mutation and the tests were guarded. Crash interruption during the journal write itself was not fault-injected; the reviewed prewrite `wx` + `sync()` path passed the available regression coverage.

---

## production-supplemental-codex-review.md

## Kết quả

**Không phát hiện P1, P2 hoặc P3** trong phạm vi commit `c0d51fa`.

Đã kiểm tra:

- Ba helper chỉ được di chuyển; logic và caller giữ nguyên.
- Page Wizard vẫn giữ auth, `overrideAccess: false`, kiểm tra site/locale, lỗi `PageWizardError` và response status.
- Site Review vẫn giữ `createLocalReq`, pagination, access scope, `Promise.allSettled` và xử lý lỗi nguồn.
- Tour Authoring vẫn gọi kiểm tra CSRF trước mutation; logic origin/referer và trusted origins không đổi.
- Hai CLI đều `await payload.destroy()` trong `finally`; success/error output được flush trước `process.exit(0/1)`.
- Không thấy caller/import cũ bị bỏ sót.

## Kiểm chứng

- Unit: **3 files, 6 tests passed**.
- ESLint scoped: **0 errors**, 5 warning `any` có sẵn trong script.
- TypeScript: `TS_EXIT=0`.
- `git diff c0d51fa^ c0d51fa --check`: pass.
- Không chạy database, browser, production hoặc deployment.

## Giới hạn

Harness không chạy được vì thiếu `scripts/bin/harness-cli.exe`. Workspace xuất hiện thay đổi ngoài phạm vi trong lúc review (`updateWingsGoCampaignHeading.ts`, test integration, và `deploy/oracle/*`); tôi không sửa hoặc hoàn nguyên chúng.

Đã bỏ qua runtime proof với PostgreSQL cho lifecycle CLI; rủi ro còn lại chỉ là hành vi flush/thoát dưới kết nối thật chưa được thực thi.

---

## production-pathname-codex-review.md

**No P1/P2/P3 findings in the scoped diff against `c0d51fa`.**

- Selection now requires exact WingsGo tenant, `/campaign`, and published status, rejecting missing or ambiguous matches.
- Apply and rollback validate the snapshot route and nonempty slug, then compare the live slug, tenant, route, and published status before writing.
- Explicit pathname on both writes preserves `/campaign` with the namespaced slug.
- Existing transaction, concurrency, hero checksum, and locale draft guards remain intact. The test additions cover namespaced slug selection, forged route/slug rejection, and route preservation through apply/rollback.

Reviewed using `git diff --unified=80 c0d51fa -- <two files>` and a focused symbol-reference search; both completed successfully.

Not checked: runtime/PG tests, production, or shared helper internals; their prior audits and lifecycle proof are supplied evidence. Residual race safety depends on the unchanged row-lock helper.

---

## production-final-packaging-codex-review.md

## Audit result

Reviewed only:

- `app/scripts/prepare-standalone.mjs`
- `app/tests/unit/prepareStandalone.unit.spec.ts`
- Diff `97f2122..642b857`

**Finding: no P1, P2, or P3 issues.**

The change:

- Preserves existing traced `@libsql` and `@neon-rs` child packages.
- Copies only missing namespace children from the exact pnpm virtual store.
- Adds fallback copying for `promise-limit`, `js-base64`, and `ws`.
- Includes regression coverage for two consecutive runs and stale `libsql` cleanup.

The reported root client import, two postbuild runs, traced-client preservation, and regression test results support the conclusion.

**Limits:** I did not rerun builds or tests, inspect broader packaging/deployment behavior, or review files outside the requested narrow diff.

---

## production-media-codex-review.md

**No P1/P2/P3 findings in the two-file diff against `642b857`.**

- **Path fix:** `process.cwd()/public/media` matches Docker’s `WORKDIR /app` and the stated app-root pnpm execution. It removes the source-module location dependency that breaks relocated standalone bundles.
- **Callers:** The sole application caller is `Media.ts`; its `upload.staticDir` also supplies the public media route. Both therefore use the corrected directory.
- **Multisite/security:** The change introduces no request-controlled path. Existing site-scoped media queries, governance validation, filename checks, and path containment remain unchanged.
- **Preview restrictions:** The configured preview store still returns `undefined` before filesystem resolution. Preview seed mode without that store still throws, and explicit directory overrides remain rejected.
- **Tests:** The additions cover relocated runtime cwd and production override refusal, with mock/environment cleanup. The preview-store predicate is always mocked `false`, so these tests do not exercise the configured-store branch.

**Evidence:** Read the diff, both files, callers, access checks, public route, and Docker startup configuration. `git diff --check 642b857 -- app/src/utilities/localPreviewMedia.ts app/tests/unit/localPreviewMedia.unit.spec.ts` exited **0**, with an LF/CRLF warning.

Not checked: no edits, agents, tests, builds, or production access; the three passing tests and rollback HTTP 200 are user-reported evidence.
Remaining risk: the new artifact’s actual media delivery is unverified here; launchers must retain the app-root working directory.