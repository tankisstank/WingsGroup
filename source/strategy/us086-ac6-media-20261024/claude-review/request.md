# Independent Claude Code consultation — US-086 / AC6

User explicitly requests Claude Code via herdr using
`claude --dangerously-skip-permissions`. Current date 2026-10-24.
Workspace root E:/repo/WingsTravel. Read-only architecture and acceptance
review. Do not change any file, run migrations/tests/builds, access secrets or
VPS, publish/deploy/push, modify Plane, call other agents or control herdr.
Only parent agent owns edits and captures your stdout as review evidence.

Review the latest actual documents, not only this summary:
1. E:/repo/WingsTravel/source/strategy/us086-ac6-media-20261024/AC6.md
2. E:/repo/WingsTravel/source/strategy/us086-ac6-media-20261024/CMS-DESIGN.md
3. E:/repo/WingsTravel/source/strategy/us086-ac6-media-20261024/OPERATIONS.md
4. E:/repo/WingsTravel/source/strategy/us086-ac6-media-20261024/review-resolution.md
5. E:/repo/WingsTravel/docs/stories/epics/E03-ai-agent-seo-and-theme/US-086-optimize-wingsgroup-wingsgo-seo.md
6. E:/repo/WingsTravel/seo-audit-20261024/performance-images/REPORT.md

Only inspect these implementation paths where needed to validate a claim:
- E:/repo/WingsTravel/app/src/collections/Media.ts
- E:/repo/WingsTravel/app/src/fields/wingsGroupV3.ts
- E:/repo/WingsTravel/app/src/components/Media/ImageMedia/index.tsx
- E:/repo/WingsTravel/app/src/app/(payload)/api/public-media/[filename]/route.ts
- E:/repo/WingsTravel/app/src/utilities/publicMediaDelivery.ts
- E:/repo/WingsTravel/app/src/payload.config.ts
- E:/repo/WingsTravel/app/src/heros/config.ts
- E:/repo/WingsTravel/app/src/heros/presentations/index.tsx
- E:/repo/WingsTravel/app/src/access/siteScope.ts
- E:/repo/WingsTravel/app/src/components/WingsGroupV3/EcosystemExplorer.tsx

You may read AGENTS.md and README.md for repository rules. If indexed by
CodeGraph, use a targeted CodeGraph query first to locate code. Do not scan
outside repo or into secrets/.env/backups. Prefer specific reads/rg. No need
to read enormous historical deployment folders or the full raw Lighthouse
reports; their actual summary is in REPORT.md. No repeated live speed audit.

Context and constraints:
- One existing US-086, six children, planned/proof0, Core/E03. AC6.1-10 are
  internal checklist, not ten new children. User asks for optimization plan
  sustainable for CMS rather than one-off image recompression.
- Payload-first, Payload3.84.1, Next16.2.6, PostgreSQL production/Redis cache,
  ARM64 Oracle VPS. Existing Media has Sharp sizes; Group governance EXACT
  six verified sizes640/960/1440 WebP+AVIF, rights/provenance/publication gates.
  Do not relax Group rules or assign Group managedBy to WingsGo.
- Lab18runs/sixscenarios: Group LCP mobile4.79s desktop2.22s, desktopCLS.173;
  Go home17.24s/3.45s; listingmobile4.61s/detail4.98s. Seven45s-load warnings
  retained; lab not fieldCWV. Forty image GET200: Go11URL>1MiB, PNG~3MiB,
  HQt7original3156x1769/1.87MB for cards. Group duplicate JPEG/AVIF loads and
  six requestedw640 images physically1440x810. MP4hero11.01MiB,no poster;
  CDN206range works for2byteprobe,MIMEoctetstream; originrange not verified.
- P2 proposed: reuse existing Media/Sharp/renderer/site-aware delivery, only
  add profiles/state/jobs when justified. No new DAM/collection/Redisqueue/
  third-party service as baseline. First fix rendering/use existing variants;
  automate uploads/publish readiness with backward compatibility.
- Proposed budgets/metrics frozen before code, not guaranteed performance.
  AC6 stays open on timeout/failingmetrics; no fakeINP/fieldp75. Preserve video
  design/quality; preparedMP4baseline if no encoder capacity. No implementation
  or schema authorization in this consultation; future changes require proper
  execution/risk/migration/release review.

Questions requiring your independent judgment:
1. Is AC6 precise, achievable, and scoped to the smallest sustainable change?
   Find overengineering, contradictions, hidden dependencies, untestable or
   gameable metrics (poster/video defer, critical bytes, CLS/TBT sampling).
2. Are upload/replace readiness, atomic generation switch, race/crash retry,
   Group fixed widths vs no-upscale, CMS publish and legacy compatibility clear?
3. Are public eligibility, original/derivative/alternate routes, site context,
   caching/revocation/retained generations safe? Distinguish hypotheses from
   verified code behavior; do not claim live disclosure without evidence.
4. Is video gate actually testable across SSR/hydration, blockedautoplay,
   missingnetworkAPI and multiplevariants, including MIME/range/origin/CDN?
5. Recommend implementation order and explicit decision gates. What belongs
   to AC6's first delivery vs deferred until measured need, without omitting
   the user's durable CMS requirement? Keep one US and existing6children.

Output in Vietnamese, with:
- recommendation (agree/adjust P2 and why);
- P1/P2/P3 findings with exact doc/section or source location, concrete risk,
  smallest correction and required evidence; avoid repeating resolved findings
  unless still incomplete in the latest documents;
- prioritized implementation sequence and any genuinely unresolved decisions;
- short note what you inspected vs did not verify.

Do not certify current code or plan as production-ready. If no new issue in
a category, explicitly say none found within review scope. Finish stdout
with `CLAUDE_AC6_REVIEW_COMPLETE` so parent can capture completion.
