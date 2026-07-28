import type { Field, FilterOptionsProps, Tab, Where } from 'payload'

import { sameSiteFilterOptions } from '@/fields/site'
import { normalizeRelationID } from '@/access/roles'

export const WINGSSIDE_HOME_DESTINATION_SELECTION_KEYS = [
  'hanoi',
  'halong',
  'hoian',
  'hue',
  'mekong',
  'sapa',
] as const

export const WINGSSIDE_HOME_STYLE_SELECTION_KEYS = [
  'luxury',
  'family',
  'culture',
  'adventure',
  'wellness',
  'romance',
] as const

export const WINGSSIDE_WHY_TRAVEL_SLOT_KEYS = [
  'local-design',
  'flexible-planning',
  'style-matching',
  'collaborative-care',
] as const

export type WingsSideHomeDestinationSelectionKey =
  (typeof WINGSSIDE_HOME_DESTINATION_SELECTION_KEYS)[number]
export type WingsSideHomeStyleSelectionKey = (typeof WINGSSIDE_HOME_STYLE_SELECTION_KEYS)[number]

/** Locked hub route variants for the 8-page WingSide hi-fi funnel. */
export const WINGSSIDE_HIFI_ROUTE_VARIANTS = [
  { label: 'Home', value: 'home' },
  { label: 'Plan your trip', value: 'plan' },
  { label: 'Destinations', value: 'destinations' },
  { label: 'Styles', value: 'styles' },
  { label: 'Packages', value: 'packages' },
  { label: 'Travel guide', value: 'guide' },
  { label: 'About us', value: 'about' },
  { label: 'Contact us', value: 'contact' },
] as const

export type WingsSideHiFiRouteVariant = (typeof WINGSSIDE_HIFI_ROUTE_VARIANTS)[number]['value']

const text = (name: string, label: string, opts?: { required?: boolean; localized?: boolean }) =>
  ({
    name,
    label,
    type: 'text' as const,
    localized: opts?.localized ?? true,
    required: opts?.required ?? false,
  }) satisfies Field

const textarea = (name: string, label: string, opts?: { required?: boolean; localized?: boolean }) =>
  ({
    name,
    label,
    type: 'textarea' as const,
    localized: opts?.localized ?? true,
    required: opts?.required ?? false,
  }) satisfies Field

const ctaFields = (prefix: string, label: string): Field => ({
  name: prefix,
  label,
  type: 'group',
  fields: [
    text('label', 'Nhãn CTA'),
    text('href', 'Đường dẫn CTA', { localized: false }),
  ],
})

const cardArray = (
  name: string,
  label: string,
  fields: Field[],
  maxRows?: number,
  dbName?: string,
): Field => ({
  name,
  label,
  type: 'array',
  labels: { plural: label, singular: 'Mục' },
  maxRows,
  dbName,
  admin: {
    initCollapsed: true,
  },
  fields,
})

const whenVariant =
  (...variants: WingsSideHiFiRouteVariant[]) =>
  (_: unknown, siblingData: { routeVariant?: string } | null) =>
    Boolean(siblingData?.routeVariant && variants.includes(siblingData.routeVariant as WingsSideHiFiRouteVariant))

/**
 * Array rows do not inherit the Page `site` as siblingData. Filter against the
 * document being edited so a curation relationship cannot select another tenant's tour.
 */
const samePageSiteTourFilter = ({ data }: FilterOptionsProps): boolean | Where => {
  const siteID = normalizeRelationID((data as { site?: unknown } | undefined)?.site as never)

  return siteID
    ? {
        site: {
          equals: siteID,
        },
      }
    : true
}

const tourSelectionFields = <T extends string>(
  name: string,
  label: string,
  keys: readonly T[],
  maxRows: number,
  dbName: string,
): Field =>
  cardArray(
    name,
    label,
    [
      {
        name: 'key',
        label: 'Khoá taxonomy',
        type: 'select',
        required: true,
        options: keys.map((key) => ({ label: key, value: key })),
      },
      {
        name: 'tour',
        label: 'Tour product',
        type: 'relationship',
        relationTo: 'tour-products',
        required: true,
        filterOptions: samePageSiteTourFilter,
      },
    ],
    maxRows,
    dbName,
  )

/**
 * Optional structured WingSide hi-fi content group for Pages.
 * Typed fields only — no opaque JSON editor. Localized text stays Payload-localized.
 */
export const wingsSideHiFiFields = (): Field[] => [
  {
    name: 'enabled',
    label: 'Bật hợp đồng hi-fi cho trang này',
    type: 'checkbox',
    defaultValue: false,
    admin: {
      description:
        'Khi bật, resolver hi-fi đọc các trường dưới đây thay vì chỉ dựa copy tĩnh. Giữ drafts/versions/live preview của Pages.',
    },
  },
  {
    name: 'routeVariant',
    label: 'Biến thể route (khóa 8 trang)',
    type: 'select',
    options: [...WINGSSIDE_HIFI_ROUTE_VARIANTS],
    admin: {
      description: 'Phải khớp pathname hub WingsSide tương ứng.',
      condition: (_, siblingData) => Boolean(siblingData?.enabled),
    },
  },
  {
    name: 'hero',
    label: 'Hero hi-fi (chung)',
    type: 'group',
    admin: {
      condition: (_, siblingData) => Boolean(siblingData?.enabled),
    },
    fields: [
      text('eyebrow', 'Eyebrow'),
      text('title', 'Tiêu đề hero', { required: false }),
      textarea('lede', 'Mô tả ngắn'),
      {
        name: 'media',
        label: 'Media hero',
        type: 'upload',
        relationTo: 'media',
        filterOptions: sameSiteFilterOptions,
      },
      ctaFields('primaryCta', 'CTA chính'),
      ctaFields('secondaryCta', 'CTA phụ'),
    ],
  },
  {
    name: 'home',
    label: 'Home',
    type: 'group',
    admin: {
      condition: whenVariant('home'),
    },
    fields: [
      text('pillarsKicker', 'Pillars kicker'),
      text('pillarsTitle', 'Pillars title'),
      textarea('pillarsLede', 'Pillars lede'),
      cardArray('pillars', 'Pillar steps', [
        text('label', 'Nhãn bước'),
        text('title', 'Tiêu đề'),
        textarea('body', 'Nội dung'),
      ]),
      text('whyKicker', 'Why kicker'),
      text('whyTitle', 'Why title'),
      text('whyFeaturedBadge', 'Why featured badge'),
      text('whyFeaturedTitle', 'Why featured title'),
      textarea('whyFeaturedBody', 'Why featured body'),
      text('whyFeaturedCta', 'Why featured CTA'),
      text('whyFeaturedHref', 'Why featured href', { localized: false }),
      cardArray('whyCards', 'Why cards', [
        text('title', 'Tiêu đề'),
        textarea('body', 'Nội dung'),
        text('cta', 'CTA'),
        text('href', 'Href', { localized: false }),
      ]),
      cardArray(
        'whyTourSlots',
        'Why Travel: representative journeys (4 roles bắt buộc khi kích hoạt)',
        [
          { name: 'key', label: 'Vai trò cố định', type: 'select', required: true, options: WINGSSIDE_WHY_TRAVEL_SLOT_KEYS.map((key) => ({ label: key, value: key })) },
          { name: 'selectionMode', label: 'Cách chọn tour', type: 'select', defaultValue: 'manual', required: true, options: [{ label: 'Chọn thủ công', value: 'manual' }, { label: 'Theo quy tắc taxonomy', value: 'rule' }] },
          { name: 'tour', label: 'Tour thủ công', type: 'relationship', relationTo: 'tour-products', filterOptions: samePageSiteTourFilter, admin: { condition: (_, siblingData) => siblingData?.selectionMode !== 'rule' } },
          { name: 'rule', label: 'Quy tắc được phép', type: 'group', admin: { condition: (_, siblingData) => siblingData?.selectionMode === 'rule' }, fields: [
            { name: 'destinationTag', label: 'Destination tag', type: 'select', options: WINGSSIDE_HOME_DESTINATION_SELECTION_KEYS.map((key) => ({ label: key, value: key })) },
            { name: 'travelStyle', label: 'Travel style', type: 'select', options: WINGSSIDE_HOME_STYLE_SELECTION_KEYS.map((key) => ({ label: key, value: key })) },
            { name: 'minDurationDays', label: 'Số ngày tối thiểu', type: 'number', min: 1 },
            { name: 'maxDurationDays', label: 'Số ngày tối đa', type: 'number', min: 1 },
          ] },
          { name: 'fallbackTour', label: 'Tour dự phòng (chỉ khi dùng quy tắc)', type: 'relationship', relationTo: 'tour-products', filterOptions: samePageSiteTourFilter, admin: { condition: (_, siblingData) => siblingData?.selectionMode === 'rule' } },
          { name: 'presentation', label: 'Trình bày biên tập', type: 'group', fields: [
            { name: 'mode', label: 'Chính sách', type: 'select', defaultValue: 'inherit', options: [{ label: 'Kế thừa từ tour', value: 'inherit' }, { label: 'Ghi đè biên tập', value: 'override' }] },
            text('badge', 'Nhãn vai trò'), textarea('body', 'Lý do đại diện'), text('ctaLabel', 'Nhãn CTA'),
            { name: 'media', label: 'Ảnh ghi đè', type: 'upload', relationTo: 'media', filterOptions: sameSiteFilterOptions },
          ] },
        ],
        4,
        'home_why_tour_slots',
      ),
      text('destKicker', 'Destinations kicker'),
      text('destTitle', 'Destinations title'),
      textarea('destLede', 'Destinations lede'),
      text('stylesKicker', 'Styles kicker'),
      text('stylesTitle', 'Styles title'),
      text('journeysKicker', 'Journeys kicker'),
      text('journeysTitle', 'Journeys title'),
      textarea('journeysLede', 'Journeys lede'),
      tourSelectionFields(
        'destinationTourSelections',
        'Destination tour selections (6 khoá bắt buộc)',
        WINGSSIDE_HOME_DESTINATION_SELECTION_KEYS,
        6,
        'home_dest_tours',
      ),
      tourSelectionFields(
        'styleTourSelections',
        'Style tour selections (6 khoá bắt buộc)',
        WINGSSIDE_HOME_STYLE_SELECTION_KEYS,
        6,
        'home_style_tours',
      ),
      cardArray(
        'featuredJourneySelections',
        'Featured journey selections (3 tour, theo thứ tự)',
        [
          {
            name: 'tour',
            label: 'Tour product',
            type: 'relationship',
            relationTo: 'tour-products',
            required: true,
            filterOptions: samePageSiteTourFilter,
          },
        ],
        3,
        'home_featured_tours',
      ),
      text('notesKicker', 'Notes kicker'),
      text('notesTitle', 'Notes title'),
      cardArray('notes', 'Traveler notes', [
        text('title', 'Tiêu đề'),
        textarea('body', 'Nội dung'),
      ]),
      cardArray('trust', 'Trust / SLA strip', [
        {
          name: 'kind',
          label: 'Loại',
          type: 'select',
          options: [
            { label: 'SLA', value: 'sla' },
            { label: 'Proof', value: 'proof' },
            { label: 'Planner', value: 'planner' },
          ],
        },
        text('title', 'Tiêu đề'),
        textarea('body', 'Nội dung'),
      ]),
      text('closeTitle', 'Close title'),
      textarea('closeLede', 'Close lede'),
      text('closeCta', 'Close CTA'),
      text('closeCtaSecondary', 'Close secondary CTA'),
      cardArray('related', 'Related links', [
        text('title', 'Tiêu đề'),
        textarea('body', 'Nội dung'),
        text('href', 'Href', { localized: false }),
      ]),
      cardArray('credentials', 'Credentials slides', [
        {
          name: 'kind',
          label: 'Loại',
          type: 'select',
          options: [
            { label: 'Cert', value: 'cert' },
            { label: 'Award', value: 'award' },
            { label: 'Member', value: 'member' },
            { label: 'ISO', value: 'iso' },
          ],
        },
        text('mark', 'Mark'),
        text('micro', 'Micro'),
        text('title', 'Tiêu đề'),
        textarea('body', 'Nội dung'),
      ]),
    ],
  },
  {
    name: 'plan',
    label: 'Plan your trip',
    type: 'group',
    admin: {
      condition: whenVariant('plan'),
    },
    fields: [
      textarea('heroLede', 'Plan hero lede'),
      text('stepsKicker', 'Steps kicker'),
      text('stepsTitle', 'Steps title'),
      textarea('stepsLede', 'Steps lede'),
      cardArray('steps', 'Planning steps', [
        text('label', 'Nhãn'),
        text('title', 'Tiêu đề'),
        textarea('body', 'Nội dung'),
      ]),
      text('faqTitle', 'FAQ title'),
      cardArray('faq', 'Planning FAQ', [
        text('question', 'Câu hỏi'),
        textarea('answer', 'Trả lời'),
      ]),
      text('exploreTitle', 'Explore title'),
      cardArray('explore', 'Explore cards', [
        text('title', 'Tiêu đề'),
        textarea('body', 'Nội dung'),
        text('href', 'Href', { localized: false }),
      ]),
      {
        name: 'form',
        label: 'Form brief (Payload Forms)',
        type: 'relationship',
        relationTo: 'forms',
        admin: {
          description: 'Form inquiry đầy đủ cho plan-your-trip. Giữ honeypot/validation hiện có.',
        },
      },
    ],
  },
  {
    name: 'destinations',
    label: 'Destinations',
    type: 'group',
    admin: {
      condition: whenVariant('destinations'),
    },
    fields: [
      text('routesTitle', 'Routes title'),
      text('deeperTitle', 'Deeper title'),
      cardArray('routes', 'Sample multi-city routes', [
        text('title', 'Tiêu đề'),
        textarea('body', 'Nội dung'),
        text('href', 'Href', { localized: false }),
      ]),
      cardArray('places', 'Destination cards', [
        text('title', 'Tiêu đề'),
        textarea('body', 'Nội dung'),
        text('region', 'Region'),
        text('href', 'Href', { localized: false }),
        {
          name: 'media',
          label: 'Media',
          type: 'upload',
          relationTo: 'media',
          filterOptions: sameSiteFilterOptions,
        },
      ]),
      text('closingTitle', 'Closing conversion title'),
      cardArray('closingLinks', 'Closing continuation links', [
        text('title', 'Tiêu đề'),
        textarea('body', 'Nội dung'),
        text('href', 'Href', { localized: false }),
      ]),
    ],
  },
  {
    name: 'styles',
    label: 'Styles',
    type: 'group',
    admin: {
      condition: whenVariant('styles'),
    },
    fields: [
      text('introTitle', 'Intro title'),
      cardArray('styles', 'Style cards', [
        text('title', 'Tiêu đề'),
        textarea('body', 'Nội dung'),
        text('href', 'Href', { localized: false }),
        {
          name: 'media',
          label: 'Media',
          type: 'upload',
          relationTo: 'media',
          filterOptions: sameSiteFilterOptions,
        },
      ]),
      text('closingTitle', 'Closing conversion title'),
      cardArray('closingLinks', 'Closing continuation links', [
        text('title', 'Tiêu đề'),
        textarea('body', 'Nội dung'),
        text('href', 'Href', { localized: false }),
      ]),
    ],
  },
  {
    name: 'packages',
    label: 'Packages',
    type: 'group',
    admin: {
      condition: whenVariant('packages'),
    },
    fields: [
      text('gridTitle', 'Grid title'),
      textarea('gridLede', 'Grid lede'),
      cardArray(
        'cards',
        'Journey cards (5 locked)',
        [
          text('badge', 'Badge'),
          text('micro', 'Micro line'),
          text('title', 'Tiêu đề'),
          textarea('body', 'Nội dung'),
          text('priceFrom', 'Price from'),
          text('priceUnit', 'Price unit'),
          text('note', 'Note'),
          text('href', 'Href', { localized: false }),
          text('viewLabel', 'View itinerary label'),
          text('customizeLabel', 'Customize label'),
          {
            name: 'media',
            label: 'Media',
            type: 'upload',
            relationTo: 'media',
            filterOptions: sameSiteFilterOptions,
          },
        ],
        5,
      ),
      text('closingTitle', 'Closing conversion title'),
      textarea('closingNote', 'Guest note'),
      cardArray('closingLinks', 'Closing continuation links', [
        text('title', 'Tiêu đề'),
        textarea('body', 'Nội dung'),
        text('href', 'Href', { localized: false }),
      ]),
    ],
  },
  {
    name: 'guide',
    label: 'Travel guide',
    type: 'group',
    admin: {
      condition: whenVariant('guide'),
    },
    fields: [
      text('listTitle', 'List title'),
      cardArray('notes', 'Guide notes', [
        text('title', 'Tiêu đề'),
        textarea('body', 'Nội dung'),
        text('href', 'Href', { localized: false }),
      ]),
      text('closingTitle', 'Closing conversion title'),
      text('closingCta', 'Closing CTA label'),
      text('closingHref', 'Closing CTA href', { localized: false }),
    ],
  },
  {
    name: 'about',
    label: 'About us',
    type: 'group',
    admin: {
      condition: whenVariant('about'),
    },
    fields: [
      text('storyTitle', 'Story title'),
      textarea('storyBody', 'Story body'),
      text('stepsTitle', 'Steps title'),
      text('promisesTitle', 'Promises title'),
      cardArray('promises', 'Promises', [
        text('title', 'Tiêu đề'),
        textarea('body', 'Nội dung'),
      ]),
      text('teamTitle', 'Team title'),
      textarea('teamLede', 'Team lede'),
      text('closingTitle', 'Closing conversion title'),
      cardArray('closingLinks', 'Closing continuation links', [
        text('title', 'Tiêu đề'),
        textarea('body', 'Nội dung'),
        text('href', 'Href', { localized: false }),
      ]),
    ],
  },
  {
    name: 'contact',
    label: 'Contact us',
    type: 'group',
    admin: {
      condition: whenVariant('contact'),
    },
    fields: [
      text('channelsTitle', 'Channels title'),
      cardArray('channels', 'Contact channels', [
        text('label', 'Nhãn'),
        text('value', 'Giá trị'),
        text('href', 'Href', { localized: false }),
      ]),
      text('nextTitle', 'Next steps title'),
      cardArray('nextSteps', 'Next steps', [
        text('title', 'Tiêu đề'),
        textarea('body', 'Giải thích'),
      ]),
      {
        name: 'form',
        label: 'Message form (Payload Forms)',
        type: 'relationship',
        relationTo: 'forms',
        admin: {
          description: 'Form Send a message — bắt buộc cho contact hi-fi.',
        },
      },
      text('closingTitle', 'Closing conversion title'),
      text('closingCta', 'Full brief CTA'),
      text('closingHref', 'Full brief href', { localized: false }),
      cardArray('closingLinks', 'Closing continuation links', [
        text('title', 'Tiêu đề'),
        textarea('body', 'Nội dung'),
        text('href', 'Href', { localized: false }),
      ]),
    ],
  },
]

/** Pages admin tab — only meaningful for WingsSide hub pages. */
export const wingsSideHiFiTab = (): Tab => ({
  name: 'wingsSideHiFi',
  label: 'WingsSide Hi-Fi',
  fields: wingsSideHiFiFields(),
  admin: {
    description:
      'Hợp đồng nội dung typed cho 8 route hub WingsSide. Không dùng JSON editor. Media/form qua relationship Payload.',
  },
})
