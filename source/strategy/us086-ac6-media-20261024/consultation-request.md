# AC6 / US-086 architecture consultation

Read-only independent architecture/test review requested by repository Codex
Consultation Gate. Do not edit files, deploy, access credentials, contact users,
or spawn child agents. Parent will save your stdout as consultation evidence.
Each parent write affects one file, <=15KB; no Delete+Add same file.

Task: clarify existing US-086 AC6 and recommend sustainable CMS media flow.
Planning/docs only, keep US planned and six Plane children. No app/schema
implementation authorized by this request. Review concrete proposal below;
return P1/P2/P3 findings, recommended option and explicit acceptance gaps.
You may inspect only the named repository paths if needed (absolute root
E:/repo/WingsTravel); do not scan outside workspace. Current versions:
Payload3.84.1, Next16.2.6. No new dependency/service in the recommended baseline.

Measured evidence in seo-audit-20261024/performance-images/REPORT.md:
18 Lighthouse13.5/Chrome155 lab runs, six scenarios x3. Median LCP Group
mobile4.79s desktop2.22s; Go home mobile17.24s desktop3.45s; listing4.61s,
detail4.98s mobile. Seven runs load-warning (Go home mobile2 desktop3 listing2)
with maxWaitForLoad45s; lab not field CWV. Group desktop CLS.173 mostlyecosystem.
40GETimages200: Go11sampleURLs>1MiB, PNG~3MiB; HQt7 original3156x1769/1.87MB
used for small cards. Group JPEGpreloads2x327744B duplicateAVIF;6w640responses
decoded1440x810. Video autoplay11,546,189B, no poster; CDN206range works in2byte
probe, MIMEoctet-stream. Origin route actual range behavior not tested.

Existing implementation (read paths, no code changes):
- app/src/collections/Media.ts: one tenant-scoped Media collection, localized
  alt/caption, Payload imageSizes standard300/500square/600/900/1400/1920/OG,
  plus six Group640/960/1440 WebP+AVIF sizes. All size configs global today;
  PAYLOAD_IMPORT_ORIGINALS_ONLY and local preview can suppress derivatives.
- app/src/fields/wingsGroupV3.ts: Group governance EXACTLYsix sizes, hashes,
  rights/provenance, private production publish context; do not reuse this
  Group managedBy/publication gate for WingsGo or loosen it.
- app/src/components/Media/ImageMedia/index.tsx: picture responsive sources
  only for published governed Group. Direct /media unoptimized for tenant
  security. NextImage priority can preload original outside picture.
- app/src/app/(payload)/api/public-media/[filename]/route.ts: site-scoped
  lookup original+six derivative names, governance check; not generic all
  sizes. Returns200stream and Accept-Ranges bytes but no request Range parse.
- app/src/utilities/publicMediaDelivery.ts: MIME map currently images only.
- app/src/payload.config.ts: existing Payload jobs queue tasks for leads;
  no registered media task yet. ProductionPostgres, Redis cache not queue.
- app/src/heros/config.ts: existing video.desktopVideo/mobileVideo/poster.
  DeviceMockupSplitHero in presentations/index.tsx uses media mp4 bypassing
  these poster settings; VideoBackgroundHero also needs review because it
  mounts separate desktop/mobile video nodes (CSS hiding doesn't preventGET).

Proposal options:
P1 only manual file compression/render fixes: fastest but uploads regress.
P2 RECOMMENDED extend existing Media/Sharp generation + shared rendering;
   reuse existing derivatives and tenant delivery security, add bounded media
   task through existing Payload jobs only where processing is too expensive.
   No new collection, Redis queue, CDN transform service or platform switch.
P3 request-time resizing Next/CDN: blocked until forwarding/access/cache key
   verified for private/draft/tenant media; cannot just enable optimizer.
P4 fullDAM/video platform/object-storage migration: future capacity-driven,
   not dependency of AC6 baseline.

P2 specifics for review:
1) Fix Go thumbnails/cards to media relationship->shared asset resolver,
   img picture/sizes appropriate to layout+actual DPR. Group priority only
   true abovefold candidate; no original JPEGpreload when AVIFchosen. Reuse
   existing640/960/1440 outputs; thumb160/320 WebP profile only where needed,
   preserving Group validator EXACTsix, not imposing it on Go. No upscale;
   smaller input emits actualwidth. Avoid generating every cropformatxsize.
2) Server technical states proposed pending/processing/ready/failed + generation
   identity sourcehash+profileVersion+crop; separate rights/publication states.
   Fields optional additive after migration review; use existing metadata first
   if sufficient; no mandatory schema now. Worker idempotent, concurrency1 on
   ARM64 initially, limited resource budgets,3retries, partialfiles notserved.
   Write temp/verify then switch only if source revision stillcurrent. Failed
   replacement retains previousready version; technicalready cannotpublish.
3) Preserve original immutable file and old URLs; new derivative versionednames
   on replace/cropchange; no unsafe overwrite with updatedAtquery alone.
   Page/asset revalidation site+locale+media dependencies. CDN cache host+path,
   public only after access/publication confirmed; draft/auth no-store. Unpublish
   purgebounded public caches before declaring revoked; do not promise immediate
   revocation using immutable year cache without reliable purge.
4) CMS editor sees progress/errors/retry/bytes/dimensions + slot preview and
   warnings. No hand-entering URLs/quality/highpriority/srcset fields. New
   content cannotpublish unready required hero/card; draft allowed. Legacy
   published content served with existing valid image until batch converted;
   no globalpublishblock introduced before backfill compatibility review.
5) Video uses existing poster/desktop/mobile fields, active source only; poster
   in initialHTML, no src/video bytes before visibility+pagecriticalcontentready
   on normalnetwork, SaveData/reducedmotion/autoplayerror stays poster+play.
   preload alone insufficient with autoplay. OptimizedMP4 H264baseline/AACif
   needed, faststart, duration/resolution/bytes caps tested. Preserve design.
   Correct video/mp4 and actual200/206/416 validation origin+CDN, no AcceptRanges
   claim without range functionality. No unlimited FFmpeg sync on web request.
6) Backfill dryrun site-scoped/allowlistedIDs, disk forecast source+variants+temp
   +backup/logs, lowconcurrency resumable batches, physicalhash/size/decode then
   pointer switch. Originals/relationships/alt/provenance stay; no automatic
   deletion/dedup byhash across tenant. Hash duplicates only report. Rollback
   previousgeneration,pointers,cache; schema backwardcompat; don't fullrestore
   DB and lose leads. Cleanup separate referenced+retention approval only.
7) Proposed gates: same6scenarios x3 clean reproducible runs, no timeout/runtime
   warning accepted as passing; LCPmedian<=2.5s,CLS<=.1,TBT<=200ms mobile,
   desktopTBT<=150ms; field unavailable=N/A not fake. If not met leaveAC6open,
   identify concrete residual. Images budget thumb<=50KiB,card<=150KiB,
   hero/poster<=250KiB (largest valid selectedDPR), qualityexceptiondocumented
   slotnotglobaldisable. Initialpagebudget<=2MiB mobile excluding deferredvideo;
   actualvideo bytes separate; no video precritical. May need tune budgets
   before implementation against current layouts and quality, not relax after
   measuring to pass. Origin+CDN samefiletest, cold/warm andtenantnegative tests.

Review especially: race conditions/upload replacement, direct derivative
read bypass, current six-size governance, denied-filecache/unpublish, source
small vs thumbDPR handling, optimistic performance targets vs lab variation,
schema rollout and the smallest sustainable solution. No need to rerun the
18measurements or run app suites for docs. Return clear fixes to plan.
