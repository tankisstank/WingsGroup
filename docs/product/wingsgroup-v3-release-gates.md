# WingsGroup v3 Release Gates

## Status

Active post-deployment governance contract for `US-060`. The production release
uses the approved legal identity, bilingual editorial inventory, governed media,
and runtime brand source. Privacy consent remains enforced by the form, but is
not a separate release blocker. External channels, proof publication, and
ecosystem deep links remain safe non-blocking pending states.

## Machine-Readable Register

`wingsgroup-v3-release-gates.json` is the source used by
`pnpm run validate:wingsgroup:v3-gates`. It contains only non-sensitive gate
state, owner roles, evidence requirements, safe fallback, and downstream
consumers; do not place credentials, private legal material, or personal data
in it.

## Gate Rules

| Priority | Gate | Owner | Pending fallback |
| --- | --- | --- |
| P0 | Legal identity | Business and legal owner | Publish only approved wording. |
| P0 (non-blocking gate) | Privacy and consent | Business and legal owner | Keep the approved form consent; do not show unapproved copy. |
| P0 (optional) | Consultation channels | Commercial operations owner | Show “chờ cập nhật” or record preference only; do not launch an external channel. |
| P1 (non-blocking gate) | Proof publication | Content and legal owner | Do not publish proof or call editorial media proof. |
| P2 (non-blocking gate) | Ecosystem deep links | Destination site owner | Route CTA to WingsGroup contact intake. |
| P2 | Locale completeness | Content owner | Do not expose incomplete English routes or locale switch. |
| P1 | Editorial media | Content and brand owner | Do not publish until provenance, bilingual alt and derivatives exist. |
| P1 | Logo and tokens | Brand owner | Retain existing approved runtime branding. |

## Approved Legal Identity

The approved footer and About-page legal identity is:

- Registered legal entity: `CÔNG TY CỔ PHẦN DU LỊCH ĐÔI CÁNH VIỆT`
- International and short name: `VIETWINGS.,JSC`
- Business registration number: `0109983118`
- International travel licence: `01-2336/2023/TCDL-GP LHQT`
- Legal representative: `Giám đốc Phạm Nguyễn Quân`
- Registered office: `Tầng 2 số 28B ngõ 44 Phố Hào Nam, phường Ô Chợ Dừa, quận Đống Đa, TP Hà Nội`
- Tourism office: `Tầng 12, Ngọc Khánh Plaza, Số 1 Phạm Huy Thông, Giảng Võ, Hà Nội`

Approved public wording:

> WingsGroup là thương hiệu phát triển mới trong cùng hệ sinh thái tổ chức với
> VietWings và Đôi Cánh Việt. Hệ sinh thái tiếp tục phát triển các thương hiệu
> WingsGo, WingSide, WingsCare và các dịch vụ liên quan.

This approval does not approve additional corporate-structure claims, customer
proof, contact-channel endpoints, or privacy/consent text.

## Confirmed Media, Brand and Locale Direction

The 13 handoff images are licensed for project use. `US-061` and `US-062` must
record source/provenance, WingsGroup scope, responsive derivatives, and both
Vietnamese and English alt text before any image is published. This confirmation
does not turn editorial imagery into legal or trust proof.

Vietnamese and English are both delivered E09 locales. The English inventory has
been independently reviewed for natural, refined marketing language and is live
only where the route, chrome and metadata are complete. The supplied brand kit
and guide are the approved runtime source; tenant isolation remains required.

## Approval Protocol and Safe Pending States

To move a mandatory gate to `approved`, record at least one non-sensitive
evidence reference in its `evidence` array and preserve all declared evidence
requirements. For channels and deep links, each configured child must also
include an HTTPS URL, named owner, SLA or tracking evidence as appropriate.

The checker fails closed whenever a mandatory gate is not approved. The three
non-blocking pending states below do not authorize their own public claims or
links: they preserve a safe fallback while production stays usable.

External consultation channels are not mandatory for E09 release. The
consent-aware WingsGroup contact form remains the required fallback path. The
official **Wingsgroup - Vietwings Travel** Zalo OA is approved and live at
`https://zalo.me/4142059657526524531`, with owner **WingsGroup Sales**, a
one-business-day response SLA and tracking reference
`stakeholder-approved-zalo-oa-4142059657526524531-2026-08-29`.

Zalo is shown in the direct-contact section and consultation dialog, opening in
a new tab; it must not displace the form fallback. WhatsApp and Messenger remain
`pending-update` and must be hidden or labelled “chờ cập nhật” until their own
URL, owner, SLA and tracking checks pass.

Proof publication is likewise non-blocking only while its UI remains a pending
state: no certificate, partner, review, rating or other trust claim may be
published without source, context and permission. Ecosystem destinations remain
contact-intake fallbacks until the HTTP, canonical, tracking and owner checks
are recorded.

## Downstream Consumption

- `US-061` models the state and evidence pointers without copying unstructured claims.
- `US-062` and `US-063` render safe pending visual and CTA states.
- `US-064` keeps lead consent and channels fail-closed.
- `US-065` keeps legal routes and tenant links scoped.
- `US-066` runs this checker as a release input alongside browser and platform review.
