# Tour Editorial Operations

## Purpose

This document explains how editors should work with the structured `WingsGo`
tour platform in CMS admin.

## Create Or Update A Tour

1. Open `Tour Products`
2. Update the base content:
   - summary
   - highlights
   - review snapshot
   - route visual
   - itinerary days
   - services summary
   - FAQ
3. Set section visibility and section order only if the default dense retail
   layout is not enough

## Add Sellable Departures

1. Open `Tour Departures`
2. Create one row per departure
3. Fill:
   - departure / return date
   - departure city
   - airline
   - price
   - availability
   - urgency / promo / hold notes
4. Mark `isFeatured` for rows that should surface earlier on schedule pages

## Add A Variant

Use `Departure Variants` only when the tour is mostly the same but needs
bounded overrides.

Typical reasons:

- Hanoi vs HCMC departure framing
- airline-led sales line
- seasonal itinerary wording changes

Do not create a variant just to change one price row.

## Preview And QA

Preview the result on:

- `/wingsgo/tour/<slug>`
- `/wingsgo/thi-truong/<market>`
- `/wingsgo/campaign/<slug>`
- `/wingsgo/lich-khoi-hanh`

Check:

- next departure is future-only
- route visual is populated
- itinerary day cards show the right media and notes
- departure rows carry the right CTA and urgency tone
