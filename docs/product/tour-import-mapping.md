# Tour Import Mapping

## Purpose

This document records how the structured tour platform maps to common source
materials used by sales and content teams.

## Google Sheets Departure Schedule

Typical source columns map to `tour-departures`:

- departure date -> `departureDate`
- return date -> `returnDate`
- departure city -> `departureCity`
- airline -> `airline`
- price -> `priceFrom`
- promo note -> `promoLabel`
- status -> `availabilityStatus`
- sales note -> `holdNote` / `depositNote` / `changePolicyNote`

If the sheet already separates lines by origin or airline, use
`departure-variants` and link each row with `variantRef`.

## Google Docs Itinerary

Itinerary copy maps to `tour-products.itineraryDays[]`:

- day number -> `dayNumber`
- day heading -> `title`
- route / city line -> `route`
- body copy -> `summary`
- meals -> `meals`
- transport -> `transport`
- accommodation -> `accommodation`
- selling highlight -> `dayHighlight`
- operational note -> `equipmentNote` / `notes`

## Poster / Rate Card Assets

Poster or campaign assets usually map to:

- hero poster -> `heroMedia` or variant `heroMediaOverride`
- route / map poster -> `routeViz.mapImage` or variant `rvo.mapImage`
- promo language -> `promoLabel`
- featured departure -> `isFeatured`

## Editorial Defaults

If a source file is incomplete:

- keep departures structured first
- use generic route-visual fallback from stop data
- use itinerary day gallery fallback from product gallery
- do not move missing structured data into generic page blocks
