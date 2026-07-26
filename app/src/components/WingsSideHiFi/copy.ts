import { getCopyLocale, type SupportedLocaleCode } from '@/utilities/locales'

type CredsCopy = {
  appointmentType: string
  ariaLabel: string
  awardedEntity: string
  awardType: string
  close: string
  ctaPlanPrivateJourney: string
  dialogLabel: string
  filterAll: string
  filterAppointments: string
  filterAwards: string
  filterGroupLabel: string
  inspectOriginal: string
  issuedBy: string
  kicker: string
  title: string
  lede: string
  missingField: string
  next: string
  prev: string
  proofType: string
  recordsLabel: string
  thumbnailRailLabel: string
  verifiedArchiveLabel: string
  viewDocument: string
  year: string
}

export type SectionCopy = {
  /** Public hub hero H1 (localized). */
  heroTitle: string
  heroLede?: string
  plan: {
    /** Dedicated plan-route hero (not steps title). */
    heroKicker: string
    heroTitle: string
    heroLede: string
    primaryCtaLabel: string
    breadcrumbCurrent: string
    mediaCap: string
    stepsKicker: string
    stepsTitle: string
    stepsLede: string
    steps: Array<{ label: string; title: string; body: string }>
    briefKicker: string
    briefTitle: string
    formTitle: string
    promises: string[]
    guestNote: string
    faqKicker: string
    faqTitle: string
    faq: Array<{ question: string; answer: string }>
    exploreTitle: string
    explore: Array<{ title: string; body: string; href: string }>
    destChips: string[]
    styleChips: string[]
    budgetChips: string[]
    destChipsLabel: string
    styleChipsLabel: string
    budgetChipsLabel: string
    consentLabel: string
  }
  destinations: {
    routesTitle: string
    deeperTitle: string
    routes: Array<{ title: string; body: string; href: string }>
    places: Array<{ title: string; body: string; href: string; region: string }>
  }
  styles: {
    introTitle: string
    styles: Array<{ title: string; body: string; href: string }>
    cta: string
  }
  packages: {
    gridTitle: string
    gridLede: string
    cards: Array<{
      badge: string
      micro: string
      title: string
      body: string
      priceFrom: string
      priceUnit: string
      note: string
      href: string
    }>
  }
  guide: {
    listTitle: string
    notes: Array<{ title: string; body: string; href: string }>
    cta: string
  }
  about: {
    storyTitle: string
    stepsTitle: string
    promisesTitle: string
    promises: Array<{ title: string; body: string }>
    teamTitle: string
    teamLede: string
  }
  contact: {
    channelsTitle: string
    nextTitle: string
    nextSteps: string[]
    channels: Array<{ label: string; value: string; href?: string }>
  }
  home: {
    pillarsKicker: string
    pillarsTitle: string
    pillarsLede: string
    whyKicker: string
    whyTitle: string
    whyFeatured: { badge: string; title: string; body: string; cta: string; href: string }
    whyCards: Array<{ title: string; body: string; cta: string; href: string }>
    destKicker: string
    destTitle: string
    destLede: string
    destExplore: string
    stylesKicker: string
    stylesTitle: string
    stylesMatch: string
    journeysKicker: string
    journeysTitle: string
    journeysLede: string
    notesKicker: string
    notesTitle: string
    notes: Array<{ title: string; body: string }>
    trust: Array<{ kind: 'sla' | 'proof' | 'planner'; title: string; body: string }>
    plannerNamePlaceholder: string
    closeTitle: string
    closeLede: string
    closeCta: string
    closeCtaSecondary: string
    continueKicker: string
    related: Array<{ title: string; body: string; href: string }>
    exploreDestinations: string
    planTripCta: string
  }
  creds: CredsCopy
}

const en: SectionCopy = {
  heroTitle: 'Tailor-made Vietnam journeys',
  heroLede: 'Private routes designed with a local planning desk — not a retail tour grid.',
  home: {
    pillarsKicker: 'How WingSide works',
    pillarsTitle: 'Four steps from brief to private route',
    pillarsLede:
      'One local planning desk. You send the essentials — we design the journey and reply within 1 business day (GMT+7).',
    whyKicker: 'Why travel with WingSide',
    whyTitle: 'Local design. Flexible planning. Real matching.',
    whyFeatured: {
      badge: 'Featured',
      title: 'Locally designed routes',
      body: 'On-ground operators shape rhythm and combinations — not catalogue templates.',
      cta: 'How we plan →',
      href: '/plan-your-trip',
    },
    whyCards: [
      {
        title: 'Flexible planning',
        body: 'Pace around family needs and meaningful stops.',
        cta: 'Explore →',
        href: '/destinations',
      },
      {
        title: 'Style matching',
        body: 'Luxury, family, culture — before the first draft.',
        cta: 'Styles →',
        href: '/styles',
      },
      {
        title: 'Collaborative care',
        body: 'Co-design inclusions and logistics with your planner.',
        cta: 'About →',
        href: '/about-us',
      },
    ],
    destKicker: 'Destination hub',
    destTitle: 'Where your route can go',
    destLede: 'Mark places first — North icons, Central heritage, or a softer South rhythm.',
    destExplore: 'Explore →',
    stylesKicker: 'Travel styles',
    stylesTitle: 'How you like to travel',
    stylesMatch: 'Match →',
    journeysKicker: 'Sample journeys',
    journeysTitle: 'Which Vietnam story pulls you in first?',
    journeysLede:
      'Private frames guests open most — react to the shape, then we rewrite it around your dates. Not locked group departures.',
    notesKicker: 'Traveler notes',
    notesTitle: 'What guests ask before they write',
    notes: [
      {
        title: 'Pace & inclusions',
        body: 'What is included day by day, and how hard is the pace for mixed ages?',
      },
      {
        title: 'Style before hotels',
        body: 'We match travel style first — then hotels, not the other way around.',
      },
      {
        title: 'North vs central',
        body: 'Can we combine North icons with Central heritage without the rush?',
      },
    ],
    trust: [
      {
        kind: 'sla',
        title: 'Reply SLA',
        body: 'Direction email within 1 business day (GMT+7).',
      },
      {
        kind: 'proof',
        title: 'Proof',
        body: 'Only published licenses and awards appear here.',
      },
      {
        kind: 'planner',
        title: 'Your planner',
        body: 'A named local desk owns your first draft.',
      },
    ],
    plannerNamePlaceholder: '[ Name when ready ]',
    closeTitle: 'Ready to shape a private Vietnam journey?',
    closeLede: 'Send a short brief — a planner replies within 1 business day (GMT+7).',
    closeCta: 'Plan trip',
    closeCtaSecondary: 'Contact us',
    continueKicker: 'Continue',
    exploreDestinations: 'Explore destinations',
    planTripCta: 'Plan trip',
    related: [
      { title: 'Destinations →', body: 'Mark places before the brief.', href: '/destinations' },
      {
        title: 'Sample journeys →',
        body: 'Frames to react to — not fixed groups.',
        href: '/packages',
      },
      {
        title: 'Plan your trip →',
        body: 'Full brief when you know month & group.',
        href: '/plan-your-trip',
      },
    ],
  },
  plan: {
    heroKicker: 'Conversion · full brief',
    heroTitle: 'Plan your Vietnam journey with a local team',
    heroLede:
      'Custom routes, hotels, and pacing. Share month, group, destinations, and style — reply within 1 business day (GMT+7).',
    primaryCtaLabel: 'Share your brief',
    breadcrumbCurrent: 'Plan your trip',
    mediaCap: 'Ha Long · cruise rhythm',
    stepsKicker: 'How WingSide works',
    stepsTitle: 'Four steps from brief to private route',
    stepsLede:
      'Same desk as Home. You send the essentials — we design and reply within 1 business day (GMT+7).',
    steps: [
      {
        label: 'Step 1 · Brief',
        title: 'Tell us the essentials',
        body: 'Month, group size, destinations (or region), and how you like to travel — use the form below.',
      },
      {
        label: 'Step 2 · Match',
        title: 'We match place + pace',
        body: 'A planner maps cities, day length, and style against your month — not a fixed catalogue package.',
      },
      {
        label: 'Step 3 · Draft',
        title: 'Receive a private draft',
        body: 'Route outline, hotel band, and transfers — written for your group. Reply window: 1 business day.',
      },
      {
        label: 'Step 4 · Lock',
        title: 'Refine, then lock',
        body: 'Swap days, hotels, or inclusions together until it fits — then we lock logistics on the ground.',
      },
    ],
    briefKicker: 'Brief · primary conversion',
    briefTitle: 'Share your travel brief',
    formTitle: 'Your brief',
    promises: [
      'Typical reply: within 1 business day',
      'Advice based on real timing and budget',
      'Private route — not a retail grid only',
    ],
    guestNote: 'We care about fewer transitions and hotels that match the rhythm.',
    faqKicker: 'Planning questions',
    faqTitle: 'Inbound FAQ',
    faq: [
      {
        question: 'Do I need a full itinerary before contacting you?',
        answer:
          'No. A month, group size, style, and a few must-sees are enough for a first direction.',
      },
      {
        question: 'How far ahead should we plan?',
        answer:
          'For peak months (Mar–Apr, Oct–Nov), 3–6 months helps with preferred hotels and guides.',
      },
      {
        question: 'Private guide languages?',
        answer:
          'English is standard; Italian, Spanish, Portuguese, and French can be arranged on request.',
      },
      {
        question: 'Best months for north vs south?',
        answer:
          'North shines in spring/autumn; south is more year-round with wet-season planning for Mekong days.',
      },
      {
        question: 'Visa basics for short stays?',
        answer:
          'Rules change by nationality. We share a practical checklist once your dates are clear — not legal advice.',
      },
      {
        question: 'Can we add airport fast track later?',
        answer:
          'Yes. Logistics like fast track, private transfers, and hotel swaps can be added after the first direction.',
      },
    ],
    exploreTitle: 'Explore before you brief',
    explore: [
      {
        title: 'Destinations →',
        body: 'See where routes go — mark them in your brief.',
        href: '/destinations',
      },
      { title: 'Travel styles →', body: 'Match a style before dates.', href: '/styles' },
      { title: 'Sample packages →', body: 'Real trip shapes to react to.', href: '/packages' },
    ],
    destChips: ['Ha Long', 'Hoi An', 'Sapa', 'Hue', 'Mekong'],
    styleChips: ['Heritage', 'Food', 'Beach', 'Family'],
    budgetChips: ['$', '$$', '$$$'],
    destChipsLabel: 'Destinations',
    styleChipsLabel: 'Travel style',
    budgetChipsLabel: 'Budget / person',
    consentLabel: 'I agree to the privacy policy. We only use this to reply (GDPR markets).',
  },
  destinations: {
    routesTitle: 'Sample multi-city routes',
    deeperTitle: 'Pick a place to go deeper',
    routes: [
      {
        title: 'North gateway',
        body: 'Hanoi · Ha Long · highland contrast.',
        href: '/destinations/ha-noi',
      },
      {
        title: 'Central heritage',
        body: 'Hue and Hoi An without hotel fatigue.',
        href: '/destinations/hue',
      },
      {
        title: 'Delta rhythm',
        body: 'Mekong days with softer pacing.',
        href: '/destinations/mekong',
      },
    ],
    places: [
      {
        title: 'Hanoi',
        body: 'Urban heritage, food, northern gateway logic.',
        href: '/destinations/ha-noi',
        region: 'North Vietnam',
      },
      {
        title: 'Ha Long',
        body: 'Cruise and seascape rhythm for contrast days.',
        href: '/destinations/ha-long',
        region: 'Bay & cruise',
      },
      {
        title: 'Hoi An',
        body: 'Lantern streets and softer evening pacing.',
        href: '/destinations/hoi-an',
        region: 'Central heritage',
      },
      {
        title: 'Hue',
        body: 'Imperial depth for central storytelling routes.',
        href: '/destinations/hue',
        region: 'Historic city',
      },
      {
        title: 'Mekong',
        body: 'Waterways and local life for a softer finish.',
        href: '/destinations/mekong',
        region: 'Southern Vietnam',
      },
      {
        title: 'Sapa',
        body: 'Terraces and community stays with active pacing.',
        href: '/destinations',
        region: 'Highlands',
      },
    ],
  },
  styles: {
    introTitle: 'Pick the pace before the places',
    styles: [
      { title: 'Luxury', body: 'Refined pacing, hotels, hosting.', href: '/styles/luxury' },
      { title: 'Family', body: 'Balanced days for mixed ages.', href: '/styles/family' },
      { title: 'Culture', body: 'Stories, context, food, heritage.', href: '/styles/culture' },
      { title: 'Adventure', body: 'A more active route rhythm.', href: '/styles/adventure' },
      { title: 'Wellness', body: 'Softer days and recovery space.', href: '/styles#wellness' },
      { title: 'Romance', body: 'Honeymoons and meaningful escapes.', href: '/styles#romance' },
    ],
    cta: 'Style chosen? Carry it into your brief',
  },
  packages: {
    gridTitle: 'Which Vietnam story pulls you in first?',
    gridLede:
      'Private frames guests open most — react to the shape, then we rewrite it around your dates. Not locked group departures.',
    cards: [
      {
        badge: 'HOT PICK',
        micro: '10–12 days · North + Central',
        title: 'Can one trip cover the icons — without the rush?',
        body: 'A multi-region first trip frame.',
        priceFrom: 'From $2,190',
        priceUnit: '/ person',
        note: 'Indicative · customize',
        href: '/packages/vietnam-highlights',
      },
      {
        badge: 'BEST PRICE',
        micro: '7–8 days · North',
        title: 'What does a deep North week actually feel like?',
        body: 'North Vietnam in tighter focus.',
        priceFrom: 'From $1,480',
        priceUnit: '/ person',
        note: 'Indicative · customize',
        href: '/packages/northern-vietnam',
      },
      {
        badge: 'POPULAR',
        micro: '8–9 days · Central',
        title: 'Ready for citadel days and lantern nights?',
        body: 'A softer heritage-led route.',
        priceFrom: 'From $1,620',
        priceUnit: '/ person',
        note: 'Indicative · customize',
        href: '/packages/central-heritage',
      },
      {
        badge: 'FAMILY FAVORITE',
        micro: '10 days · Mixed ages',
        title: 'Can grandparents and kids share one route?',
        body: 'Fewer hotel changes and culture moments designed for every age.',
        priceFrom: 'From $1,890',
        priceUnit: '/ person',
        note: 'Indicative · private family · customize freely',
        href: '/packages/vietnam-highlights#family',
      },
      {
        badge: 'SOFT FINISH',
        micro: '8 days · South finish',
        title: 'What if the last days felt slower, not smaller?',
        body: 'Hoi An glow into Mekong orchards and river lodges for a softer finish.',
        priceFrom: 'From $1,540',
        priceUnit: '/ person',
        note: 'Indicative · private pair · customize freely',
        href: '/packages#south',
      },
    ],
  },
  guide: {
    listTitle: 'Latest travel notes',
    notes: [
      {
        title: 'When to visit North Vietnam',
        body: 'Season, weather, and pacing trade-offs for the gateway north.',
        href: '/travel-guide#north-seasons',
      },
      {
        title: 'Hue and Hoi An without hotel fatigue',
        body: 'How to pair heritage days without over-moving.',
        href: '/travel-guide#central-routes',
      },
      {
        title: 'Transfers that protect your pacing',
        body: 'When a longer transfer is worth the day it protects.',
        href: '/travel-guide#protect-pacing',
      },
    ],
    cta: 'Notes done — ready to brief?',
  },
  about: {
    storyTitle: 'Built for guests who want a private route, not a catalogue checkout',
    stepsTitle: 'Four steps from brief to private route',
    promisesTitle: 'Four promises. No jargon.',
    promises: [
      {
        title: 'Private by default',
        body: 'Routes are shaped for your group — not fixed coach seats.',
      },
      { title: 'Local design', body: 'Planners based in Vietnam own the first direction.' },
      {
        title: 'Clear first reply',
        body: 'Expect a direction email within 1 business day (GMT+7).',
      },
      { title: 'Honest proof', body: 'Only published licenses and awards appear on this site.' },
    ],
    teamTitle: 'People behind the brief',
    teamLede:
      'Planner faces publish only when approved portraits are on file — no stock headshots as fake team proof.',
  },
  contact: {
    channelsTitle: 'Channels',
    nextTitle: 'What happens next — same desk as Plan',
    nextSteps: [
      'We read the essentials',
      'We match place + pace',
      'You get a direction email',
      'Refine when ready',
    ],
    channels: [
      { label: 'Email', value: 'hello@wingside.vn', href: 'mailto:hello@wingside.vn' },
      { label: 'Phone', value: '+84 903 000 222', href: 'tel:+84903000222' },
      { label: 'WhatsApp', value: '+84 903 000 222', href: 'https://wa.me/84903000222' },
    ],
  },
  creds: {
    appointmentType: 'Airline appointment',
    ariaLabel: 'Certificates and awards',
    awardedEntity: 'Awarded entity',
    awardType: 'Performance award',
    close: 'Close',
    ctaPlanPrivateJourney: 'Plan a private journey',
    dialogLabel: 'Credential document preview',
    filterAll: 'All proof',
    filterAppointments: 'Airline appointments',
    filterAwards: 'Performance awards',
    filterGroupLabel: 'Filter credentials',
    inspectOriginal: 'Inspect original',
    issuedBy: 'Issued by',
    kicker: 'Certificates & awards',
    title: 'Proof you can inspect, not just claims',
    lede: 'A documented record of airline appointments and performance recognition published from original certificates.',
    missingField: 'Not stated on document',
    prev: 'Previous credential',
    next: 'Next credential',
    proofType: 'Proof type',
    recordsLabel: 'records',
    thumbnailRailLabel: 'Credential index',
    verifiedArchiveLabel: 'Verified archive',
    viewDocument: 'View document',
    year: 'Year',
  },
}

const vi: SectionCopy = {
  heroTitle: 'Hành trình Việt Nam may đo',
  heroLede: 'Tuyến riêng với bàn lập kế hoạch địa phương — không lưới tour bán lẻ.',
  home: {
    pillarsKicker: 'Cách WingSide làm việc',
    pillarsTitle: 'Bốn bước từ brief đến hành trình riêng',
    pillarsLede:
      'Một bàn lập kế hoạch địa phương. Bạn gửi thông tin cốt lõi — chúng tôi thiết kế hành trình và trả lời trong 1 ngày làm việc (GMT+7).',
    whyKicker: 'Vì sao đi với WingSide',
    whyTitle: 'Thiết kế địa phương. Lịch trình linh hoạt. Ghép đúng nhịp.',
    whyFeatured: {
      badge: 'Nổi bật',
      title: 'Tuyến do người địa phương thiết kế',
      body: 'Đội trên mặt đất định nhịp và tổ hợp — không template catalogue.',
      cta: 'Cách chúng tôi lập kế hoạch →',
      href: '/plan-your-trip',
    },
    whyCards: [
      {
        title: 'Lịch trình linh hoạt',
        body: 'Nhịp quanh gia đình và điểm công tác.',
        cta: 'Khám phá →',
        href: '/destinations',
      },
      {
        title: 'Ghép đúng phong cách',
        body: 'Cao cấp, gia đình, văn hóa — trước bản nháp đầu.',
        cta: 'Phong cách →',
        href: '/styles',
      },
      {
        title: 'Đồng thiết kế',
        body: 'Cùng planner chốt dịch vụ và logistics.',
        cta: 'Giới thiệu →',
        href: '/about-us',
      },
    ],
    destKicker: 'Hub điểm đến',
    destTitle: 'Hành trình có thể đi đâu',
    destLede: 'Chọn nơi trước — biểu tượng miền Bắc, di sản miền Trung, hoặc nhịp Nam nhẹ hơn.',
    destExplore: 'Khám phá →',
    stylesKicker: 'Phong cách du lịch',
    stylesTitle: 'Bạn muốn đi theo nhịp nào',
    stylesMatch: 'Ghép →',
    journeysKicker: 'Hành trình mẫu',
    journeysTitle: 'Câu chuyện Việt Nam nào kéo bạn trước?',
    journeysLede:
      'Các khung riêng khách mở nhiều nhất — phản ứng với dáng chuyến, rồi chúng tôi viết lại theo ngày của bạn. Không tour đoàn cố định.',
    notesKicker: 'Ghi chú khách',
    notesTitle: 'Khách hỏi gì trước khi viết',
    notes: [
      {
        title: 'Nhịp & dịch vụ',
        body: 'Ngày nào gồm gì, và nhịp có vừa với nhiều độ tuổi không?',
      },
      {
        title: 'Phong cách trước khách sạn',
        body: 'Chúng tôi ghép phong cách trước — rồi mới khách sạn.',
      },
      {
        title: 'Bắc vs Trung',
        body: 'Có ghép biểu tượng miền Bắc với di sản miền Trung mà không vội không?',
      },
    ],
    trust: [
      {
        kind: 'sla',
        title: 'SLA phản hồi',
        body: 'Email định hướng trong 1 ngày làm việc (GMT+7).',
      },
      {
        kind: 'proof',
        title: 'Bằng chứng',
        body: 'Chỉ giấy phép và giải thưởng đã công bố.',
      },
      {
        kind: 'planner',
        title: 'Planner của bạn',
        body: 'Một bàn địa phương phụ trách bản nháp đầu.',
      },
    ],
    plannerNamePlaceholder: '[ Tên khi sẵn sàng ]',
    closeTitle: 'Sẵn sàng định hình chuyến đi riêng?',
    closeLede: 'Gửi brief ngắn — planner phản hồi trong 1 ngày làm việc (GMT+7).',
    closeCta: 'Lên kế hoạch',
    closeCtaSecondary: 'Liên hệ',
    continueKicker: 'Tiếp tục',
    exploreDestinations: 'Khám phá điểm đến',
    planTripCta: 'Lên kế hoạch',
    related: [
      { title: 'Điểm đến →', body: 'Chọn nơi trước khi gửi brief.', href: '/destinations' },
      {
        title: 'Hành trình mẫu →',
        body: 'Khung để phản ứng — không tour cố định.',
        href: '/packages',
      },
      {
        title: 'Lên kế hoạch →',
        body: 'Brief đầy đủ khi đã có tháng & đoàn.',
        href: '/plan-your-trip',
      },
    ],
  },
  plan: {
    heroKicker: 'Chuyển đổi · brief đầy đủ',
    heroTitle: 'Lên kế hoạch hành trình Việt Nam với đội địa phương',
    heroLede:
      'Tuyến, khách sạn và nhịp riêng. Gửi tháng, đoàn, điểm đến và phong cách — phản hồi trong 1 ngày làm việc (GMT+7).',
    primaryCtaLabel: 'Gửi brief của bạn',
    breadcrumbCurrent: 'Lên kế hoạch',
    mediaCap: 'Hạ Long · nhịp du thuyền',
    stepsKicker: 'Cách WingSide làm việc',
    stepsTitle: 'Bốn bước từ brief đến hành trình riêng',
    stepsLede:
      'Cùng bàn với trang chủ. Bạn gửi thông tin cốt lõi — chúng tôi thiết kế và trả lời trong 1 ngày làm việc (GMT+7).',
    steps: [
      {
        label: 'Bước 1 · Brief',
        title: 'Nói điều cần thiết',
        body: 'Tháng đi, quy mô đoàn, điểm đến (hoặc vùng) và cách bạn muốn đi — dùng form bên dưới.',
      },
      {
        label: 'Bước 2 · Ghép',
        title: 'Chúng tôi ghép nơi + nhịp',
        body: 'Planner map thành phố, độ dài ngày và phong cách theo tháng của bạn — không gói catalogue cố định.',
      },
      {
        label: 'Bước 3 · Nháp',
        title: 'Nhận bản nháp riêng',
        body: 'Khung tuyến, dải khách sạn và transfer — viết cho đoàn bạn. Cửa sổ phản hồi: 1 ngày làm việc.',
      },
      {
        label: 'Bước 4 · Chốt',
        title: 'Chỉnh rồi chốt',
        body: 'Đổi ngày, khách sạn hoặc dịch vụ cùng nhau cho đến khi vừa — rồi chốt logistics trên mặt đất.',
      },
    ],
    briefKicker: 'Brief · chuyển đổi chính',
    briefTitle: 'Gửi brief du lịch của bạn',
    formTitle: 'Brief của bạn',
    promises: [
      'Phản hồi thường: trong 1 ngày làm việc',
      'Tư vấn theo thời điểm và ngân sách thực',
      'Hành trình riêng — không chỉ lưới bán lẻ',
    ],
    guestNote: 'Chúng tôi ưu tiên ít điểm chuyển và khách sạn khớp nhịp chuyến.',
    faqKicker: 'Câu hỏi lập kế hoạch',
    faqTitle: 'Câu hỏi thường gặp',
    faq: [
      {
        question: 'Tôi có cần lịch trình đầy đủ trước khi liên hệ?',
        answer:
          'Không. Tháng đi, quy mô đoàn, phong cách và vài điểm muốn thấy là đủ cho hướng đi đầu.',
      },
      {
        question: 'Nên lên kế hoạch trước bao lâu?',
        answer:
          'Tháng cao điểm (3–4, 10–11), 3–6 tháng giúp giữ khách sạn và hướng dẫn viên ưa thích.',
      },
      {
        question: 'Ngôn ngữ hướng dẫn riêng?',
        answer:
          'Tiếng Anh là chuẩn; Ý, Tây Ban Nha, Bồ Đào Nha và Pháp có thể sắp xếp theo yêu cầu.',
      },
      {
        question: 'Tháng nào tốt cho Bắc vs Nam?',
        answer:
          'Miền Bắc đẹp mùa xuân/thu; miền Nam quanh năm hơn, cần tính mùa mưa cho ngày Mekong.',
      },
      {
        question: 'Visa cho lưu trú ngắn?',
        answer:
          'Quy định thay đổi theo quốc tịch. Chúng tôi gửi checklist thực dụng khi có ngày — không phải tư vấn pháp lý.',
      },
      {
        question: 'Có thể thêm fast track sân bay sau?',
        answer: 'Có. Fast track, transfer riêng và đổi khách sạn có thể bổ sung sau hướng đi đầu.',
      },
    ],
    exploreTitle: 'Khám phá trước khi gửi brief',
    explore: [
      {
        title: 'Điểm đến →',
        body: 'Xem tuyến đi đâu — đánh dấu trong brief.',
        href: '/destinations',
      },
      { title: 'Phong cách →', body: 'Ghép phong cách trước ngày.', href: '/styles' },
      { title: 'Gói mẫu →', body: 'Hình dạng chuyến để phản ứng.', href: '/packages' },
    ],
    destChips: ['Hạ Long', 'Hội An', 'Sapa', 'Huế', 'Mekong'],
    styleChips: ['Di sản', 'Ẩm thực', 'Biển', 'Gia đình'],
    budgetChips: ['$', '$$', '$$$'],
    destChipsLabel: 'Điểm đến',
    styleChipsLabel: 'Phong cách',
    budgetChipsLabel: 'Ngân sách / người',
    consentLabel:
      'Tôi đồng ý với chính sách quyền riêng tư. Chỉ dùng để phản hồi (thị trường GDPR).',
  },
  destinations: {
    routesTitle: 'Tuyến nhiều điểm mẫu',
    deeperTitle: 'Chọn nơi để đi sâu hơn',
    routes: [
      {
        title: 'Cửa ngõ miền Bắc',
        body: 'Hà Nội · Hạ Long · cao nguyên.',
        href: '/destinations/ha-noi',
      },
      {
        title: 'Di sản miền Trung',
        body: 'Huế và Hội An không mệt khách sạn.',
        href: '/destinations/hue',
      },
      { title: 'Nhịp đồng bằng', body: 'Ngày Mekong nhịp nhẹ hơn.', href: '/destinations/mekong' },
    ],
    places: [
      {
        title: 'Hà Nội',
        body: 'Di sản, ẩm thực, cửa ngõ miền Bắc.',
        href: '/destinations/ha-noi',
        region: 'Bắc',
      },
      {
        title: 'Hạ Long',
        body: 'Nhịp du thuyền và cảnh quan biển.',
        href: '/destinations/ha-long',
        region: 'Bắc',
      },
      {
        title: 'Hội An',
        body: 'Phố đèn lồng và buổi tối chậm.',
        href: '/destinations/hoi-an',
        region: 'Trung',
      },
      {
        title: 'Huế',
        body: 'Ngày kinh thành và di sản miền Trung.',
        href: '/destinations/hue',
        region: 'Trung',
      },
      {
        title: 'Mekong',
        body: 'Nhịp đồng bằng nhẹ hơn.',
        href: '/destinations/mekong',
        region: 'Nam',
      },
      {
        title: 'Sapa',
        body: 'Ruộng bậc thang và đêm se lạnh.',
        href: '/destinations',
        region: 'Bắc',
      },
    ],
  },
  styles: {
    introTitle: 'Chọn nhịp trước khi chọn nơi',
    styles: [
      { title: 'Cao cấp', body: 'Nhịp tinh tế, khách sạn, host.', href: '/styles/luxury' },
      { title: 'Gia đình', body: 'Ngày cân bằng cho nhiều độ tuổi.', href: '/styles/family' },
      { title: 'Văn hóa', body: 'Câu chuyện, bối cảnh, ẩm thực, di sản.', href: '/styles/culture' },
      { title: 'Phiêu lưu', body: 'Nhịp tuyến năng động hơn.', href: '/styles/adventure' },
      {
        title: 'Chăm sóc sức khỏe',
        body: 'Ngày nhẹ và không gian phục hồi.',
        href: '/styles#wellness',
      },
      { title: 'Lãng mạn', body: 'Tuần trăng mật và những kỳ nghỉ riêng tư.', href: '/styles#romance' },
    ],
    cta: 'Đã chọn phong cách? Đưa vào brief',
  },
  packages: {
    gridTitle: 'Câu chuyện Việt Nam nào kéo bạn trước?',
    gridLede:
      'Các khung riêng khách mở nhiều nhất — phản ứng với dáng chuyến, rồi chúng tôi viết lại theo ngày của bạn. Không tour đoàn cố định.',
    cards: [
      {
        badge: 'HOT PICK',
        micro: '10–12 ngày · Bắc + Trung',
        title: 'Một chuyến có đủ biểu tượng — mà không vội?',
        body: 'Khung chuyến đầu tiên nhiều vùng.',
        priceFrom: 'Từ $2,190',
        priceUnit: '/ người',
        note: 'Tham khảo · tùy chỉnh',
        href: '/packages/vietnam-highlights',
      },
      {
        badge: 'BEST PRICE',
        micro: '7–8 ngày · Bắc',
        title: 'Một tuần miền Bắc sâu cảm giác thế nào?',
        body: 'Miền Bắc tập trung hơn.',
        priceFrom: 'Từ $1,480',
        priceUnit: '/ người',
        note: 'Tham khảo · tùy chỉnh',
        href: '/packages/northern-vietnam',
      },
      {
        badge: 'POPULAR',
        micro: '8–9 ngày · Trung',
        title: 'Sẵn sàng ngày kinh thành và đêm đèn lồng?',
        body: 'Tuyến di sản nhẹ nhàng hơn.',
        priceFrom: 'Từ $1,620',
        priceUnit: '/ người',
        note: 'Tham khảo · tùy chỉnh',
        href: '/packages/central-heritage',
      },
      {
        badge: 'GIA ĐÌNH YÊU THÍCH',
        micro: '10 ngày · nhiều độ tuổi',
        title: 'Ông bà và trẻ nhỏ có thể chung một tuyến?',
        body: 'Ít đổi khách sạn và trải nghiệm văn hóa phù hợp cho mọi độ tuổi.',
        priceFrom: 'Từ $1,890',
        priceUnit: '/ người',
        note: 'Tham khảo · gia đình riêng · tùy chỉnh',
        href: '/packages/vietnam-highlights#family',
      },
      {
        badge: 'KẾT THÚC ÊM',
        micro: '8 ngày · kết thúc miền Nam',
        title: 'Nếu những ngày cuối chậm hơn mà không kém sâu?',
        body: 'Ánh đèn Hội An nối vườn cây và nhà nghỉ ven sông Mekong.',
        priceFrom: 'Từ $1,540',
        priceUnit: '/ người',
        note: 'Tham khảo · cặp riêng · tùy chỉnh',
        href: '/packages#south',
      },
    ],
  },
  guide: {
    listTitle: 'Ghi chú du lịch mới',
    notes: [
      {
        title: 'Khi nào nên đi miền Bắc',
        body: 'Mùa, thời tiết và đánh đổi nhịp độ cho cửa ngõ phía Bắc.',
        href: '/travel-guide#north-seasons',
      },
      {
        title: 'Huế và Hội An không mệt khách sạn',
        body: 'Cách ghép ngày di sản mà không di chuyển quá nhiều.',
        href: '/travel-guide#central-routes',
      },
      {
        title: 'Chuyển chặng bảo vệ nhịp ngày',
        body: 'Khi nào quãng đường dài hơn vẫn đáng.',
        href: '/travel-guide#protect-pacing',
      },
    ],
    cta: 'Đã đọc ghi chú — sẵn sàng brief?',
  },
  about: {
    storyTitle: 'Dành cho khách muốn tuyến riêng, không checkout catalogue',
    stepsTitle: 'Bốn bước từ brief đến hành trình riêng',
    promisesTitle: 'Bốn cam kết. Không jargon.',
    promises: [
      { title: 'Riêng theo mặc định', body: 'Tuyến theo đoàn của bạn — không ghế xe cố định.' },
      { title: 'Thiết kế địa phương', body: 'Planner tại Việt Nam giữ định hướng đầu.' },
      { title: 'Phản hồi rõ', body: 'Email định hướng trong 1 ngày làm việc (GMT+7).' },
      { title: 'Bằng chứng thật', body: 'Chỉ giấy phép và giải thưởng đã công bố.' },
    ],
    teamTitle: 'Người đứng sau brief',
    teamLede:
      'Ảnh planner chỉ đăng khi đã có chân dung được duyệt — không dùng stock làm đội ngũ giả.',
  },
  contact: {
    channelsTitle: 'Kênh liên hệ',
    nextTitle: 'Tiếp theo ra sao — cùng bàn với Plan',
    nextSteps: [
      'Chúng tôi đọc phần cần thiết',
      'Ghép nơi + nhịp',
      'Bạn nhận email định hướng',
      'Chỉnh khi sẵn sàng',
    ],
    channels: [
      { label: 'Email', value: 'hello@wingside.vn', href: 'mailto:hello@wingside.vn' },
      { label: 'Điện thoại', value: '+84 903 000 222', href: 'tel:+84903000222' },
      { label: 'WhatsApp', value: '+84 903 000 222', href: 'https://wa.me/84903000222' },
    ],
  },
  creds: {
    appointmentType: 'Bổ nhiệm hàng không',
    ariaLabel: 'Chứng nhận và giải thưởng',
    awardedEntity: 'Đơn vị được ghi nhận',
    awardType: 'Giải thưởng hiệu quả',
    close: 'Đóng',
    ctaPlanPrivateJourney: 'Lập kế hoạch hành trình riêng',
    dialogLabel: 'Xem trước tài liệu chứng nhận',
    filterAll: 'Tất cả bằng chứng',
    filterAppointments: 'Bổ nhiệm hàng không',
    filterAwards: 'Giải thưởng hiệu quả',
    filterGroupLabel: 'Lọc chứng nhận',
    inspectOriginal: 'Xem bản gốc',
    issuedBy: 'Đơn vị cấp',
    kicker: 'Chứng nhận & giải thưởng',
    title: 'Bằng chứng có thể kiểm chứng, không chỉ là lời giới thiệu',
    lede: 'Hồ sơ bổ nhiệm hàng không và ghi nhận hiệu quả được công bố từ chứng nhận gốc.',
    missingField: 'Không nêu trên tài liệu',
    prev: 'Chứng nhận trước',
    next: 'Chứng nhận sau',
    proofType: 'Loại bằng chứng',
    recordsLabel: 'hồ sơ',
    thumbnailRailLabel: 'Danh mục chứng nhận',
    verifiedArchiveLabel: 'Hồ sơ đã xác minh',
    viewDocument: 'Xem tài liệu',
    year: 'Năm',
  },
}

const it: SectionCopy = {
  heroTitle: 'Viaggi su misura in Vietnam',
  heroLede: 'Percorsi privati con un desk locale — non una griglia tour retail.',
  home: {
    pillarsKicker: 'Come funziona WingSide',
    pillarsTitle: 'Quattro passi dal brief al percorso privato',
    pillarsLede:
      'Un desk di pianificazione locale. Inviate l’essenziale — progettiamo il viaggio e rispondiamo entro 1 giorno lavorativo (GMT+7).',
    whyKicker: 'Perché viaggiare con WingSide',
    whyTitle: 'Design locale. Pianificazione flessibile. Matching reale.',
    whyFeatured: {
      badge: 'In evidenza',
      title: 'Percorsi progettati sul posto',
      body: 'Operatori sul terreno definiscono ritmo e combinazioni — non template da catalogo.',
      cta: 'Come pianifichiamo →',
      href: '/plan-your-trip',
    },
    whyCards: [
      {
        title: 'Pianificazione flessibile',
        body: 'Ritmo intorno a famiglia e fermate business.',
        cta: 'Esplora →',
        href: '/destinations',
      },
      {
        title: 'Matching di stile',
        body: 'Lusso, famiglia, cultura — prima della bozza.',
        cta: 'Stili →',
        href: '/styles',
      },
      {
        title: 'Cura collaborativa',
        body: 'Co-progettate inclusioni e logistica col planner.',
        cta: 'Chi siamo →',
        href: '/about-us',
      },
    ],
    destKicker: 'Hub destinazioni',
    destTitle: 'Dove può andare il tuo percorso',
    destLede:
      'Segna i luoghi prima — icone del Nord, patrimonio centrale o ritmo del Sud più soft.',
    destExplore: 'Esplora →',
    stylesKicker: 'Stili di viaggio',
    stylesTitle: 'Come vuoi viaggiare',
    stylesMatch: 'Abbina →',
    journeysKicker: 'Itinerari di esempio',
    journeysTitle: 'Quale storia del Vietnam ti attira per prima?',
    journeysLede:
      'Cornici private che gli ospiti aprono di più — reagite alla forma, poi la riscriviamo sulle vostre date. Non partenze di gruppo fisse.',
    notesKicker: 'Note dei viaggiatori',
    notesTitle: 'Cosa chiedono gli ospiti prima di scrivere',
    notes: [
      {
        title: 'Ritmo e inclusioni',
        body: 'Cosa è incluso giorno per giorno, e quanto è impegnativo il ritmo per età miste?',
      },
      {
        title: 'Stile prima degli hotel',
        body: 'Abbiniamo lo stile di viaggio prima — poi gli hotel, non il contrario.',
      },
      {
        title: 'Nord vs centro',
        body: 'Possiamo unire icone del Nord e patrimonio centrale senza fretta?',
      },
    ],
    trust: [
      {
        kind: 'sla',
        title: 'SLA di risposta',
        body: 'Email di direzione entro 1 giorno lavorativo (GMT+7).',
      },
      {
        kind: 'proof',
        title: 'Prova',
        body: 'Solo licenze e premi pubblicati compaiono qui.',
      },
      {
        kind: 'planner',
        title: 'Il tuo planner',
        body: 'Un desk locale nominato possiede la prima bozza.',
      },
    ],
    plannerNamePlaceholder: '[ Nome quando pronto ]',
    closeTitle: 'Pronto a dare forma a un viaggio privato?',
    closeLede: 'Invia un breve brief — un planner risponde entro 1 giorno lavorativo (GMT+7).',
    closeCta: 'Pianifica',
    closeCtaSecondary: 'Contattaci',
    continueKicker: 'Continua',
    exploreDestinations: 'Esplora le destinazioni',
    planTripCta: 'Pianifica',
    related: [
      { title: 'Destinazioni →', body: 'Segna i luoghi prima del brief.', href: '/destinations' },
      {
        title: 'Itinerari di esempio →',
        body: 'Cornici da reagire — non gruppi fissi.',
        href: '/packages',
      },
      {
        title: 'Pianifica il viaggio →',
        body: 'Brief completo con mese e gruppo.',
        href: '/plan-your-trip',
      },
    ],
  },
  plan: {
    heroKicker: 'Conversione · brief completo',
    heroTitle: 'Pianifica il tuo Vietnam con un team locale',
    heroLede:
      'Percorsi, hotel e ritmo su misura. Condividi mese, gruppo, destinazioni e stile — risposta entro 1 giorno lavorativo (GMT+7).',
    primaryCtaLabel: 'Condividi il brief',
    breadcrumbCurrent: 'Pianifica il viaggio',
    mediaCap: 'Ha Long · ritmo crociera',
    stepsKicker: 'Come funziona WingSide',
    stepsTitle: 'Quattro passi dal brief al percorso privato',
    stepsLede:
      'Lo stesso desk della Home. Inviate l’essenziale — progettiamo e rispondiamo entro 1 giorno lavorativo (GMT+7).',
    steps: [
      {
        label: 'Passo 1 · Brief',
        title: 'Dicci l’essenziale',
        body: 'Mese, gruppo, destinazioni (o regione) e come viaggiare — usate il modulo sotto.',
      },
      {
        label: 'Passo 2 · Match',
        title: 'Abbiniamo luogo + ritmo',
        body: 'Un planner mappa città, durata e stile sul vostro mese — non un pacchetto catalogo fisso.',
      },
      {
        label: 'Passo 3 · Bozza',
        title: 'Ricevi una bozza privata',
        body: 'Traccia, fascia hotel e transfer — scritti per il vostro gruppo. Risposta: 1 giorno lavorativo.',
      },
      {
        label: 'Passo 4 · Lock',
        title: 'Raffina, poi chiudi',
        body: 'Scambiate giorni, hotel o inclusioni fino a che non calza — poi chiudiamo logistica sul posto.',
      },
    ],
    briefKicker: 'Brief · conversione primaria',
    briefTitle: 'Condividi il brief di viaggio',
    formTitle: 'Il tuo brief',
    promises: [
      'Risposta tipica: entro 1 giorno lavorativo',
      'Consulenza su tempi e budget reali',
      'Percorso privato — non solo griglia retail',
    ],
    guestNote: 'Preferiamo meno trasferimenti e hotel allineati al ritmo.',
    faqKicker: 'Domande di pianificazione',
    faqTitle: 'FAQ inbound',
    faq: [
      {
        question: 'Serve un itinerario completo prima di contattarci?',
        answer: 'No. Mese, gruppo, stile e alcuni must-see bastano per una prima direzione.',
      },
      {
        question: 'Con quanto anticipo pianificare?',
        answer: 'Nei mesi di punta (mar–apr, ott–nov), 3–6 mesi aiutano hotel e guide preferiti.',
      },
      {
        question: 'Lingue della guida privata?',
        answer: 'L’inglese è standard; italiano, spagnolo, portoghese e francese su richiesta.',
      },
      {
        question: 'Migliori mesi nord vs sud?',
        answer: 'Il nord brilla in primavera/autunno; il sud è più annuale con pioggia sul Mekong.',
      },
      {
        question: 'Visto per soggiorni brevi?',
        answer:
          'Le regole cambiano per nazionalità. Condividiamo una checklist pratica, non consulenza legale.',
      },
      {
        question: 'Possiamo aggiungere fast track aeroporto dopo?',
        answer:
          'Sì. Fast track, transfer e cambi hotel si possono aggiungere dopo la prima direzione.',
      },
    ],
    exploreTitle: 'Esplora prima del brief',
    explore: [
      { title: 'Destinazioni →', body: 'Vedi dove vanno i percorsi.', href: '/destinations' },
      { title: 'Stili di viaggio →', body: 'Abbina uno stile prima delle date.', href: '/styles' },
      {
        title: 'Pacchetti di esempio →',
        body: 'Forme di viaggio a cui reagire.',
        href: '/packages',
      },
    ],
    destChips: ['Ha Long', 'Hoi An', 'Sapa', 'Hue', 'Mekong'],
    styleChips: ['Patrimonio', 'Cibo', 'Mare', 'Famiglia'],
    budgetChips: ['$', '$$', '$$$'],
    destChipsLabel: 'Destinazioni',
    styleChipsLabel: 'Stile di viaggio',
    budgetChipsLabel: 'Budget / persona',
    consentLabel:
      'Accetto l’informativa privacy. Usiamo i dati solo per rispondere (mercati GDPR).',
  },
  destinations: {
    routesTitle: 'Percorsi multi-città di esempio',
    deeperTitle: 'Scegli un luogo per approfondire',
    routes: [
      {
        title: 'Porta del Nord',
        body: 'Hanoi · Ha Long · altopiani.',
        href: '/destinations/ha-noi',
      },
      {
        title: 'Patrimonio centrale',
        body: 'Hue e Hoi An senza fatica hotel.',
        href: '/destinations/hue',
      },
      {
        title: 'Ritmo del delta',
        body: 'Giorni Mekong più morbidi.',
        href: '/destinations/mekong',
      },
    ],
    places: [
      {
        title: 'Hanoi',
        body: 'Patrimonio, cibo e porta del nord.',
        href: '/destinations/ha-noi',
        region: 'Nord',
      },
      {
        title: 'Ha Long',
        body: 'Ritmo di crociera e paesaggi marini.',
        href: '/destinations/ha-long',
        region: 'Nord',
      },
      {
        title: 'Hoi An',
        body: 'Lantern streets e sere più lente.',
        href: '/destinations/hoi-an',
        region: 'Centro',
      },
      {
        title: 'Hue',
        body: 'Giorni di cittadella e patrimonio centrale.',
        href: '/destinations/hue',
        region: 'Centro',
      },
      {
        title: 'Mekong',
        body: 'Ritmo del delta più soft.',
        href: '/destinations/mekong',
        region: 'Sud',
      },
      {
        title: 'Sapa',
        body: 'Terrazzamenti e notti fresche.',
        href: '/destinations',
        region: 'Nord',
      },
    ],
  },
  styles: {
    introTitle: 'Scegli il ritmo prima dei luoghi',
    styles: [
      { title: 'Lusso', body: 'Ritmo raffinato, hotel, hosting.', href: '/styles/luxury' },
      { title: 'Famiglia', body: 'Giornate equilibrate per età miste.', href: '/styles/family' },
      { title: 'Cultura', body: 'Storie, contesto, cibo, patrimonio.', href: '/styles/culture' },
      { title: 'Avventura', body: 'Un ritmo di percorso più attivo.', href: '/styles/adventure' },
      { title: 'Wellness', body: 'Giorni più soft e recupero.', href: '/styles#wellness' },
      { title: 'Romantico', body: 'Lune di miele e fughe da ricordare.', href: '/styles#romance' },
    ],
    cta: 'Stile scelto? Portalo nel brief',
  },
  packages: {
    gridTitle: 'Quale storia del Vietnam ti attira per prima?',
    gridLede:
      'Cornici private che gli ospiti aprono di più — reagisci alla forma, poi la riscriviamo sulle tue date. Non partenze di gruppo bloccate.',
    cards: [
      {
        badge: 'HOT PICK',
        micro: '10–12 giorni · Nord + Centro',
        title: 'Un viaggio copre le icone — senza la fretta?',
        body: 'Una cornice multi-regione per il primo viaggio.',
        priceFrom: 'Da $2,190',
        priceUnit: '/ persona',
        note: 'Indicativo · personalizza',
        href: '/packages/vietnam-highlights',
      },
      {
        badge: 'BEST PRICE',
        micro: '7–8 giorni · Nord',
        title: 'Come si sente una settimana profonda nel Nord?',
        body: 'Nord del Vietnam più a fuoco.',
        priceFrom: 'Da $1,480',
        priceUnit: '/ persona',
        note: 'Indicativo · personalizza',
        href: '/packages/northern-vietnam',
      },
      {
        badge: 'POPULAR',
        micro: '8–9 giorni · Centro',
        title: 'Pronto per cittadella e notti di lanterne?',
        body: 'Una rotta patrimonio più morbida.',
        priceFrom: 'Da $1,620',
        priceUnit: '/ persona',
        note: 'Indicativo · personalizza',
        href: '/packages/central-heritage',
      },
      {
        badge: 'FAMILY FAVORITE',
        micro: '10 giorni · età miste',
        title: 'Nonni e bambini possono condividere una rotta?',
        body: 'Meno cambi hotel e momenti culturali adatti a ogni età.',
        priceFrom: 'Da $1,890',
        priceUnit: '/ persona',
        note: 'Indicativo · famiglia privata · personalizza',
        href: '/packages/vietnam-highlights#family',
      },
      {
        badge: 'SOFT FINISH',
        micro: '8 giorni · finale Sud',
        title: 'E se gli ultimi giorni fossero più lenti, non più piccoli?',
        body: 'La luce di Hoi An verso frutteti e lodge sul Mekong.',
        priceFrom: 'Da $1,540',
        priceUnit: '/ persona',
        note: 'Indicativo · coppia privata · personalizza',
        href: '/packages#south',
      },
    ],
  },
  guide: {
    listTitle: 'Ultime note di viaggio',
    notes: [
      {
        title: 'Quando visitare il Nord Vietnam',
        body: 'Stagione, clima e compromessi di ritmo per la porta nord.',
        href: '/travel-guide#north-seasons',
      },
      {
        title: 'Hue e Hoi An senza fatica hotel',
        body: 'Come abbinare giorni di patrimonio senza muoversi troppo.',
        href: '/travel-guide#central-routes',
      },
      {
        title: 'Transfer che proteggono il ritmo',
        body: 'Quando un transfer più lungo vale la giornata che protegge.',
        href: '/travel-guide#protect-pacing',
      },
    ],
    cta: 'Note fatte — pronto per il brief?',
  },
  about: {
    storyTitle: 'Per chi vuole un percorso privato, non un checkout da catalogo',
    stepsTitle: 'Quattro passi dal brief al percorso privato',
    promisesTitle: 'Quattro promesse. Niente gergo.',
    promises: [
      {
        title: 'Privato di default',
        body: 'Percorsi per il tuo gruppo — non posti pullman fissi.',
      },
      { title: 'Design locale', body: 'Planner in Vietnam guidano la prima direzione.' },
      {
        title: 'Prima risposta chiara',
        body: 'Email di direzione entro 1 giorno lavorativo (GMT+7).',
      },
      { title: 'Prove oneste', body: 'Solo licenze e premi pubblicati.' },
    ],
    teamTitle: 'Le persone dietro il brief',
    teamLede:
      'I volti dei planner escono solo con ritratti approvati — niente stock come finta squadra.',
  },
  contact: {
    channelsTitle: 'Canali',
    nextTitle: 'Cosa succede dopo — stesso desk del Plan',
    nextSteps: [
      'Leggiamo l’essenziale',
      'Abbiniamo luogo + ritmo',
      'Ricevi un’email di direzione',
      'Raffina quando sei pronto',
    ],
    channels: [
      { label: 'Email', value: 'hello@wingside.vn', href: 'mailto:hello@wingside.vn' },
      { label: 'Telefono', value: '+84 903 000 222', href: 'tel:+84903000222' },
      { label: 'WhatsApp', value: '+84 903 000 222', href: 'https://wa.me/84903000222' },
    ],
  },
  creds: {
    appointmentType: 'Nomina aerea',
    ariaLabel: 'Certificati e premi',
    awardedEntity: 'Soggetto premiato',
    awardType: 'Premio di performance',
    close: 'Chiudi',
    ctaPlanPrivateJourney: 'Pianifica un viaggio privato',
    dialogLabel: 'Anteprima documento credenziale',
    filterAll: 'Tutte le prove',
    filterAppointments: 'Nomine aeree',
    filterAwards: 'Premi di performance',
    filterGroupLabel: 'Filtra credenziali',
    inspectOriginal: 'Ispeziona originale',
    issuedBy: 'Emesso da',
    kicker: 'Certificati e premi',
    title: 'Prove ispezionabili, non solo affermazioni',
    lede: 'Un archivio documentato di nomine aeree e riconoscimenti di performance pubblicati da certificati originali.',
    missingField: 'Non indicato nel documento',
    prev: 'Credenziale precedente',
    next: 'Credenziale successiva',
    proofType: 'Tipo di prova',
    recordsLabel: 'record',
    thumbnailRailLabel: 'Indice credenziali',
    verifiedArchiveLabel: 'Archivio verificato',
    viewDocument: 'Visualizza documento',
    year: 'Anno',
  },
}

const es: SectionCopy = {
  heroTitle: 'Viajes a medida por Vietnam',
  heroLede: 'Rutas privadas con un equipo local — no una rejilla de tours retail.',
  home: {
    pillarsKicker: 'Cómo funciona WingSide',
    pillarsTitle: 'Cuatro pasos del brief a la ruta privada',
    pillarsLede:
      'Un escritorio de planificación local. Envías lo esencial — diseñamos el viaje y respondemos en 1 día laborable (GMT+7).',
    whyKicker: 'Por qué viajar con WingSide',
    whyTitle: 'Diseño local. Planificación flexible. Emparejamiento real.',
    whyFeatured: {
      badge: 'Destacado',
      title: 'Rutas diseñadas en el terreno',
      body: 'Operadores locales marcan el ritmo y las combinaciones — no plantillas de catálogo.',
      cta: 'Cómo planificamos →',
      href: '/plan-your-trip',
    },
    whyCards: [
      {
        title: 'Planificación flexible',
        body: 'Ritmo alrededor de familia y paradas de negocio.',
        cta: 'Explorar →',
        href: '/destinations',
      },
      {
        title: 'Emparejamiento de estilo',
        body: 'Lujo, familia, cultura — antes del primer borrador.',
        cta: 'Estilos →',
        href: '/styles',
      },
      {
        title: 'Cuidado colaborativo',
        body: 'Co-diseña inclusiones y logística con tu planner.',
        cta: 'Nosotros →',
        href: '/about-us',
      },
    ],
    destKicker: 'Hub de destinos',
    destTitle: 'Adónde puede ir tu ruta',
    destLede:
      'Marca lugares primero — iconos del Norte, patrimonio central o ritmo del Sur más suave.',
    destExplore: 'Explorar →',
    stylesKicker: 'Estilos de viaje',
    stylesTitle: 'Cómo te gusta viajar',
    stylesMatch: 'Emparejar →',
    journeysKicker: 'Viajes de muestra',
    journeysTitle: '¿Qué historia de Vietnam te atrae primero?',
    journeysLede:
      'Marcos privados que más abren los huéspedes — reacciona a la forma y la reescribimos con tus fechas. No salidas de grupo fijas.',
    notesKicker: 'Notas de viajeros',
    notesTitle: 'Qué preguntan los huéspedes antes de escribir',
    notes: [
      {
        title: 'Ritmo e inclusiones',
        body: 'Qué incluye cada día y qué tan exigente es el ritmo para edades mixtas.',
      },
      {
        title: 'Estilo antes que hoteles',
        body: 'Emparejamos el estilo de viaje primero — luego los hoteles.',
      },
      {
        title: 'Norte vs centro',
        body: '¿Podemos combinar iconos del Norte con patrimonio central sin prisas?',
      },
    ],
    trust: [
      {
        kind: 'sla',
        title: 'SLA de respuesta',
        body: 'Email de dirección en 1 día laborable (GMT+7).',
      },
      {
        kind: 'proof',
        title: 'Prueba',
        body: 'Solo licencias y premios publicados aparecen aquí.',
      },
      {
        kind: 'planner',
        title: 'Tu planner',
        body: 'Un escritorio local nombrado posee el primer borrador.',
      },
    ],
    plannerNamePlaceholder: '[ Nombre cuando esté listo ]',
    closeTitle: '¿Listo para dar forma a un viaje privado?',
    closeLede: 'Envía un brief corto — un planner responde en 1 día laborable (GMT+7).',
    closeCta: 'Planifica',
    closeCtaSecondary: 'Contáctanos',
    continueKicker: 'Continuar',
    exploreDestinations: 'Explorar destinos',
    planTripCta: 'Planifica',
    related: [
      { title: 'Destinos →', body: 'Marca lugares antes del brief.', href: '/destinations' },
      {
        title: 'Viajes de muestra →',
        body: 'Marcos para reaccionar — no grupos fijos.',
        href: '/packages',
      },
      {
        title: 'Planifica tu viaje →',
        body: 'Brief completo con mes y grupo.',
        href: '/plan-your-trip',
      },
    ],
  },
  plan: {
    heroKicker: 'Conversión · brief completo',
    heroTitle: 'Planifica tu viaje a Vietnam con un equipo local',
    heroLede:
      'Rutas, hoteles y ritmo a medida. Comparte mes, grupo, destinos y estilo — respuesta en 1 día laborable (GMT+7).',
    primaryCtaLabel: 'Comparte tu brief',
    breadcrumbCurrent: 'Planifica tu viaje',
    mediaCap: 'Ha Long · ritmo de crucero',
    stepsKicker: 'Cómo funciona WingSide',
    stepsTitle: 'Cuatro pasos del brief a la ruta privada',
    stepsLede:
      'El mismo escritorio que en Inicio. Envías lo esencial — diseñamos y respondemos en 1 día laborable (GMT+7).',
    steps: [
      {
        label: 'Paso 1 · Brief',
        title: 'Cuéntanos lo esencial',
        body: 'Mes, tamaño del grupo, destinos (o región) y cómo te gusta viajar — usa el formulario abajo.',
      },
      {
        label: 'Paso 2 · Match',
        title: 'Emparejamos lugar + ritmo',
        body: 'Un planner mapea ciudades, duración y estilo según tu mes — no un paquete de catálogo fijo.',
      },
      {
        label: 'Paso 3 · Borrador',
        title: 'Recibe un borrador privado',
        body: 'Esquema de ruta, banda hotelera y transfers — escritos para tu grupo. Ventana: 1 día laborable.',
      },
      {
        label: 'Paso 4 · Cierre',
        title: 'Refina y cierra',
        body: 'Cambia días, hoteles o inclusiones juntos hasta que encaje — luego cerramos logística en el terreno.',
      },
    ],
    briefKicker: 'Brief · conversión principal',
    briefTitle: 'Comparte tu brief de viaje',
    formTitle: 'Tu brief',
    promises: [
      'Respuesta típica: en 1 día laborable',
      'Consejo según fechas y presupuesto reales',
      'Ruta privada — no solo una parrilla retail',
    ],
    guestNote: 'Priorizamos menos traslados y hoteles alineados al ritmo.',
    faqKicker: 'Preguntas de planificación',
    faqTitle: 'FAQ inbound',
    faq: [
      {
        question: '¿Necesito un itinerario completo antes de contactar?',
        answer:
          'No. Mes, grupo, estilo y algunos imprescindibles bastan para una primera dirección.',
      },
      {
        question: '¿Con cuánta antelación planificar?',
        answer:
          'En meses pico (mar–abr, oct–nov), 3–6 meses ayudan con hoteles y guías preferidos.',
      },
      {
        question: '¿Idiomas de guía privada?',
        answer: 'El inglés es estándar; italiano, español, portugués y francés bajo petición.',
      },
      {
        question: '¿Mejores meses norte vs sur?',
        answer: 'El norte brilla en primavera/otoño; el sur es más anual, con lluvia en el Mekong.',
      },
      {
        question: '¿Visa para estancias cortas?',
        answer:
          'Las reglas cambian por nacionalidad. Compartimos una checklist práctica, no consejo legal.',
      },
      {
        question: '¿Podemos añadir fast track de aeropuerto después?',
        answer:
          'Sí. Fast track, transfers y cambios de hotel se pueden añadir tras la primera dirección.',
      },
    ],
    exploreTitle: 'Explora antes del brief',
    explore: [
      { title: 'Destinos →', body: 'Mira a dónde van las rutas.', href: '/destinations' },
      {
        title: 'Estilos de viaje →',
        body: 'Empareja un estilo antes de las fechas.',
        href: '/styles',
      },
      {
        title: 'Paquetes de muestra →',
        body: 'Formas de viaje para reaccionar.',
        href: '/packages',
      },
    ],
    destChips: ['Ha Long', 'Hoi An', 'Sapa', 'Hue', 'Mekong'],
    styleChips: ['Patrimonio', 'Comida', 'Playa', 'Familia'],
    budgetChips: ['$', '$$', '$$$'],
    destChipsLabel: 'Destinos',
    styleChipsLabel: 'Estilo de viaje',
    budgetChipsLabel: 'Presupuesto / persona',
    consentLabel:
      'Acepto la política de privacidad. Solo usamos esto para responder (mercados GDPR).',
  },
  destinations: {
    routesTitle: 'Rutas multi-ciudad de muestra',
    deeperTitle: 'Elige un lugar para profundizar',
    routes: [
      {
        title: 'Puerta del Norte',
        body: 'Hanói · Ha Long · altiplano.',
        href: '/destinations/ha-noi',
      },
      {
        title: 'Patrimonio central',
        body: 'Hue y Hoi An sin fatiga de hoteles.',
        href: '/destinations/hue',
      },
      {
        title: 'Ritmo del delta',
        body: 'Días en el Mekong con ritmo más suave.',
        href: '/destinations/mekong',
      },
    ],
    places: [
      {
        title: 'Hanói',
        body: 'Patrimonio, comida y puerta del norte.',
        href: '/destinations/ha-noi',
        region: 'Norte',
      },
      {
        title: 'Ha Long',
        body: 'Ritmo de crucero y paisaje marino.',
        href: '/destinations/ha-long',
        region: 'Norte',
      },
      {
        title: 'Hoi An',
        body: 'Calles de faroles y tardes más lentas.',
        href: '/destinations/hoi-an',
        region: 'Centro',
      },
      {
        title: 'Hue',
        body: 'Días de ciudadela y patrimonio central.',
        href: '/destinations/hue',
        region: 'Centro',
      },
      {
        title: 'Mekong',
        body: 'Ritmo del delta más suave.',
        href: '/destinations/mekong',
        region: 'Sur',
      },
      {
        title: 'Sapa',
        body: 'Terrazas de montaña y noches frescas.',
        href: '/destinations',
        region: 'Norte',
      },
    ],
  },
  styles: {
    introTitle: 'Elige el ritmo antes que los lugares',
    styles: [
      { title: 'Lujo', body: 'Ritmo cuidado, hoteles, anfitrionía.', href: '/styles/luxury' },
      {
        title: 'Familia',
        body: 'Días equilibrados para distintas edades.',
        href: '/styles/family',
      },
      {
        title: 'Cultura',
        body: 'Historias, contexto, comida, patrimonio.',
        href: '/styles/culture',
      },
      { title: 'Aventura', body: 'Un ritmo de ruta más activo.', href: '/styles/adventure' },
      { title: 'Bienestar', body: 'Días más suaves y recuperación.', href: '/styles#wellness' },
      { title: 'Romance', body: 'Lunas de miel y escapadas memorables.', href: '/styles#romance' },
    ],
    cta: '¿Estilo elegido? Llévalo al brief',
  },
  packages: {
    gridTitle: '¿Qué historia de Vietnam te atrae primero?',
    gridLede:
      'Marcos privados que más abren los huéspedes — reacciona a la forma y la reescribimos con tus fechas. No salidas de grupo fijas.',
    cards: [
      {
        badge: 'HOT PICK',
        micro: '10–12 días · Norte + Centro',
        title: '¿Un viaje cubre los iconos — sin prisas?',
        body: 'Un primer marco multi-región.',
        priceFrom: 'Desde $2,190',
        priceUnit: '/ persona',
        note: 'Indicativo · personalizar',
        href: '/packages/vietnam-highlights',
      },
      {
        badge: 'BEST PRICE',
        micro: '7–8 días · Norte',
        title: '¿Cómo se siente una semana profunda en el Norte?',
        body: 'Norte de Vietnam con más foco.',
        priceFrom: 'Desde $1,480',
        priceUnit: '/ persona',
        note: 'Indicativo · personalizar',
        href: '/packages/northern-vietnam',
      },
      {
        badge: 'POPULAR',
        micro: '8–9 días · Centro',
        title: '¿Listo para ciudadela y noches de faroles?',
        body: 'Una ruta patrimonial más suave.',
        priceFrom: 'Desde $1,620',
        priceUnit: '/ persona',
        note: 'Indicativo · personalizar',
        href: '/packages/central-heritage',
      },
      {
        badge: 'FAVORITO FAMILIAR',
        micro: '10 días · edades mixtas',
        title: '¿Abuelos y niños pueden compartir una ruta?',
        body: 'Menos cambios de hotel y cultura diseñada para todas las edades.',
        priceFrom: 'Desde $1,890',
        priceUnit: '/ persona',
        note: 'Indicativo · familia privada · personalizar',
        href: '/packages/vietnam-highlights#family',
      },
      {
        badge: 'FINAL SUAVE',
        micro: '8 días · final Sur',
        title: '¿Y si los últimos días fueran más lentos, no menores?',
        body: 'La luz de Hoi An hacia huertos y alojamientos del Mekong.',
        priceFrom: 'Desde $1,540',
        priceUnit: '/ persona',
        note: 'Indicativo · pareja privada · personalizar',
        href: '/packages#south',
      },
    ],
  },
  guide: {
    listTitle: 'Últimas notas de viaje',
    notes: [
      {
        title: 'Cuándo visitar el Norte de Vietnam',
        body: 'Temporada, clima y ritmo para la puerta norte.',
        href: '/travel-guide#north-seasons',
      },
      {
        title: 'Hue y Hoi An sin fatiga de hoteles',
        body: 'Cómo combinar días de patrimonio sin moverse de más.',
        href: '/travel-guide#central-routes',
      },
      {
        title: 'Traslados que protegen el ritmo',
        body: 'Cuándo un traslado más largo vale el día que protege.',
        href: '/travel-guide#protect-pacing',
      },
    ],
    cta: '¿Notas listas — brief?',
  },
  about: {
    storyTitle: 'Para quien quiere una ruta privada, no un checkout de catálogo',
    stepsTitle: 'Cuatro pasos del brief a la ruta privada',
    promisesTitle: 'Cuatro promesas. Sin jerga.',
    promises: [
      { title: 'Privado por defecto', body: 'Rutas para tu grupo — no asientos fijos de autocar.' },
      { title: 'Diseño local', body: 'Planners en Vietnam guían la primera dirección.' },
      { title: 'Primera respuesta clara', body: 'Email de dirección en 1 día laborable (GMT+7).' },
      { title: 'Prueba honesta', body: 'Solo licencias y premios publicados.' },
    ],
    teamTitle: 'Personas detrás del brief',
    teamLede:
      'Los rostros de planners solo se publican con retratos aprobados — nada de stock como equipo falso.',
  },
  contact: {
    channelsTitle: 'Canales',
    nextTitle: 'Qué pasa después — mismo equipo que Plan',
    nextSteps: [
      'Leemos lo esencial',
      'Emparejamos lugar + ritmo',
      'Recibes un email de dirección',
      'Refinas cuando estés listo',
    ],
    channels: [
      { label: 'Email', value: 'hello@wingside.vn', href: 'mailto:hello@wingside.vn' },
      { label: 'Teléfono', value: '+84 903 000 222', href: 'tel:+84903000222' },
      { label: 'WhatsApp', value: '+84 903 000 222', href: 'https://wa.me/84903000222' },
    ],
  },
  creds: {
    appointmentType: 'Nombramiento aéreo',
    ariaLabel: 'Certificados y premios',
    awardedEntity: 'Entidad reconocida',
    awardType: 'Premio de rendimiento',
    close: 'Cerrar',
    ctaPlanPrivateJourney: 'Planificar un viaje privado',
    dialogLabel: 'Vista previa del documento',
    filterAll: 'Toda la prueba',
    filterAppointments: 'Nombramientos aéreos',
    filterAwards: 'Premios de rendimiento',
    filterGroupLabel: 'Filtrar credenciales',
    inspectOriginal: 'Inspeccionar original',
    issuedBy: 'Emitido por',
    kicker: 'Certificados y premios',
    title: 'Prueba inspeccionable, no solo afirmaciones',
    lede: 'Un archivo documentado de nombramientos aéreos y reconocimientos de rendimiento publicados desde certificados originales.',
    missingField: 'No consta en el documento',
    prev: 'Credencial anterior',
    next: 'Credencial siguiente',
    proofType: 'Tipo de prueba',
    recordsLabel: 'registros',
    thumbnailRailLabel: 'Índice de credenciales',
    verifiedArchiveLabel: 'Archivo verificado',
    viewDocument: 'Ver documento',
    year: 'Año',
  },
}

const pt: SectionCopy = {
  heroTitle: 'Viagens sob medida no Vietname',
  heroLede: 'Rotas privadas com uma equipa local — não uma grelha de tours retail.',
  home: {
    pillarsKicker: 'Como a WingSide funciona',
    pillarsTitle: 'Quatro passos do brief ao percurso privado',
    pillarsLede:
      'Uma mesa de planeamento local. Envia o essencial — desenhamos a viagem e respondemos em 1 dia útil (GMT+7).',
    whyKicker: 'Porque viajar com a WingSide',
    whyTitle: 'Design local. Planeamento flexível. Emparelhamento real.',
    whyFeatured: {
      badge: 'Destaque',
      title: 'Rotas desenhadas no terreno',
      body: 'Operadores no terreno definem ritmo e combinações — não templates de catálogo.',
      cta: 'Como planeamos →',
      href: '/plan-your-trip',
    },
    whyCards: [
      {
        title: 'Planeamento flexível',
        body: 'Ritmo em torno de família e paragens de negócios.',
        cta: 'Explorar →',
        href: '/destinations',
      },
      {
        title: 'Emparelhamento de estilo',
        body: 'Luxo, família, cultura — antes do primeiro rascunho.',
        cta: 'Estilos →',
        href: '/styles',
      },
      {
        title: 'Cuidado colaborativo',
        body: 'Co-desenhe inclusões e logística com o planner.',
        cta: 'Sobre →',
        href: '/about-us',
      },
    ],
    destKicker: 'Hub de destinos',
    destTitle: 'Para onde a sua rota pode ir',
    destLede:
      'Marque lugares primeiro — ícones do Norte, património central ou ritmo do Sul mais suave.',
    destExplore: 'Explorar →',
    stylesKicker: 'Estilos de viagem',
    stylesTitle: 'Como gosta de viajar',
    stylesMatch: 'Emparelhar →',
    journeysKicker: 'Itinerários de exemplo',
    journeysTitle: 'Que história do Vietname o atrai primeiro?',
    journeysLede:
      'Molduras privadas que os hóspedes abrem mais — reaja à forma e reescrevemos com as suas datas. Sem partidas de grupo bloqueadas.',
    notesKicker: 'Notas de viajantes',
    notesTitle: 'O que os hóspedes perguntam antes de escrever',
    notes: [
      {
        title: 'Ritmo e inclusões',
        body: 'O que está incluído dia a dia e quão exigente é o ritmo para idades mistas.',
      },
      {
        title: 'Estilo antes dos hotéis',
        body: 'Emparelhamos o estilo de viagem primeiro — depois os hotéis.',
      },
      {
        title: 'Norte vs centro',
        body: 'Podemos combinar ícones do Norte com património central sem pressa?',
      },
    ],
    trust: [
      {
        kind: 'sla',
        title: 'SLA de resposta',
        body: 'Email de direção em 1 dia útil (GMT+7).',
      },
      {
        kind: 'proof',
        title: 'Prova',
        body: 'Apenas licenças e prémios publicados aparecem aqui.',
      },
      {
        kind: 'planner',
        title: 'O seu planner',
        body: 'Uma mesa local nomeada possui o primeiro rascunho.',
      },
    ],
    plannerNamePlaceholder: '[ Nome quando pronto ]',
    closeTitle: 'Pronto para moldar uma viagem privada?',
    closeLede: 'Envie um brief curto — um planner responde em 1 dia útil (GMT+7).',
    closeCta: 'Planear',
    closeCtaSecondary: 'Contacte-nos',
    continueKicker: 'Continuar',
    exploreDestinations: 'Explorar destinos',
    planTripCta: 'Planear',
    related: [
      { title: 'Destinos →', body: 'Marque lugares antes do brief.', href: '/destinations' },
      {
        title: 'Itinerários de exemplo →',
        body: 'Molduras para reagir — não grupos fixos.',
        href: '/packages',
      },
      {
        title: 'Planear a viagem →',
        body: 'Brief completo com mês e grupo.',
        href: '/plan-your-trip',
      },
    ],
  },
  plan: {
    heroKicker: 'Conversão · brief completo',
    heroTitle: 'Planeie a sua viagem ao Vietname com uma equipa local',
    heroLede:
      'Rotas, hotéis e ritmo à medida. Partilhe mês, grupo, destinos e estilo — resposta em 1 dia útil (GMT+7).',
    primaryCtaLabel: 'Partilhe o seu brief',
    breadcrumbCurrent: 'Planear a viagem',
    mediaCap: 'Ha Long · ritmo de cruzeiro',
    stepsKicker: 'Como a WingSide funciona',
    stepsTitle: 'Quatro passos do brief ao percurso privado',
    stepsLede:
      'A mesma mesa da Home. Envia o essencial — desenhamos e respondemos em 1 dia útil (GMT+7).',
    steps: [
      {
        label: 'Passo 1 · Brief',
        title: 'Diga o essencial',
        body: 'Mês, tamanho do grupo, destinos (ou região) e como gosta de viajar — use o formulário abaixo.',
      },
      {
        label: 'Passo 2 · Match',
        title: 'Emparelhamos lugar + ritmo',
        body: 'Um planner mapeia cidades, duração e estilo ao seu mês — não um pacote de catálogo fixo.',
      },
      {
        label: 'Passo 3 · Rascunho',
        title: 'Receba um rascunho privado',
        body: 'Esboço de rota, faixa hoteleira e transfers — escritos para o seu grupo. Janela: 1 dia útil.',
      },
      {
        label: 'Passo 4 · Fecho',
        title: 'Refine e feche',
        body: 'Troque dias, hotéis ou inclusões juntos até encaixar — depois fechamos logística no terreno.',
      },
    ],
    briefKicker: 'Brief · conversão principal',
    briefTitle: 'Partilhe o seu brief de viagem',
    formTitle: 'O seu brief',
    promises: [
      'Resposta típica: em 1 dia útil',
      'Conselho com base em tempos e orçamento reais',
      'Rota privada — não só uma grelha retail',
    ],
    guestNote: 'Priorizamos menos transferências e hotéis alinhados ao ritmo.',
    faqKicker: 'Perguntas de planeamento',
    faqTitle: 'FAQ inbound',
    faq: [
      {
        question: 'Preciso de um itinerário completo antes de contactar?',
        answer: 'Não. Mês, grupo, estilo e alguns must-sees bastam para uma primeira direção.',
      },
      {
        question: 'Com quanta antecedência planear?',
        answer:
          'Nos meses de pico (mar–abr, out–nov), 3–6 meses ajudam com hotéis e guias preferidos.',
      },
      {
        question: 'Idiomas de guia privada?',
        answer: 'Inglês é padrão; italiano, espanhol, português e francês sob pedido.',
      },
      {
        question: 'Melhores meses norte vs sul?',
        answer: 'O norte brilha na primavera/outono; o sul é mais anual com chuva no Mekong.',
      },
      {
        question: 'Visto para estadias curtas?',
        answer:
          'As regras mudam por nacionalidade. Partilhamos uma checklist prática, não aconselhamento jurídico.',
      },
      {
        question: 'Podemos adicionar fast track no aeroporto depois?',
        answer:
          'Sim. Fast track, transfers e mudanças de hotel podem ser adicionados após a primeira direção.',
      },
    ],
    exploreTitle: 'Explore antes do brief',
    explore: [
      { title: 'Destinos →', body: 'Veja para onde as rotas vão.', href: '/destinations' },
      {
        title: 'Estilos de viagem →',
        body: 'Emparelhe um estilo antes das datas.',
        href: '/styles',
      },
      { title: 'Pacotes de exemplo →', body: 'Formas de viagem para reagir.', href: '/packages' },
    ],
    destChips: ['Ha Long', 'Hoi An', 'Sapa', 'Hue', 'Mekong'],
    styleChips: ['Património', 'Comida', 'Praia', 'Família'],
    budgetChips: ['$', '$$', '$$$'],
    destChipsLabel: 'Destinos',
    styleChipsLabel: 'Estilo de viagem',
    budgetChipsLabel: 'Orçamento / pessoa',
    consentLabel:
      'Aceito a política de privacidade. Só usamos isto para responder (mercados GDPR).',
  },
  destinations: {
    routesTitle: 'Rotas multi-cidade de exemplo',
    deeperTitle: 'Escolha um lugar para aprofundar',
    routes: [
      {
        title: 'Porta do Norte',
        body: 'Hanói · Ha Long · planalto.',
        href: '/destinations/ha-noi',
      },
      {
        title: 'Património central',
        body: 'Hue e Hoi An sem fadiga de hotéis.',
        href: '/destinations/hue',
      },
      {
        title: 'Ritmo do delta',
        body: 'Dias no Mekong com ritmo mais suave.',
        href: '/destinations/mekong',
      },
    ],
    places: [
      {
        title: 'Hanói',
        body: 'Património, comida e porta do norte.',
        href: '/destinations/ha-noi',
        region: 'Norte',
      },
      {
        title: 'Ha Long',
        body: 'Ritmo de cruzeiro e paisagem marítima.',
        href: '/destinations/ha-long',
        region: 'Norte',
      },
      {
        title: 'Hoi An',
        body: 'Ruas de lanternas e noites mais lentas.',
        href: '/destinations/hoi-an',
        region: 'Centro',
      },
      {
        title: 'Hue',
        body: 'Dias de cidadela e património central.',
        href: '/destinations/hue',
        region: 'Centro',
      },
      {
        title: 'Mekong',
        body: 'Ritmo do delta mais suave.',
        href: '/destinations/mekong',
        region: 'Sul',
      },
      {
        title: 'Sapa',
        body: 'Terraços de montanha e noites frescas.',
        href: '/destinations',
        region: 'Norte',
      },
    ],
  },
  styles: {
    introTitle: 'Escolha o ritmo antes dos lugares',
    styles: [
      { title: 'Luxo', body: 'Ritmo cuidado, hotéis, acolhimento.', href: '/styles/luxury' },
      { title: 'Família', body: 'Dias equilibrados para várias idades.', href: '/styles/family' },
      {
        title: 'Cultura',
        body: 'Histórias, contexto, comida, património.',
        href: '/styles/culture',
      },
      { title: 'Aventura', body: 'Um ritmo de rota mais ativo.', href: '/styles/adventure' },
      { title: 'Bem-estar', body: 'Dias mais suaves e recuperação.', href: '/styles#wellness' },
      { title: 'Romance', body: 'Luas de mel e escapadas memoráveis.', href: '/styles#romance' },
    ],
    cta: 'Estilo escolhido? Leve-o para o brief',
  },
  packages: {
    gridTitle: 'Que história do Vietname o atrai primeiro?',
    gridLede:
      'Molduras privadas que os hóspedes abrem mais — reaja à forma e reescrevemos com as suas datas. Sem partidas de grupo bloqueadas.',
    cards: [
      {
        badge: 'HOT PICK',
        micro: '10–12 dias · Norte + Centro',
        title: 'Uma viagem cobre os ícones — sem pressa?',
        body: 'Uma primeira moldura multi-região.',
        priceFrom: 'Desde $2,190',
        priceUnit: '/ pessoa',
        note: 'Indicativo · personalizar',
        href: '/packages/vietnam-highlights',
      },
      {
        badge: 'BEST PRICE',
        micro: '7–8 dias · Norte',
        title: 'Como se sente uma semana profunda no Norte?',
        body: 'Norte do Vietname com mais foco.',
        priceFrom: 'Desde $1,480',
        priceUnit: '/ pessoa',
        note: 'Indicativo · personalizar',
        href: '/packages/northern-vietnam',
      },
      {
        badge: 'POPULAR',
        micro: '8–9 dias · Centro',
        title: 'Pronto para cidadela e noites de lanternas?',
        body: 'Uma rota patrimonial mais suave.',
        priceFrom: 'Desde $1,620',
        priceUnit: '/ pessoa',
        note: 'Indicativo · personalizar',
        href: '/packages/central-heritage',
      },
      {
        badge: 'FAVORITO FAMILIAR',
        micro: '10 dias · idades mistas',
        title: 'Avós e crianças podem partilhar uma rota?',
        body: 'Menos mudanças de hotel e cultura pensada para todas as idades.',
        priceFrom: 'Desde $1,890',
        priceUnit: '/ pessoa',
        note: 'Indicativo · família privada · personalizar',
        href: '/packages/vietnam-highlights#family',
      },
      {
        badge: 'FINAL SUAVE',
        micro: '8 dias · final Sul',
        title: 'E se os últimos dias fossem mais lentos, não menores?',
        body: 'A luz de Hoi An segue para pomares e lodges no Mekong.',
        priceFrom: 'Desde $1,540',
        priceUnit: '/ pessoa',
        note: 'Indicativo · casal privado · personalizar',
        href: '/packages#south',
      },
    ],
  },
  guide: {
    listTitle: 'Últimas notas de viagem',
    notes: [
      {
        title: 'Quando visitar o Norte do Vietname',
        body: 'Estação, clima e ritmo para a porta norte.',
        href: '/travel-guide#north-seasons',
      },
      {
        title: 'Hue e Hoi An sem fadiga de hotéis',
        body: 'Como combinar dias de património sem se mover demais.',
        href: '/travel-guide#central-routes',
      },
      {
        title: 'Transfers que protegem o ritmo',
        body: 'Quando um transfer mais longo vale o dia que protege.',
        href: '/travel-guide#protect-pacing',
      },
    ],
    cta: 'Notas feitas — pronto para o brief?',
  },
  about: {
    storyTitle: 'Para quem quer uma rota privada, não um checkout de catálogo',
    stepsTitle: 'Quatro passos do brief ao percurso privado',
    promisesTitle: 'Quatro promessas. Sem jargão.',
    promises: [
      {
        title: 'Privado por predefinição',
        body: 'Rotas para o seu grupo — não lugares fixos de autocarro.',
      },
      { title: 'Design local', body: 'Planners no Vietname guiam a primeira direção.' },
      { title: 'Primeira resposta clara', body: 'Email de direção em 1 dia útil (GMT+7).' },
      { title: 'Prova honesta', body: 'Apenas licenças e prémios publicados.' },
    ],
    teamTitle: 'Pessoas por trás do brief',
    teamLede: 'Rostos de planners só saem com retratos aprovados — sem stock como equipa falsa.',
  },
  contact: {
    channelsTitle: 'Canais',
    nextTitle: 'O que acontece a seguir — a mesma equipa do Plan',
    nextSteps: [
      'Lemos o essencial',
      'Emparelhamos lugar + ritmo',
      'Recebe um email de direção',
      'Refine quando estiver pronto',
    ],
    channels: [
      { label: 'Email', value: 'hello@wingside.vn', href: 'mailto:hello@wingside.vn' },
      { label: 'Telefone', value: '+84 903 000 222', href: 'tel:+84903000222' },
      { label: 'WhatsApp', value: '+84 903 000 222', href: 'https://wa.me/84903000222' },
    ],
  },
  creds: {
    appointmentType: 'Nomeação aérea',
    ariaLabel: 'Certificados e prémios',
    awardedEntity: 'Entidade reconhecida',
    awardType: 'Prémio de desempenho',
    close: 'Fechar',
    ctaPlanPrivateJourney: 'Planear uma viagem privada',
    dialogLabel: 'Pré-visualização do documento',
    filterAll: 'Toda a prova',
    filterAppointments: 'Nomeações aéreas',
    filterAwards: 'Prémios de desempenho',
    filterGroupLabel: 'Filtrar credenciais',
    inspectOriginal: 'Inspecionar original',
    issuedBy: 'Emitido por',
    kicker: 'Certificados e prémios',
    title: 'Prova que pode inspecionar, não apenas afirmações',
    lede: 'Um arquivo documentado de nomeações aéreas e reconhecimento de desempenho publicado a partir de certificados originais.',
    missingField: 'Não consta no documento',
    prev: 'Credencial anterior',
    next: 'Credencial seguinte',
    proofType: 'Tipo de prova',
    recordsLabel: 'registos',
    thumbnailRailLabel: 'Índice de credenciais',
    verifiedArchiveLabel: 'Arquivo verificado',
    viewDocument: 'Ver documento',
    year: 'Ano',
  },
}

const byLocale: Partial<Record<SupportedLocaleCode, SectionCopy>> = {
  en,
  vi,
  it,
  es,
  pt,
}

export const getWingsSideHiFiCopy = (locale?: null | string): SectionCopy => {
  if (locale && locale in byLocale) return byLocale[locale as SupportedLocaleCode] || en
  return byLocale[getCopyLocale(locale)] || en
}
