# US-086 / AC6 Media Operations Runbook

## 1. Overview and Architecture Scope

This runbook defines operational procedures, read-only derivative inventory diagnostics, poster mapping, HTTP byte range verification protocols, and paired container rollback procedures for US-086 / AC6 media delivery.

- **Architecture:** Payload 3.84.1 + Next.js 16.2.6 (Node 22, pnpm 10).
- **Multisite Media Delivery Policy:**
  - WingsGo images: public-on-upload policy, directly resolved from `/media/<filename>` without publication gate. Settled policy applies strictly to WingsGo images (does not expand to WingsSide, videos, or documents).
  - WingsGroup media: strictly governed under `wingsgroup-v3`, requiring verified publication status before emitting responsive derivative picture sources. Pending Group media remains authenticated.
  - Site ownership must be resolved dynamically via site domain/slug lookup (e.g. `wingsgo.vn` vs `wingsgroup.vn`), avoiding reliance on unverified static numeric site IDs.
- **Derivative Delivery:** 6 WebP and AVIF derivative sizes (`640`, `960`, `1440`) with actual metadata widths, deduplication per format, and legacy original fallback.
- **Hero Presentations:** Poster-first lifecycle, client policy gating, single active `<video>` source per viewport, accessible pause/play toggle outside `aria-hidden`, and branded gradient placeholder when poster is unavailable.
- **Byte-Range Support:** RFC 9110 single byte-range requests (HTTP 206 Partial Content, 416 Range Not Satisfiable) for progressive video streaming and seeking.

---

## 2. Media Derivatives Inventory & Backfill Operations

### 2.1 Illustrative Read-Only Inventory Template
The following script is an illustrative diagnostics template that performs read-only checks without modifying database records. To execute it in an ESM/TypeScript environment, save the template (e.g. to `scripts/inventory-media-derivatives.ts`) and run via `pnpm exec tsx scripts/inventory-media-derivatives.ts`:

```typescript
// scripts/inventory-media-derivatives.ts (Illustrative Read-Only Template)
import fs from 'node:fs'
import path from 'node:path'
import config from '@payload-config'
import { getPayload } from 'payload'

interface DerivativeAudit {
  id: number | string
  site: string
  filename: string
  width: number
  filesize: number
  metadataDerivativesCount: number
  physicalFilesFound: number
  legitimatelySkippedCount: number
  status: 'complete' | 'partial' | 'missing-physical' | 'legacy-original-only'
}

const REQUIRED_WIDTHS = [640, 960, 1440] as const
const REQUIRED_FORMATS = ['avif', 'webp'] as const

export async function inspectDerivativesInventory(targetSiteCode?: string) {
  const payload = await getPayload({ config })
  const publicMediaDir = path.resolve(process.cwd(), 'public/media')

  const whereClause: Record<string, unknown> = {
    mimeType: { like: 'image/' },
  }

  const result = await payload.find({
    collection: 'media',
    depth: 1, // depth 1 to resolve site relation cleanly
    limit: 1000,
    overrideAccess: true,
    pagination: false,
    where: whereClause,
  })

  const auditReport: DerivativeAudit[] = []

  for (const doc of result.docs) {
    // Sites collection uses 'code' (e.g. 'wings-group', 'wings-go'), not 'slug' (see collections/Sites.ts:35)
    const siteObj = typeof doc.site === 'object' && doc.site ? (doc.site as { code?: string; id?: string | number }) : null
    const siteCode = siteObj?.code || String(doc.site || 'unknown')

    if (targetSiteCode && siteCode !== targetSiteCode) {
      continue
    }

    const origWidth = doc.width || 0
    const origSize = doc.filesize || 0
    const sizes = (doc.sizes || {}) as Record<string, { filename?: string; width?: number; filesize?: number }>

    let metadataCount = 0
    let physicalCount = 0
    let skippedCount = 0

    for (const targetWidth of REQUIRED_WIDTHS) {
      if (origWidth > 0 && origWidth <= targetWidth) {
        // Sharp legitimately skips upscaling when the original image is narrower than target
        skippedCount += REQUIRED_FORMATS.length
        continue
      }

      for (const format of REQUIRED_FORMATS) {
        const profileKey = `wingsgroup-v3-${targetWidth}-${format}`
        const entry = sizes[profileKey]

        if (entry?.filename && typeof entry.width === 'number' && entry.width > 0) {
          metadataCount++
          const diskPath = path.join(publicMediaDir, entry.filename)
          if (fs.existsSync(diskPath)) {
            physicalCount++
          }
        }
      }
    }

    let status: DerivativeAudit['status'] = 'complete'
    const expectedDerivatives = REQUIRED_WIDTHS.length * REQUIRED_FORMATS.length - skippedCount

    if (metadataCount === 0) {
      status = 'legacy-original-only'
    } else if (physicalCount < metadataCount) {
      status = 'missing-physical'
    } else if (metadataCount < expectedDerivatives) {
      status = 'partial'
    }

    auditReport.push({
      id: doc.id,
      site: siteCode,
      filename: doc.filename || 'unknown',
      width: origWidth,
      filesize: origSize,
      metadataDerivativesCount: metadataCount,
      physicalFilesFound: physicalCount,
      legitimatelySkippedCount: skippedCount,
      status,
    })
  }

  console.log(`[AC6 INVENTORY] Total images audited: ${auditReport.length}`)
  console.table(auditReport.slice(0, 50))
  return auditReport
}

// Standalone execution entrypoint
inspectDerivativesInventory()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('[AC6 INVENTORY ERROR]', err)
    process.exit(1)
  })
```

### 2.2 Legacy Derivative Limitation & CMS Backfill Release Gate
- **Known Limitation:** If derivative metadata (`sizes`) references a filename that does not exist physically on disk, HTML `<picture>` `<source>` tags will return HTTP 404 and browsers will not fall back to `img src`. Zero-broken-image guarantees cannot be promised without physical file presence verification.
- **Backfill Release Gate:** Historical media assets lacking physical WebP/AVIF derivatives must NOT be updated via ad-hoc scripts. CMS derivative generation is gated behind a separately authorized dry-run / canary / resume procedure that:
  1. Preserves existing WingsGo media IDs and public filenames.
  2. Preserves database relations to Tours, Articles, and Site Settings.
  3. Validates disk space on the Oracle Cloud VPS block volume before generating new files.

---

## 3. Poster Mapping & Branded Placeholder Hierarchy

When configuring hero video presentations (`VideoBackgroundHero`, `VerticalVideoSplitHero`, `DeviceMockupSplitHero`, `AmbientVideoSplitHero`):

1. **Hierarchy of Visual Fallbacks:**
   - **Primary:** `hero.video.poster` (explicit responsive poster configured by editor).
   - **Secondary Fallback:** `hero.media` (if `hero.media` is an image document, it serves as the responsive poster).
   - **Branded Placeholder:** If no poster is assigned or the poster fails to load (404/decode error), and the video is not playing (e.g. `prefers-reduced-motion: reduce`, `Save-Data: on`, or video error), `ResponsiveHeroVideo` renders a neutral branded gradient layer (`bg-gradient-to-br from-[var(--site-brand,#0284c7)]/20 via-slate-900 to-black` matching Ambient styling).
   - **No Fallback Fetch:** MP4 files are NEVER fetched merely as a fallback visual when reduced-motion or SaveData is active.
2. **Editor Operational Guidance:**
   - Editors must assign a 16:10 or 4:5 poster image whenever configuring hero videos.
   - The poster displays immediately during initial cold render and remains visible until a video frame has successfully decoded and begun rendering.

---

## 4. HTTP Byte Range & CDN Verification Protocol

All tests must be conducted against the real production public path `/media/<filename>` (routed through nginx and Next.js public media handler), using an actual verified video file uploaded on the target environment.

> [!IMPORTANT]
> **Asset Safety & Variable Quoting:**
> Requires an actual known-public video per current policy, not newly public. Do not use unquoted angle-bracket placeholders in shell commands as `<...>` triggers shell redirection. Define and quote `MEDIA_URL` explicitly:
> ```bash
> MEDIA_URL='https://wingsgo.vn/media/REPLACE_WITH_REAL_PUBLIC_FILENAME.mp4'
> ```

Note: To display response headers on stdout while discarding the binary body, commands use `curl -D - -o /dev/null` (do NOT use `-i ... -o /dev/null` which suppresses headers).

### 4.1 Cold Request & CDN Cache Status
```bash
# 1. Cold request (test directly against origin or with fresh cache-busting query parameter)
curl -D - -o /dev/null -H "Cache-Control: no-cache" "${MEDIA_URL}?cb=cold01"

# Expected:
# HTTP/1.1 200 OK
# Accept-Ranges: bytes
# Content-Type: video/mp4
# Content-Length: <full-size>
# Cache-Control: no-store (video responses and every partial response)
# cf-cache-status: MISS (or DYNAMIC / BYPASS depending on CDN query policy; record actual header)

# 2. Subsequent request to inspect edge caching behavior
curl -D - -o /dev/null "${MEDIA_URL}?cb=cold01"

# Record actual status returned. New video delivery keys must remain DYNAMIC/BYPASS, never HIT.
```

### 4.2 HEAD Request (Header-Only Inspection)
```bash
curl -I "$MEDIA_URL"

# Expected:
# HTTP/1.1 200 OK
# Accept-Ranges: bytes
# Content-Type: video/mp4
# Content-Length: <full-size>
# (Zero body bytes returned)
```

### 4.3 If-Range Comparison & Safe Fallback
```bash
# Note: Because weak validators cannot satisfy strong comparison under RFC 9110,
# providing an unverified If-Range validator safely falls back to a full 200 response:
curl -D - -o /dev/null -H "Range: bytes=0-1023" -H "If-Range: \"unmatched-etag\"" "$MEDIA_URL"

# Expected:
# HTTP/1.1 200 OK (Range ignored, full content delivered)
# Content-Length: <full-size>
```

### 4.4 Byte Range Requests (RFC 9110)
```bash
# Standard Closed Range (First 1024 bytes)
curl -D - -o /dev/null -H "Range: bytes=0-1023" "$MEDIA_URL"
# Expected:
# HTTP/1.1 206 Partial Content
# Content-Range: bytes 0-1023/<full-size>
# Content-Length: 1024

# Open-Ended Range (From 1MB to EOF)
curl -D - -o /dev/null -H "Range: bytes=1048576-" "$MEDIA_URL"
# Expected:
# HTTP/1.1 206 Partial Content
# Content-Range: bytes 1048576-<full-size-1>/<full-size>

# Suffix Range (Last 50,000 bytes)
curl -D - -o /dev/null -H "Range: bytes=-50000" "$MEDIA_URL"
# Expected:
# HTTP/1.1 206 Partial Content
# Content-Range: bytes <full-size-50000>-<full-size-1>/<full-size>
# Content-Length: 50000

# Unsatisfiable Range
curl -D - -o /dev/null -H "Range: bytes=999999999-999999999" "$MEDIA_URL"
# Expected:
# HTTP/1.1 416 Range Not Satisfiable
# Content-Range: bytes */<full-size>
# Cache-Control: no-store
```

---

## 5. ARM64 Staging Benchmark & Release Gates

### Proxy and CDN cache prerequisites

For WingsGo and WingsGroup, Cloudflare **Browser Cache TTL must be Respect
Existing Headers**. The previous 4-hour setting changed public video 206
responses from `no-store` to `max-age=14400`, even with CF-Cache-Status BYPASS.
Verified correction and public byte-range evidence are recorded in
`us086-production-20261025/CDN-CHANGE.md`. Do not use Development Mode as the fix.

The Nginx application proxy must disable inherited shared `proxy_cache` and
forward Range/If-Range; see `app/deploy/nginx/wings-travel-production.conf`.
An aaPanel global cache can otherwise suppress Range upstream and return the
entire video with 200. After proxy/CDN configuration changes, rerun the full
GET/HEAD/206/416/If-Range probe through the public hostname and compare actual
range bytes with the corresponding full-body bytes.

### 5.1 Release Gates Checklist (Release is NOT Approved Until Satisfied)
- [ ] **ARM64 Native Sharp Execution:** Verified on Oracle Cloud ARM64 (aarch64) instance with 13 resize targets and WebP/AVIF output.
- [ ] **Physical File Existence:** Derivative files verified to exist on disk before emitting responsive picture elements.
- [ ] **P3-3 Cache Replacement Gate:** Video full/HEAD responses and all partial responses use `no-store`. Hero sources include the media revision and `ac6-video-v1`, separating previous CDN keys. Verify origin and CDN respect this policy, byte ranges match the full file, and unknown `If-Range` returns full 200. CMS upload replacement must change the filename/revision while preserving the media ID. Re-enable video caching only after immutable version storage or a tested strong-validator lifecycle is implemented. Weak ETags cannot satisfy strong comparison for If-Range.
- [ ] **Physical Device QA:** Verified on physical Apple iOS WebKit (Safari) and Android Chrome devices.
- [ ] **Lighthouse 6x3 Cold Protocol:** Cold browser profile, zero cache warming, 3 runs across 6 representative routes on staging VPS.

---

## 6. Deployment Rollback Plan

If any critical regression occurs during deployment on the Oracle Cloud VPS:

1. **Container / Package Rollback (Paired Rollback via Production Protocol):**
   - Application and packaging must roll back **together** to the previous known good Docker container image and release directory.
   - Follow the established production rollback procedure in [Oracle VPS ARM64 deployment](./oracle-vps-arm64-deployment.md), Bước 7:
     - Deployment base directory on VPS: `/home/ubuntu/wings-travel`
     - Uses immutable paired artifacts generated during release cutover:
       - `$candidate/PREVIOUS_RELEASE` (path to previous release directory)
       - `$candidate/PREVIOUS_IMAGE_ID` (immutable sha256 image ID of previous running container)
       - `$candidate/rollback-compose.yml` (compose override pinning `services.app.image` to previous image ID)
     - Run rollback within the canonical procedure's saved release context, where `$base`, `$candidate`, and the previous immutable image are validated. That procedure atomically restores `$base/current`, activates the paired release with `rollback-compose.yml`, and verifies the running image against `PREVIOUS_IMAGE_ID`. Do not extract an activation command and run it independently.
     - No manual fabricated stop/up commands; never target non-existent service names.
   - **NEVER** use `git checkout <base>` as the runtime deploy rollback mechanism.
2. **Database & Lead Safety:**
   - **Zero Schema Migrations:** US-086 / AC6 introduces zero database migrations and zero new collections/fields.
   - **NEVER restore a database backup** to roll back code. Restoring a database snapshot would permanently destroy newly acquired customer leads, bookings, and tour inquiries.
   - Uploaded files in `/public/media` remain untouched and backward-compatible across releases.
