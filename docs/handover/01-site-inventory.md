# Site Inventory

## Purpose

List every delivered site or child site included in the handover package.

## Inventory Table

| Site | Domain | Locale(s) | Status | Key pages | Notes |
| --- | --- | --- | --- | --- | --- |
| WingsGroup | `wingsgroup.vn` | `vi`, `en` | Active umbrella site | `/`, `/he-sinh-thai`, `/ve-wingsgroup`, `/nang-luc-dich-vu`, `/tin-tuc`, `/lien-he` | Umbrella site with production-facing trust, ecosystem routing, legal pages, and editorial package. |
| WingsGo | `wingsgo.vn` | `vi`, `en` | Active child site | `/wingsgo`, `/wingsgo/thi-truong`, `/wingsgo/tour`, `/wingsgo/campaign`, `/wingsgo/lich-khoi-hanh`, `/wingsgo/lien-he` | Outbound retail site with market, tour detail, campaign, schedule, and contact flows. |
| WingsSide | `wingsside.vn` | `en`, `vi` | Active child site | `/wingsside`, `/wingsside/destinations`, `/wingsside/styles`, `/wingsside/packages`, `/wingsside/plan-your-trip`, `/wingsside/contact-us` | Inbound Vietnam site with destination, travel-style, itinerary, and trip-planning flows. |
| WingsPlus | `wingsplus.vn` | `vi`, `en` | Active child site | `/wingsplus`, `/wingsplus/private-tours`, `/wingsplus/mice`, `/wingsplus/special-markets`, `/wingsplus/nang-luc-dich-vu`, `/wingsplus/request-proposal` | Premium/private/MICE site. Legacy `/wingsplus/case-studies` redirects to `/wingsplus/nang-luc-dich-vu`. |
| WingsCare | `wingscare.vn` | `vi`, `en` | Active child site | `/wingscare`, `/wingscare/san-pham-bao-hiem`, `/wingscare/quyen-loi`, `/wingscare/claim-support`, `/wingscare/faq`, `/wingscare/contact` | Care, support, insurance-oriented information, and contact flows. |
| WingsPass | `wingspass.vn` | `vi`, `en` | Active child site | `/wingspass`, `/wingspass/bang-gia`, `/wingspass/san-bay`, `/wingspass/add-on`, `/wingspass/faq`, `/wingspass/contact` | Fast Track pricing, airport, add-on, FAQ, and booking contact flows. |

## Required Check For Each Site

- Public domain or local launch path confirmed
- Branding confirmed
- Core pages filled with approved copy
- Core pages filled with approved images
- Navigation and footer confirmed
- SEO defaults confirmed

## Content Status Rule

The implementation provides a CMS-editable sample structure and placeholder
copy/images for launch validation. A site is not customer-launch complete until
the customer approves final copy and imagery for its required pages.

## Link Review Tool

Generate a current tree of all published pages and posts from the local SQLite
CMS database:

```powershell
cd app
pnpm exec tsx scripts/generate-site-link-review.ts
```

Open `app/output/site-link-review.html`.

The standalone review tool provides:

- a site/page/post tree
- URL search and filtering
- an iframe preview of the selected public URL
- open-in-new-tab, copy URL, and reload actions

The preview expects the local frontend to be running at
`http://localhost:3000`.
