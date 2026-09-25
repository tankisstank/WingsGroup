# Tour Editorial Operations

## Purpose

This document is the operating contract for creating, editing, previewing and
publishing structured WingsGo tours in Payload CMS. A tour is assembled from
three related records:

- `TourProduct`: the source for title, content, gallery, itinerary and SEO.
- `Page` wrapper: the route shell at `/tour/<slug>`.
- `TourDeparture`: one sellable departure date, price and availability row.

The wrapper and departure records remain separate so that one tour can have
many dates and the route can be repaired without copying tour content.

## Create A Tour

1. Open `Tour Products` and choose `Create`.
2. Choose the site. A single assigned site is prefilled; multiple sites require
   an explicit choice. An existing tour keeps its site fixed in this screen.
3. Enter the core fields: title, market, duration days/nights and sales
   summary. Add tour code, destination tags, travel styles and an overview
   price when applicable. WingsGo hides the WingSide-only tour type control.
4. Enter the tour slug. The field lowercases the value while typing and the
   server normalizes it again before saving. The expected route is
   `/tour/<slug>`.
5. In `Tổng quan`, select hero media, gallery images and selling highlights.
   Gallery shows thumbnails, filename/alt text and Media ID. Removing an item
   removes only the relationship; it does not delete the Media record.
6. In `Lịch trình`, add the required day rows and save the tour. Add a PDF only
   from same-site Media; the file must be a PDF.
7. Complete service, FAQ, CTA and SEO fields as needed. Localized fields must
   be completed for each enabled locale.
8. Save the TourProduct as a draft before using authoring actions.

## Enter The Full Itinerary

`itineraryDays` is a required array. Each day has:

- required `dayNumber`, localized `title` and localized `summary`;
- optional route/cities, meals, transport and accommodation;
- optional notes, day theme, selling highlight, sleeping standard and equipment
  note;
- optional day image and day gallery.

When Payload validation blocks Save, the admin navigator opens the `Lịch trình`
tab, focuses the first invalid field and scrolls it into view. Itinerary content
is tour content; it is separate from the departure rows that hold dates and
prices.

## Create The Tour Wrapper

After the TourProduct has an ID, open `Lịch bay & xuất bản`.

The panel shows the expected URL, current wrapper ID/path/status/site and
wrapper health:

- `valid`: same site, exact `/tour/<slug>` path and one correct link;
- `invalid_path` or `invalid_site`: the current wrapper needs repair;
- `orphan`: a same-site page is not linked to a tour;
- `shared`: more than one tour points to the page.

Use `Tạo wrapper bản nháp` when no valid wrapper exists. The action reuses a
valid same-site wrapper, or creates a draft from the `tour-conversion` preset
under the existing `/tour` hub. It does not publish the Page and it refuses an
occupied path instead of taking over another page.

Use `Gán wrapper này` only for a candidate with the same site and expected path.
The relink is checked in a PostgreSQL transaction and does not publish the tour.

## Add Sellable Departures

After the TourProduct is saved, use `Ngày khởi hành & giá` and click `Thêm lịch`.
Quick-add captures:

- departure date;
- departure city;
- airline;
- price and currency (`VND` or `USD`);
- availability (`open`, `limited`, or `sold-out`);
- optional verification and verification expiry.

`Lưu & thêm tiếp` keeps the form open for another date. `Lưu & hoàn tất` closes
it. Every row is saved to `TourDepartures` as a draft and can later be edited or
deleted. Flight number, return date, original price, loyalty points and other
advanced fields are available from the full `Tour Departures` editor.

Freshness is shown per row as current, needs verification or expired. An expired
verification window can make public output fall back to `Liên hệ tư vấn` while
the departure record remains available for re-verification.

## Preview The Saved Draft

Use `Xem preview bản nháp` only after saving the TourProduct and linking a
wrapper. Preview reads persisted records for the selected site and locale using
the authenticated signed handoff. Unsaved changes are blocked with a Save
message. A tour without `wrapperPage` returns an actionable error and does not
pretend that a public route exists. Anonymous visitors continue to see the
published version until an explicit publish operation succeeds.

## Review And Publish

The readiness panel lists issues, wrapper health and all departures. Select the
departure rows that should be public, then use `Xuất bản tour`.

- Editors can create and update drafts, provision/relink wrappers and preview.
- Site Managers and Super Admins can publish within their site scope.
- Publish confirms the Product ID, wrapper ID/path and selected departure IDs.
- Product, wrapper and selected departures are published in one PostgreSQL
  transaction. A failure rolls the operation back.

If a previously public tour changes slug, publish creates one `301` from the old
public path to the new path in the same transaction. A conflicting old redirect
blocks publish for manual resolution. Draft-only slug changes do not create a
redirect.

## Update An Existing Tour

1. Open the tour from the `Tour Products` list. The site remains fixed.
2. Edit the core content, localized copy, gallery, itinerary, services or SEO.
3. Save the draft and reopen Preview to inspect the persisted revision.
4. Edit departures from the inline table or open the full `Tour Departures`
   record for advanced fields.
5. If the slug changed, inspect the URL warning, provision/relink a wrapper with
   the new path, then preview again.
6. Select the required departures and ask a Site Manager or Super Admin to
   publish.

## Add A Variant

Use `Departure Variants` only when the tour is mostly the same but needs bounded
overrides, such as Hanoi versus HCMC framing, an airline-led sales line or
seasonal itinerary wording. Do not create a variant for one price row.

## Preview And QA Checklist

Check the persisted draft and then the published route:

- expected `/tour/<slug>` path and wrapper health;
- next departure is future-only where the page requires it;
- route visual and gallery are populated;
- every itinerary day has the intended media, meals, transport and notes;
- departure rows show the correct price, availability, CTA and urgency;
- market, campaign and departure-list surfaces still use the same tour data.

The detailed implementation and remaining UAT gates are tracked in
`US-075-tour-authoring-and-preview-integrity`.
