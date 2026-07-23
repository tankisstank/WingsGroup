# AUDIT RESULT — US-046 Wingside tour-detail (local)

**Ngày audit:** 2026-07-21  
**Checklist nguồn:** `docs/HANDOFF-AUDIT-US046-local-test.md`  
**Worktree:** `E:\repo\WingsTravel-us046-hifi` @ `66514d4`  
**Port:** `http://127.0.0.1:3010`  
**Verdict:** **REQUEST_CHANGES**

## Completeness vs checklist

| Hạng mục yêu cầu | Trạng thái audit |
|------------------|------------------|
| Environment / commit / port | DONE |
| URL smoke Wingside home + en + tour | DONE |
| URL sai spelling `/wingside/` → 404 | DONE |
| WingsGo home + tour retail regression | DONE |
| Product locks 1–8 (matrix) | DONE |
| Code surfaces WingSideTourDetailPage + viewModel | DONE |
| agent-browser snapshot + console | DONE (Windows Start-Process path) |
| Output format Summary → Verdict | DONE |
| Optional second Wingside tour slug | SKIP (optional) |
| Full unit/e2e suite run | SKIP (noted residual risk) |
| Mobile viewport dedicated pass | PARTIAL (responsive + sticky observed; không matrix 360px riêng) |
| Uncommitted WIP Header/WingsSideHiFi note | PARTIAL (không catalog dirty files) |
| Funnel 8 pages / Home promo P2 | OUT OF SCOPE (checklist tour-detail US-046, không yêu cầu) |

---
## Summary

Audit **US-046 Wingside tour-detail** trên worktree `E:\repo\WingsTravel-us046-hifi` (port **3010**). Routing và tách site đúng: Wingside dùng `WingSideTourDetailPage`; WingsGo vẫn `presentation="retail"` với **Giữ chỗ**. Console tour page sạch.

**Fail product locks:** Dual CTA (secondary Contact ghost) và copy **Price on request · 24h**. Primary consult gold + no hold-seat + no fake price/reviews thì ổn. Hi-fi còn thiếu jump nav / decision rail / itinerary accordion.

---

## Environment verified (URL, commit, port)

| Item | Value |
|------|--------|
| Worktree | `E:\repo\WingsTravel-us046-hifi` |
| Branch | `feature/us-046-wingsside-hifi-tour-detail` |
| HEAD | `66514d4` — `merge(master): integrate consultative tour detail into US-046 UI branch` |
| Port | `http://127.0.0.1:3010` |
| Tooling | PowerShell `Invoke-WebRequest` + `agent-browser` (binary path đầy đủ; **không** pipe `.exe` qua pipeline — đó là nguồn lỗi launch) |

| URL | Status |
|-----|--------|
| `/wingsside/` | **200** |
| `/wingsside/en` | **200** |
| `/wingsside/tour/best-of-northern-vietnam-hanoi-ninh-binh-sapa-halong-6-days` | **200** |
| `/wingside/` (sai spelling) | **404** |
| `/wingsgo/` | **200** |
| `/wingsgo/tour/seoul-jeju-nami-camellia-hill-6n5d` | **200**, `data-tour-presentation="retail"` |

Markers live Wingside tour: `data-site-code="wings-side"`, class `wingsside-tour-detail`, H1 tour title, 3× link **Request consultation**.

---

## Pass / Fail matrix

| Check | Result | Evidence |
|-------|--------|----------|
| Home Wingside loads; header CTA gold direction | **PASS** | 200; title `WingsSide \| Tailor-made…`; header CTA **Plan trip** / “Plan your trip” present on home |
| Tour detail 200; `WingSideTourDetailPage` not CMS dump | **PASS** | `wingsside-tour-detail` + hero/gallery/itinerary/includes; route in `page.tsx` `site.code === 'wings-side'` |
| No huge empty gap breadcrumb ↔ first panel | **PASS** (HTML/a11y) | Breadcrumb nav + hero H1 contiguous in snapshot; no large spacer markers |
| Dual CTA gold + ghost Contact | **FAIL** | Primary gold OK; hero “Contact us” là **`<span>`** không click; sticky chỉ 1 CTA gold; footer Contact bare `/contact-us` không ghost pair |
| Contact intents / path `/contact-us` not `/lien-he` | **PASS*** | `…/contact-us?tour=…&tourId=491&source=tour-detail` — *không có `intent=inquiry`* (nit vs StructuredPages helpers) |
| No hold-seat / “Giữ chỗ” primary on Wingside | **PASS** | HTML + eval: `giuCho=false`, `hold=false` |
| Price honesty when no CMS price | **PARTIAL FAIL** | Không invent USD; posture = “Contact us / Flexible departure”, **không** “Price on request · 24h” (helper `getTourPricePosture` có sẵn nhưng **không** dùng ở page này) |
| No invented reviews/stars/stats | **PASS** | “star/review” chỉ false-positive (`start`, `preview`) |
| Include\|Exclude honest | **PASS** | Includes từ CMS (kể cả “International flights…”); không section Not included khi empty (không invent exclude) |
| Itinerary accordion a11y / no defaultOpen warn | **N/A → gap** | Tất cả day cards luôn mở; không accordion → không defaultOpen warning |
| Jump nav ≥44px / decision rail | **FAIL (hi-fi)** | Snapshot Wingside: không jump nav / rail; sticky bottom chỉ title + 1 CTA |
| Locale EN/VI path | **PASS (smoke)** | `/wingsside/en` 200; copy EN on sample tour |
| Console clean | **PASS** | agent-browser console: React DevTools info + `[HMR] connected` only |
| URL prefix `/wingsside/` (2 s) | **PASS** | wrong `/wingside/` 404 |
| Brand / Book gold CTA | **PASS*** | Gold CTAs; brand string UI = **WingsSide** (casing) |
| A11y primary ≥44px; focus/reduced-motion CSS | **PASS** | Primary `min-h-12`; globals có `focus-visible` + `prefers-reduced-motion` cho wings-side CTA |
| WingsGo retail intact (US-037) | **PASS** | `presentation=retail`, jump nav “Mục lục tour”, **Giữ chỗ** links, no “Request consultation” |

\* = pass with nit.

---

## Issues

### Issue 1 — Severity: **bug** (product lock)
- **Surface:** `WingSideTourDetailPage.tsx` hero (~L119–126) + sticky aside (~L293–300); live tour URL
- **Evidence:** a11y tree chỉ 3× `Request consultation`; DOM:  
  `span.font-semibold.text-[var(--site-wine)]` = “Contact us” (không phải link); sticky: title + “Contact us” text + 1 gold link only
- **Expected:** Dual CTA — Primary gold Consult + Secondary **ghost Contact** (clickable)
- **Actual:** Single primary; secondary không phải CTA
- **Suggested fix:** Thêm secondary `SiteLink` ghost (`border` / outline) tới `/contact-us` (có thể `intent=contact`); pair trong hero + sticky mobile

### Issue 2 — Severity: **bug** (product lock wording)
- **Surface:** `wingsSideTourViewModel.ts` `priceState.kind === 'contact'` + page copy; contrast `utils.ts` `getTourPricePosture`
- **Evidence:** eval `priceOnRequest=false`, `onRequest24=false`; UI “Contact us” / “Price and departure timing are confirmed…”
- **Expected:** Missing price → **Price on request · reply within 24h** (không invent USD)
- **Actual:** Honest no-price, nhưng copy không khớp lock / shared helper
- **Suggested fix:** Reuse `getTourPricePosture` (hoặc copy tương đương) trên hero/sticky/price panel

### Issue 3 — Severity: **suggestion** (hi-fi parity)
- **Surface:** `WingSideTourDetailPage.tsx` vs hi-fi handoff (jump nav, decision rail, accordion)
- **Evidence:** Snapshot: regions gallery/overview/itinerary/included only; 6 day headings luôn visible; WingsGo *có* jump nav
- **Expected (hi-fi):** Jump nav sticky, desktop decision rail, Day 1 open / multi-open accordion
- **Actual:** Single-column editorial stack + bottom sticky
- **Suggested fix:** Port pattern từ `StructuredPages` consultative **hoặc** hi-fi HTML — không regress WingsGo

### Issue 4 — Severity: **nit**
- **Surface:** CTA query string `buildWingSideTourCTA`
- **Evidence:** href có `tour`, `tourId`, `source` — **không** `intent=inquiry` (unit `tourDetailBuilder` expect intent trên consultative path khác)
- **Suggested fix:** Align intent query với `resolveConsultativeCtaHref` / inquiry builder

### Issue 5 — Severity: **nit**
- **Surface:** Header brand string / CTA label
- **Evidence:** Snapshot `WingsSide`, header link “Plan trip” (home HTML cũng có “Plan your trip”)
- **Suggested fix:** Chuẩn hóa **Wingside** + label **Plan your trip** nếu brand lock bắt buộc

---

## Residual risks

1. **Architecture split:** Wingside = dedicated page; master consultative helpers ở `StructuredPages` — dễ drift (CTA, price posture, jump nav).
2. **agent-browser trên Windows:** `Start-Process` + redirect OK; `& exe | Out-String` / pipe có thể fail (0x800700e8 / “Cannot run a document in the middle of a pipeline”). `open -Wait` giữ process cho đến khi browser đóng.
3. **Visual gap vs Open Design hi-fi** vẫn lớn dù product core (consultative, no retail scarcity) đúng hướng.
4. **Chưa chạy full unit/e2e suite** trong session này (chỉ code + live HTTP + browser snapshot).
5. `git`/`node`/`curl` không có trong PATH shell agent — verify commit qua `.git/refs` + files.

---

## Verdict: **REQUEST_CHANGES**

**Lý do fail cứng:** product lock **Dual CTA** và **Price on request / 24h** chưa đạt trên `WingSideTourDetailPage` live.

**Được approve sau khi:**
1. Secondary ghost **Contact us** (hero + sticky)  
2. Missing price → **On request · 24h** (không invent USD — đã gần đúng)  
3. (Nên) `intent` trên primary CTA  

WingsGo retail **không regress** — không block merge vì WingsGo.

---

### Ghi chú tool (vì bạn hỏi lỗi launch)

Trên shell này gọi đúng như sau:

```powershell
$ab = 'C:\Users\VIETD\AppData\Roaming\npm\node_modules\agent-browser\bin\agent-browser-win32-x64.exe'
Start-Process -FilePath $ab -ArgumentList @('open','http://127.0.0.1:3010/wingsside/...') `
  -Wait -PassThru -NoNewWindow `
  -RedirectStandardOutput '...\out.txt' -RedirectStandardError '...\err.txt'
# snapshot / console / get attr tương tự — KHÔNG pipe .exe qua | 
```

HTTP smoke: `Invoke-WebRequest -Uri ... -UseBasicParsing` (không dùng `curl` alias nếu PATH thiếu).
