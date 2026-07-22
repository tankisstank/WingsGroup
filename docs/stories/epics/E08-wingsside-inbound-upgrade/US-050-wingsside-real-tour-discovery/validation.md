# Validation

## Automated Proof

| Layer       | Required proof                                                          |
| ----------- | ----------------------------------------------------------------------- |
| Unit        | Eligibility, stable sorting, card projection, no static fallback        |
| Component   | Six destination, six style and three sample cards with real records     |
| Integration | Same-site/published filters, relationship validation, locale projection |
| Data        | Selected IDs exist, match slot taxonomy and have valid wrappers         |
| DOM         | Stable marker counts and tour slug/ID evidence                          |
| Responsive  | 8-page regression plus focused Home at six breakpoints                  |
| Visual      | Home 1440x900 and 390x844 against locked prototype state                |
| Platform    | Typecheck, formatter, changed-file lint, build, go-live review          |

## Truthfulness Assertions

- Every Sample Journey title equals its selected Payload record.
- Displayed price and currency equal Payload values.
- Duration and href equal the selected record/wrapper.
- Hero media belongs to the record or an explicit CMS override.
- Static package copy changes do not change rendered Sample Journeys.
- Unpublishing a selected tour removes it and raises a validation gap.

## Browser State

Clear `sessionStorage['wingsside-promo-dismissed']`, freeze the same Home carousel
index and capture from scroll-top. Do not submit real forms.

## Exit Decision

Local UI/data acceptance is separate from production go-live. Record remaining
SEO, SMTP, migration or VPS blockers explicitly.
