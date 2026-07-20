# HANDOFF — Wingside Tour Detail: Hi-fi → Repo implement

**Ngày cập nhật:** 2026-07-20  
**Mục đích:** Prompt chuyển **session khác / thư mục khác** để **implement production** từ bản hi-fi Open Design vào repo **`E:\repo\WingsTravel`**.  
**Không** redesign Open Design artifact. **Không** copy mù WingsGo retail. **Bám** các yêu cầu nhỏ lẻ đã lock trên funnel hi-fi.

---

## 0. Prompt dán nhanh (session mới)

```text
Bạn là agent implement UI/UX trong repo WingsTravel (Next.js + Payload).

Đọc và thực hiện theo file handoff:
  E:\repo\WingsTravel\docs\HANDOFF-wingside-tour-detail-hifi-to-repo.md
(nếu chưa có trong repo, bản canonical Open Design):
  C:\Users\VIETD\AppData\Roaming\Open Design\namespaces\release-stable-win\data\projects\9f85d0db-9ebc-409a-b580-5b401e4a10b8\HANDOFF-wingside-tour-detail-hifi-to-repo.md

Nguồn visual (đã ship, chỉ đọc):
  …\9f85d0db-…\wingside-tour-detail-hifi.html
  …\9f85d0db-…\wingside-hifi-fix-8pages.html   ← token/component Book gold
  …\9f85d0db-…\HANDOFF-wingside-tour-detail-hifi.md  ← design lock chi tiết

Target code:
  E:\repo\WingsTravel\app\src\tours\StructuredPages.tsx  (TourDetailPage + sections)
  E:\repo\WingsTravel\app\src\app\(frontend)\[...slug]\page.tsx  (resolveStructuredTourPage)
  E:\repo\WingsTravel\app\src\tours\sectionRegistry.ts
  E:\repo\WingsTravel\app\src\tours\utils.ts
  E:\repo\WingsTravel\app\src\utilities\siteTheme.ts / globals.css (token site)

Nhiệm vụ:
  Port hi-fi tour detail Wingside vào production, site-aware cho themeKey wings-side.
  KHÔNG phá UX retail WingsGo (hold-seat / departures / giá công khai).
  KHÔNG invent seats, price USD số, reviews, fake scarcity.
  Dual CTA: Primary gold Consult · Secondary ghost Contact.
  URL path prefix site: /wingsside/ (2 chữ s).
  Trước edit: audit file hiện tại + AGENTS.md + docs/HARNESS.md; thay đổi nhỏ, có kiểm tra.

Skip discovery form — brief đã lock.
```

---

## 1. Bối cảnh sản phẩm

| Mục | Giá trị |
|-----|---------|
| Brand | **Wingside** — private / tailor-made Vietnam **inbound** (không group outbound) |
| Live | https://wingside.vn/ |
| Theme key | `wings-side` · preset live `wings-side-editorial-inbound-v2` |
| Tour mẫu (hi-fi content) | **Best of Northern Vietnam: Hanoi, Sapa & Halong · 6D5N** |
| Live slug mẫu | `best-of-northern-vietnam-hanoi-ninh-binh-sapa-halong-6-days` |
| Local route mẫu | `http://localhost:3000/wingsside/tour/<slug>` (sau khi enable structured tour cho site) |
| Spelling URL | **`/wingsside/`** (2 chữ **s**) → đúng; `/wingside/` → 404 |
| Positioning | Consultative private sale — **không** inventory ghế / “mở bán / giữ chỗ” kiểu WingsGo |
| UI language hi-fi | **English** mặc định; production có locale EN/VI — bám copy CMS, không invent |

**WingsGo** (`/wingsgo/…`) chỉ là **tham chiếu pattern conversion** (decision facts, sticky price+CTA, jump nav). **Không** copy UI group sales / fake scarcity / primary CTA “Giữ chỗ” sang Wingside.

---

## 2. Ba “thư mục” — đừng nhầm

### A) Open Design HI-FI — SOURCE OF TRUTH visual (đã ship)

| Field | Value |
|-------|-------|
| **Project id** | `9f85d0db-9ebc-409a-b580-5b401e4a10b8` |
| **Root** | `C:\Users\VIETD\AppData\Roaming\Open Design\namespaces\release-stable-win\data\projects\9f85d0db-9ebc-409a-b580-5b401e4a10b8\` |

**File bắt buộc đọc (read-only khi implement repo):**

```
…\9f85d0db-…\wingside-tour-detail-hifi.html           ← ARTIFACT HI-FI (đã ship + accordion)
…\9f85d0db-…\wingside-hifi-fix-8pages.html            ← funnel 8 pages · token Book gold SOURCED
…\9f85d0db-…\HANDOFF-wingside-tour-detail-hifi.md     ← design handoff (IA, tokens, locks)
…\9f85d0db-…\HANDOFF-wingside-tour-detail-hifi-to-repo.md  ← file này (implement)
…\9f85d0db-…\assets\hifi\                             ← logo + ảnh tham chiếu
…\9f85d0db-…\compare-live-hifi.mjs                    ← optional token compare
```

### B) Open Design AUDIT / LO-FI — SOURCE OF TRUTH IA wireframe

| Field | Value |
|-------|-------|
| **Project id** | `12ecfacb-505b-4c08-aa0c-eb417e22917e` |
| **Root** | `C:\Users\VIETD\AppData\Roaming\Open Design\namespaces\release-stable-win\data\projects\12ecfacb-505b-4c08-aa0c-eb417e22917e\` |

```
…\12ecfacb-…\wingside-tour-detail-wireframe-brutalist.html   ← IA + P0/P1/P2 annotation
…\12ecfacb-…\output\wingsside-tour-detail.html              ← snapshot live AS-IS
…\12ecfacb-…\output\wingsgo-tour-detail.html                ← pattern conversion only
```

Wireframe **brutalist** = annotation only — **không** port paper/red hazard vào production.

### C) Repo production — TARGET implement

| Field | Value |
|-------|-------|
| **Repo root** | `E:\repo\WingsTravel` |
| **App** | `E:\repo\WingsTravel\app\` |
| **Stack** | Next.js App Router + Payload CMS · multi-site |
| **Agent rules** | `E:\repo\WingsTravel\AGENTS.md` |
| **Harness** | `E:\repo\WingsTravel\docs\HARNESS.md`, `scripts/harness.ps1` |

**File code chính (tour detail):**

| Path | Vai trò |
|------|---------|
| `app\src\tours\StructuredPages.tsx` | `TourDetailPage`, hero, facts, itinerary, services, sticky CTA, related… |
| `app\src\tours\sectionRegistry.ts` | `defaultTourSectionOrder` / visibility |
| `app\src\tours\queries.ts` | `getResolvedTourDetailBySlug`, `isWingsGoSite` |
| `app\src\tours\utils.ts` | paths, inquiry intents, price format |
| `app\src\tours\types.ts` | view models / `TourSectionID` |
| `app\src\app\(frontend)\[...slug]\page.tsx` | `resolveStructuredTourPage` — **hiện chỉ WingsGo** |
| `app\src\utilities\siteTheme.ts` | inject `--site-brand`, `--site-accent`, … |
| `app\src\app\(frontend)\globals.css` | preset CSS (`retail`, `editorial`, `wings-side-editorial`) |
| `app\src\utilities\headerPrimaryActions.ts` | Wingside header CTA = “Plan your trip” |
| `app\src\Header\Nav\index.tsx` | `isWingsSide` chrome |

**Docs product / stories liên quan:**

```
E:\repo\WingsTravel\docs\product\tour-product-platform.md
E:\repo\WingsTravel\docs\product\tour-detail-builder-foundation.md
E:\repo\WingsTravel\docs\stories\epics\E07-tour-product-platform\US-024-tour-detail-builder.md
E:\repo\WingsTravel\docs\stories\epics\E07-tour-product-platform\US-037-dense-retail-tour-detail-ux.md
E:\repo\WingsTravel\docs\stories\epics\E07-tour-product-platform\US-044-wingsside-doicanhviet-import\
```

**Audit snapshot cũ (WingsGo-centric — chỉ tham chiếu):**

```
E:\repo\WingsTravel\output\ui-audit-tour-detail-top.md
E:\repo\WingsTravel\output\ui-audit-tour-detail-structure.json
```

---

## 3. Việc ĐÃ LÀM (Open Design) — không lặp

### Funnel hi-fi 8 pages (project A) — DONE

Home · Plan your trip · Destinations · Styles · Packages · Travel guide · About · Contact  
→ `wingside-hifi-fix-8pages.html` — **token + header + button voice** phải khớp khi port tour detail.

### Tour detail hi-fi single page — DONE + iterate

File: `wingside-tour-detail-hifi.html`

| Hạng mục | Status |
|----------|--------|
| Token **Book gold** + Plus Jakarta (match 8 pages) | ✅ |
| Header glass, nav 8 routes, Plan trip gold | ✅ |
| Hero **Split A** + route chips (≤5) | ✅ |
| Desktop **decision rail** sticky + dual CTA | ✅ |
| Jump nav + decision facts | ✅ |
| Gallery + day captions | ✅ |
| Overview legs | ✅ |
| Itinerary 6 days + meal chips **B / L / D** | ✅ |
| Accordion collapse/expand (teaser khi đóng, full khi mở) | ✅ |
| Include \| Exclude 2 cột + peak note tách | ✅ |
| Season / price honesty (`From [USD · TBD]` / on request · 24h) | ✅ |
| Enquire form 4 field + success | ✅ |
| Related journeys (no fake reviews) | ✅ |
| Mobile sticky: title + price posture + Consult | ✅ |
| Pulse nhẹ CTA gold + `prefers-reduced-motion` | ✅ |

### Chưa làm ở Open Design (không block implement repo)

- Merge tour detail vào multi-page 8pages  
- Copy VI full trong artifact HTML  
- Accordion single-open / all-collapsed default  
- Giá USD số thật (chờ sales)

---

## 4. AS-IS trong repo (agent phải audit trước khi code)

### 4.1 Gate route — **WingsGo only hôm nay**

Trong `app\src\app\(frontend)\[...slug]\page.tsx` → `resolveStructuredTourPage`:

```ts
if (!(await isWingsGoSite())) {
  return null
}
```

`isWingsGoSite()` (`queries.ts`) chỉ bật retail tour structured cho site code WingsGo.

**Hệ quả:** structured `TourDetailPage` **chưa** serve Wingside (`wings-side`). Tour Wingside hiện có thể rơi về CMS page layout hoặc 404/content khác — agent **phải** xác nhận live/local trước khi refactor UI.

### 4.2 Renderer dùng chung — retail-biased

`TourDetailPage` + sections trong `StructuredPages.tsx` được thiết kế cho **dense retail** (US-037):

- Primary CTA mặc định **`hold-seat` / “Giữ chỗ”**
- Khối **departures**, availability badge, “khởi hành gần nhất”, giá `formatTourPrice`
- Copy VI-heavy trong labels section
- Sticky bottom booking CTA
- Reviews / FAQ sections trong default order

**Wingside hi-fi** là **private consultative** — khác semantics:

| Surface | WingsGo (giữ) | Wingside hi-fi (target) |
|---------|---------------|-------------------------|
| Primary CTA | Giữ chỗ / hold-seat | **Request consultation / Consult** (gold) |
| Secondary | Lịch / inquiry | **Contact us** (ghost) |
| Price | Giá từ + departure | **Price on request · reply 24h** / `From [USD · TBD]` |
| Seats | Availability badge | **Không** show seats / scarcity |
| Departures module | Core commerce | Ẩn hoặc thay **season/price posture** nếu không có inventory private |
| Sticky | Sticky booking | Title + on request + Consult |
| Layout | Single column + sticky bottom | Optional **desktop decision rail** (hi-fi) |
| Itinerary | Cards full always-open | **Accordion** teaser / expand (hi-fi) |

### 4.3 Section registry hiện tại

`sectionRegistry.ts` default order:

```
hero → facts → reviews → why-choose → route → itinerary → services → departures → faq → related → sticky-cta
```

Hi-fi IA map gợi ý (Wingside):

```
hero (split + dual CTA)
→ jump nav
→ facts (decision)
→ gallery (có thể map media từ hero/route/itinerary — không invent)
→ overview/route
→ itinerary accordion
→ services = Include|Exclude
→ dates/price posture (thay departures retail nếu private)
→ enquire (form/contact intent — map inquiry path)
→ related
→ sticky-cta (Wingside semantics)
```

Reviews / FAQ: **chỉ render khi có content CMS thật** — không invent (hi-fi P2 trust = offline).

### 4.4 Theme tokens production

Inject qua `siteTheme.ts`:

- `--site-brand`, `--site-accent`, `--site-surface`, `--site-radius`, …

Hi-fi Book gold (Open Design lock) — **map**, không hardcode full palette nếu CMS đã set branding:

| Hi-fi token | Ý nghĩa | Map production |
|-------------|---------|----------------|
| `--cta` / warm gold | Primary conversion | Prefer **CTA gold** (`#B87A14`-class / CMS accent) — **không** chỉ dùng brand blue cho primary book |
| `--brand` `#005090` | Nav / links / structure | `--site-brand` |
| `--accent` wing green | Eyebrow | `--site-accent` hoặc accent CMS |
| `--warm-ink` | Price ink | accent/warm derivative |
| Radius ~1.25rem | Cards | `--site-radius` / existing rounded-[24–28px] ok nếu khớp funnel |
| Font hi-fi Jakarta | Funnel OD | Production có thể Geist/Playfair theo preset — **ưu tiên khớp live Wingside branding**; đừng ép Jakarta nếu site theme khác, nhưng **CTA/button semantics** vẫn Book gold |

Live CSS vars (đối chiếu):  
`--site-brand: #005090` · gold CTA `#B87A14` · accent `#104030` · bg `#F3F6F9` · surface `#FFF` · fg `#1B2430`

### 4.5 Inquiry intents đã có

`utils.ts` — `TourInquiryIntent = 'hold-seat' | 'inquiry' | 'request-quote' | 'contact'`

Wingside primary nên dùng **`inquiry` / `request-quote` / `contact`**, **không** default `hold-seat`.  
Source tags: `tour-detail-hero`, `tour-detail-sticky`, … giữ contract prefill.

---

## 5. Việc CẦN LÀM trong repo (ordered)

### Phase 0 — Audit (bắt buộc, không skip)

1. Đọc handoff này + `HANDOFF-wingside-tour-detail-hifi.md` (design locks §7–§8).  
2. Mở `wingside-tour-detail-hifi.html` + skim 8 pages tokens/buttons.  
3. Đọc `StructuredPages.tsx` (`TourDetailPage`, hero, itinerary, services, sticky).  
4. Xác nhận route Wingside local/prod: structured tour có enable chưa? CMS page hay `TourDetailPage`?  
5. Xác nhận site code / `themeKey === 'wings-side'` helpers sẵn có (`isWingsGoSite` pattern).  
6. **Không** đổi WingsGo paths/behavior trong cùng PR nếu không test regression.

### Phase 1 — Enable structured tour cho Wingside (nếu còn gate)

- Mở rộng `resolveStructuredTourPage` (hoặc helper mới) cho **wings-side** mà **không** bật nhầm market/schedule retail nếu product không dùng.  
- Có thể: `isTourPlatformSite()` = WingsGo **hoặc** Wingside; sau đó branch UI theo theme.  
- Tenant/query: đảm bảo `getResolvedTourDetailBySlug` filter đúng site/tour products Wingside.  
- Smoke: `/wingsside/tour/<slug>` render `TourDetailPage`.

### Phase 2 — Site-aware UX (core implement)

Ưu tiên **branch theo themeKey / site**, reuse components, tránh fork file 2000 dòng nếu có thể:

1. **CTA semantics (P0)**  
   - Wingside primary: gold **Consult / Request consultation** → inquiry intent  
   - Secondary: ghost **Contact us**  
   - **Không** dual CTA cùng weight / cùng copy  
   - Header site đã có “Plan your trip” — giữ consistency

2. **Price honesty (P0)**  
   - Không có giá CMS → `Price on request · reply within 24h` / `On request · 24h`  
   - Có giá → format thật; **không** invent USD  
   - Copy: *Sales confirms final price before any hold* (EN/VI đúng locale)  
   - **Không** seat countdown / “only 2 left”

3. **Hero Split A (P0)**  
   - Ảnh | body surface + dual CTA  
   - Route = **4–5 short chips** (không dump day titles)  
   - Match hi-fi hierarchy; dùng CSS vars site

4. **Decision rail desktop + mobile sticky (P0)**  
   - Desktop: sticky rail price posture + dual CTA + bullets  
   - Mobile: sticky title + posture + Consult; `scroll-margin` itinerary vs sticky  
   - Touch ≥ 44px

5. **Jump nav + facts (P1)**  
   - Labels EN/VI theo locale; id section ổn định  
   - Facts từ CMS `factSummary` — filter empty / unusable text (đã có hygiene helpers)

6. **Include | Exclude 2 cột (P0)**  
   - `TourServicesSection` đã có includes/excludes — polish layout 2 cột + peak note **tách** khỏi Included nếu field có

7. **Itinerary accordion (P1 — match hi-fi)**  
   - Collapsed: Day · title · teaser · meal chips B/L/D · chevron  
   - Expanded: full summary + gallery (desktop)  
   - Default: Day 1 open, multi-open (trừ product đổi)  
   - `aria-expanded` / `aria-controls` / reduced-motion

8. **Departures module**  
   - Wingside private: **ẩn** nếu không có departures / bcfg; hoặc thay season cards  
   - WingsGo: **giữ nguyên** retail

9. **Related**  
   - Cards thật từ data; **no fake ratings/stars**

10. **Motion**  
    - Pulse **nhẹ** primary gold only; honor `prefers-reduced-motion`

### Phase 3 — Verify

- Visual QA desktop + mobile (agent-browser ưu tiên per AGENTS.md)  
- WingsGo tour detail regression smoke  
- Wingside: dual CTA, no hold-seat primary, no fake seats  
- Links nội bộ prefix site đúng (`/wingsside/…`)  
- a11y: focus-visible, contrast gold CTA + white text  
- Build/typecheck theo workflow repo (`pnpm` trong `app/`)

---

## 6. IA hi-fi đã ship (target UX)

```
[site-header — glass; Plan trip gold]
[breadcrumb]
[hero Split A — image | title · duration · dest · route CHIPS · dual CTA]
[page-layout]
  [main]
    [jump nav sticky]
    [decision facts]
    [gallery]
    [overview / route]
    [itinerary accordion]
    [Included | Excluded]
    [Dates & price posture — no seats]
    [Enquire / contact]
    [Related]
  [decision-rail desktop]
[footer]
[mobile sticky Consult]
```

### Accordion locked behavior (hi-fi)

| State | UI |
|-------|-----|
| Closed | Day · title · 1-line teaser · B/L/D · chevron |
| Open | Full copy + day image (desktop) |
| Default | Day 1 open; multi-open |
| A11y | aria-expanded / controls / hidden panel |
| Mobile | tighter gap; hide day-shot ≤1024; scroll-margin |

---

## 7. LOCKED user requirements (dễ bị “cải thiện” mất)

Agent implement **phải giữ** — đã chốt trên home/funnel/tour hi-fi sessions:

1. **Book gold direction** — CTA solid gold; brand blue cho nav/structure; wing green eyebrow; warm cho price ink/badges  
2. **Hero layout A — Split** — không full-bleed clutter  
3. **Motion urgency nhẹ** — pulse gold only  
4. **Ảnh** — CMS/media local; subtle/faded bg ok; không hot-link linh tinh  
5. **Conversion honesty** — no invented stats/reviews/seats; missing price → on request / TBD label  
6. **Dual CTA** — Consult (primary) + Contact (secondary)  
7. **A11y** — 44px, focus-visible, AA trên gold CTA  
8. **Anti-slop** — no purple gradients, no emoji icons, no left-border accent cards, no fake metrics  
9. **URL** — `/wingsside/` (2 s)  
10. **Brand string** — **Wingside** (không chaos Wing Side / WingsSide / WingsGroup trên surface này)  
11. **Edit discipline** — touch only named scope; không invent content “cho đẹp”  
12. **Quy trình repo** — audit context → small diffs → build/visual QA (user preference)  
13. **Không phá WingsGo** — retail dense detail (US-037) vẫn đúng trên site Go  
14. **Payload-first** — content từ tour-products / CMS; không hardcode itinerary 6 ngày demo vào production trừ seed/import có thật

---

## 8. Content constraints (tour mẫu hi-fi — reference only)

**Title:** Best of Northern Vietnam: Hanoi, Sapa & Halong  
**Duration:** 6 days / 5 nights  
**Route chips:** Hanoi · Ninh Binh · Sapa · Fansipan · Halong  

| Day | Title (collapsed) |
|-----|-------------------|
| 01 | Hanoi arrival · evening food tour |
| 02 | Hanoi half-day city · transfer to Sapa |
| 03 | Trekking ethnic villages · Y Linh Ho · Lao Chai · Ta Van |
| 04 | Fansipan · back to Hanoi |
| 05 | Hanoi · overnight cruise in Halong Bay |
| 06 | Disembark Halong · return to Hanoi |

Production: bind từ `tour.itineraryDays` / includes / excludes CMS.  
Form fields spirit: Name · Email/WhatsApp · Travel dates · Notes + tour context — map inquiry path/prefill, không bịa lead backend.

---

## 9. Mapping hi-fi → code (cheat sheet)

| Hi-fi block | Repo surface | Notes |
|-------------|--------------|-------|
| Hero Split A | `TourDecisionHeader` | Branch layout + CTA + chips |
| Decision rail | new aside **or** sticky panel variant | Desktop only; Wingside |
| Jump nav | existing sticky nav in `TourDetailPage` | Relabel; hide empty sections |
| Facts | `TourFactGrid` | Keep hygiene filters |
| Gallery | media from tour/days | Optional section if data |
| Overview | `TourRouteVisualSection` / summary | |
| Itinerary accordion | `TourItinerarySection` | Collapsible + meals B/L/D |
| Include/Exclude | `TourServicesSection` | 2-col + peak note |
| Dates/price | replace/hide `TourDepartureSection` for private | |
| Enquire | inquiry links / contact page | intent ≠ hold-seat |
| Related | `TourRelatedSection` | no fake stars |
| Mobile sticky | `StickyBookingCTASection` | Wingside copy + gold |

---

## 10. Out of scope (trừ user explicit)

- Redesign Open Design HTML  
- Rebuild 8 pages funnel trong repo  
- Invent USD band / seats / reviews  
- Drag-drop tour builder admin  
- Copy toàn bộ hi-fi Plus Jakarta nếu branding live khác (semantics CTA vẫn Book gold)  
- Plane sync trừ khi story status đổi (theo AGENTS.md)

---

## 11. Checklist verification (implement)

- [ ] Structured tour detail serve được trên **`/wingsside/tour/<slug>`**  
- [ ] Primary CTA = Consult/inquiry gold; **không** hold-seat default trên Wingside  
- [ ] Secondary = Contact ghost  
- [ ] Price posture honesty khi thiếu giá  
- [ ] Hero split + ≤5 route chips  
- [ ] Included \| Excluded side-by-side  
- [ ] Desktop rail hoặc equivalent decision panel  
- [ ] Mobile sticky không đè content; itinerary scroll-margin ok  
- [ ] Itinerary accordion a11y + reduced-motion  
- [ ] No invented reviews/seats/scarcity  
- [ ] WingsGo tour detail regression OK  
- [ ] Token/button voice khớp funnel Wingside (gold primary)  
- [ ] Locale EN/VI không hardcode nhầm  
- [ ] Typecheck/lint/build theo chuẩn repo  

---

## 12. Quy trình session mới (bắt buộc)

1. `cd E:\repo\WingsTravel` — đọc `AGENTS.md`, handoff này, design handoff.  
2. Audit code paths §2C + confirm route gate §4.1.  
3. Plan ngắn (imperative steps) — site-aware branch trước, visual polish sau.  
4. Implement small PR-sized diffs; reuse `getTourInquiryPath`, Media, SiteLink.  
5. Visual QA agent-browser trên Wingside tour + smoke WingsGo.  
6. Không claim done nếu checklist §11 fail.  
7. Không ghi đè artifact Open Design trừ khi user yêu cầu sync ngược.

---

## 13. Bản file handoff

| Location | Role |
|----------|------|
| **Canonical Open Design** | `C:\Users\VIETD\AppData\Roaming\Open Design\namespaces\release-stable-win\data\projects\9f85d0db-9ebc-409a-b580-5b401e4a10b8\HANDOFF-wingside-tour-detail-hifi-to-repo.md` |
| **Repo copy (attach session implement)** | `E:\repo\WingsTravel\docs\HANDOFF-wingside-tour-detail-hifi-to-repo.md` |
| Design-only handoff (visual/IA lock) | `…\9f85d0db-…\HANDOFF-wingside-tour-detail-hifi.md` |

Khi hai bản lệch: **ưu tiên canonical Open Design ngày mới hơn**, rồi sync lại vào `docs/` repo.

---

*End of implement handoff. Agent: bám §7 + đừng phá WingsGo. Visual SOURCED từ `wingside-tour-detail-hifi.html`.*
