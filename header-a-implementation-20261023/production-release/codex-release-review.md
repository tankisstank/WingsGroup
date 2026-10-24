# Codex release disposition — US-085

Date: 2026-10-23. User explicitly authorized production deploy and CMS write.
Candidate: 6a0dac015340f7279bfe352e377193c38b3d0d91, isolated worktree based on active0701404. Fifteen approved US085 source/test/product files; no migrations, dependency changes, generated payload-types or unrelated CRUD helper diff. Main workspace preserved; no push.

## Consultation and findings

Codex independently reviewed agy implementation and resolved F1–F6 (see Story audit and codex-recheck). Existing agy pane supplied an additional release opinion in agy-release-review.md. Codex dispositions override unsupported claims in that opinion:

- P2 concurrent CMS write: the updater alone has no CAS. Release wrapper acquires a PostgreSQL row lock BEFORE reading settings, passes the SAME Payload transaction request to reads/updates, checks every settings document, commits, then invalidates settings cache again. Tested on a restored production database; one update, second run noop, all other fields/tenants unchanged. No maintenance notification or assumed admin agreement is used.
- P2 cache: actual hook deletes tenant settings Redis keys and process memory; it does NOT call Next revalidateTag. Ops process cannot clear old app process memory. A post-commit invalidation and new app container are required, followed by real public cold/warm browser checks. No global Redis flush.
- P2 recovery: fresh encrypted backup SHA c32a55aa5fc22471039539ce95f2cbb8d52af15dffd7df8a005028c91f9797b0, 4786535 bytes. Real disposable restore passed at2026-10-23T08:01:02.237Z, six sites and six homepages. Target us085_restore_6a0dac0. Candidate operations image revision verified exact SHA before backup/rehearsal.
- P3 agy report limitations: telephone ownership/reachability, CDN freshness and absence of runtime exceptions are not established by its source review. Runtime migration status is an independent gate. The updater executes without an --apply requirement; wrapper requires an explicit apply/rehearse mode and exact database/release binding. Rollback MUST retag previous immutable app image as well as restore the symlink; agy illustrative snippet omits this.
- Multisite/schema: only wings-group site settings main supportPhone authorized. Additional numbers, locale labels and every other settings field are asserted unchanged. No migrations introduced. PAYLOAD_DB_PUSH=false throughout.

## Required execution gates

Candidate build/package, targeted tests, actual migration status, ARM64 native libsql/sharp smoke, loopback candidate readiness and UI must pass before production cutover. Pin previous app digest and current symlink; activation script must rollback automatically if readiness/image/build checks fail. Restore database is disposable and only this operation may remove it.

Backup and rehearsal logs are operational evidence; this document does not itself claim cutover completed. Final live verification and cutover logs must be read before delivery status is changed.
