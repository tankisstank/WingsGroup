# US-095 integrated production follow-up — 2026-11-04

## Released

- Production code: `2265e13f885e301ceed51f79255c2a38fe14c013`.
- Integrated prior delivered US-005, US-081, US-088 and CMS tour editor fixes with US-095.
- Current: `/home/ubuntu/wings-travel/releases/release-2265e13`.
- Rollback: `release-931b7ea`, pinned previous image retained.
- Active app: `sha256:094fc62b35d00540d4f7a8b1decd5edff52f85aee1f337fd0df35f4cf2605404`.
- Ops: `sha256:76c1d0217f0c98d6f21d234b15bc6d272a95a2008b9750587eb7be36cb38865b`.

## Verification

- Build including TypeScript and standalone postbuild: exit 0.
- 64 focused unit, 17 component, 6 API unit, 2 CTA PostgreSQL, 1 heading PostgreSQL and 1 browser fixture integration test passed.
- ESLint: 0 errors; 11 existing warnings. Independent Codex reviews: no actionable P1/P2/P3; final code GO.
- Actual standalone CMS: default Flight export, form, itinerary and draft departure save/reload passed on disposable local data.
- ARM64 Sharp runtime verification passed. Fresh encrypted backup and disposable restore verified; 52/52 registered migrations applied; no schema writes.
- Restored production data rehearsal: guarded label apply, rerun noop, injected postwrite transaction rollback, targeted snapshot rollback and pending editor draft refusal passed.
- Production Payload correction: page191 VI WingsPlus first service label changed from “Du lịch hội nghị - hội thảo” to “Hành trình riêng”. Immutable snapshot retained on VPS. All other published locales and page181 control verified unchanged in the transaction; rerun noop.
- Candidate browser: 8 checks passed at 1440/390, playing campaign video, scoped caption, hotline and four multiline WingsPlus cards; no browser errors.
- Cutover readiness and fresh production readiness: database/Redis up, lead delivery configured, exact active image verified.
- Authenticated Edge production tour181: enabled title field, all 11 itinerary rows, Tour authoring and existing published departure 16/12/2026 render. No production CMS record saved during QA.
- Production browser: 8/8 regression checks passed, including campaign VI/EN, caption control, video playback, CTA and WingsPlus at 1440/390; browser errors empty.
- US-095 production browser: 28/28 checks passed — eight VI/EN introduction routes and twenty ecosystem tab/CTA checks across the home and ecosystem pages. WingsPlus service label matches in both locales.
- Plane: filtered work item sync patched 27 items with missingCount=0. US-075 note updated separately because its Harness row is absent, preserving metadata and six children. API readback verified all five stories, correct E02/E07/E09 parents, meaningful child names and complete dates.

## Evidence and limitations

Evidence directory: `us095-integrated-release-20261104/` (build/test/review logs, backup hashes, cutover, rehearsal and browser artifacts). Protected full content snapshots and backup keys remain on VPS; do not commit them.

Historical story acceptance and dates are preserved. This is technical delivery, not stakeholder acceptance. Real calls/leads and physical Safari/iOS were not exercised. Existing missing translation keys and CDN CSP warnings were observed; the editor form and itinerary render successfully.
