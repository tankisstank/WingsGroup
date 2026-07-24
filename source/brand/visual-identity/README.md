# WingsGroup Visual Identity References

This folder stores source brand/design references for the WingsGroup ecosystem.
These PDFs were moved from the ad-hoc workspace folder `WINGS all` on
2026-06-19.

## Purpose

- Keep customer/design source material under `source/`, the repo source of truth.
- Preserve the original PDF files exported from CorelDRAW.
- Use these files as reference for logo, font, color, and site identity work.
- Do not treat these PDFs as optimized runtime assets for the Next/Payload app.
- Keep per-site brand metadata available for Payload-first multisite work.

Runtime-ready assets should be exported separately as SVG/PNG/WebP and placed in
the appropriate app or shared asset folder only after the exact usage is known.
For each runtime site, a favicon is required and the public header should render
the real `site-settings.branding.logoImage` whenever that media asset exists.

## Per-Site Reference

Use the files below when configuring `site-settings`, theme presets, seeds, or
handover notes. The JSON file is the most structured reference for agents and
scripts; the markdown files are easier for human review.

- `site-brand-reference.json`
- `sites/wingsgroup.md`
- `sites/wingsgo.md`
- `sites/wingspass.md`
- `sites/wingsside.md`
- `sites/wingscare.md`
- `sites/wingsplus.md`

| Runtime site code | Display title | Logo source           | Required favicon | Tagline                       | Value line              | Approx colors                   |
| ----------------- | ------------- | --------------------- | ---------------- | ----------------------------- | ----------------------- | ------------------------------- |
| `wingsgroup`      | WingsGroup    | `pdf/WINGSGROUP.pdf`  | required         | Fly further. Together         | n/a                     | `#005090`, `#FDB515`            |
| `wingsgo`         | WingsGo       | `pdf/WINGS GO.pdf`    | required         | Go More. Feel More.           | GLOBAL MINDSET          | `#005090`, `#0090E0`            |
| `wingspass`       | WingsPass     | `pdf/WINGS PASS.pdf`  | required         | Your Journey. Seamless.       | EXCEPTIONAL EXPERIENCES | `#005090`, `#008070`            |
| `wing-side`       | wingside.vn   | `pdf/WINGS SIDE.pdf`  | required         | See Vietnam Differently.      | TRUST & CARE            | `#005090`, `#104030`, `#C09030` |
| `wingscare`       | WingsCare     | `pdf/WINGS CARE.pdf`  | required         | We Care. You Enjoy.           | INNOVATION & AGILITY    | `#005090`, `#F02020`            |
| `wingsplus`       | WingsPlus     | `pdf/WINGS PLUSS.pdf` | required         | More Benefits. More Journeys. | TOGETHER WE GO FURTHER  | `#005090`, `#6040A0`            |

Note: the application uses tenant code `wing-side`, local alias `/wingsside`,
and public name `wingside.vn`. The supplied brand board title `WING SIDE` is
source-artifact provenance, not the current tenant or public naming contract.

## Files

| File                  | Scope                            | Extracted signals                                                          |
| --------------------- | -------------------------------- | -------------------------------------------------------------------------- |
| `pdf/WINGS - ALL.pdf` | Full Wings ecosystem brand board | WingsCorp, WingsGroup, WingsGo, WingsPass, WingSide, WingsCare, WingsPlus |
| `pdf/WINGSCORP.pdf`   | Corporate/master brand board     | WingsCorp mark, "Fly further. Together"                                    |
| `pdf/WINGSGROUP.pdf`  | WingsGroup umbrella brand board  | WingsGroup mark, "Fly further. Together"                                   |
| `pdf/WINGS GO.pdf`    | WingsGo site identity            | "Go More. Feel More.", "GLOBAL MINDSET"                                    |
| `pdf/WINGS PASS.pdf`  | WingsPass site identity          | "Your Journey. Seamless.", "EXCEPTIONAL EXPERIENCES"                       |
| `pdf/WINGS SIDE.pdf`  | WingSide site identity          | "See Vietnam Differently.", "TRUST & CARE"                                 |
| `pdf/WINGS CARE.pdf`  | WingsCare site identity          | "We Care. You Enjoy.", "INNOVATION & AGILITY"                              |
| `pdf/WINGS PLUSS.pdf` | WingsPlus site identity          | "More Benefits. More Journeys.", "TOGETHER WE GO FURTHER"                  |

Note: `WINGS PLUSS.pdf` keeps the original filename from the supplied design
package, including the double `S`.

## Extracted Design Notes

- PDF producer: CorelDRAW 2020 / Corel PDF Engine.
- Embedded/extracted font: `BodoniBT-Bold`.
- Shared base color seen across the boards: deep Wings blue, approximately
  `#005090`.
- Approximate accent colors from rendered previews:
  - WingsCorp / WingsGroup: gold/yellow, approximately `#FDB515`.
  - WingsGo: bright blue/cyan, approximately `#0090E0`.
  - WingsPass: teal/green, approximately `#008070`.
  - WingSide: dark green with gold, approximately `#104030` and `#C09030`.
  - WingsCare: red, approximately `#F02020`.
  - WingsPlus: purple, approximately `#6040A0`.

These color values are sampled from rendered PDF previews and should be treated
as reference values, not final implementation tokens. Prefer vector source or
approved brand token values when available.

## Usage Guidance

- For business/strategy docs, reference the PDFs in this folder.
- For shared SVG diagrams or document visuals, export approved SVGs into
  `assets/visuals/`.
- For public app runtime images, export optimized files into the app runtime
  asset path and keep CMS media ownership/site scope in mind.
- For each site, export/import both `logoImage` and required `faviconImage`
  into Payload media before marking the brand asset set complete.
- Do not edit files under `publish/` directly from these PDFs; update source
  materials first, then regenerate published outputs when needed.
- Do not treat values in `site-brand-reference.json` as final design tokens until
  approved vector exports or brand-token values are available.
