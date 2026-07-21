import { getCopyLocale, type SupportedLocaleCode } from '@/utilities/locales'

type CredsCopy = {
  ariaLabel: string
  kicker: string
  title: string
  lede: string
  slides: Array<{
    kind: 'cert' | 'award' | 'member' | 'iso'
    mark: string
    micro: string
    title: string
    body: string
  }>
  next: string
  prev: string
}

export type SectionCopy = {
  plan: {
    stepsKicker: string
    stepsTitle: string
    stepsLede: string
    steps: Array<{ label: string; title: string; body: string }>
    faqTitle: string
    exploreTitle: string
    explore: Array<{ title: string; body: string; href: string }>
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
  home: {
    pillarsKicker: 'How WingsSide works',
    pillarsTitle: 'Four steps from brief to private route',
    pillarsLede:
      'One local planning desk. You send the essentials — we design the journey and reply within 1 business day (GMT+7).',
    whyKicker: 'Why travel with WingsSide',
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
        body: 'Pace around family and business stops.',
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
      { title: 'Sample journeys →', body: 'Frames to react to — not fixed groups.', href: '/packages' },
      { title: 'Plan your trip →', body: 'Full brief when you know month & group.', href: '/plan-your-trip' },
    ],
  },
  plan: {
    stepsKicker: 'How WingsSide works',
    stepsTitle: 'Four steps from brief to private route',
    stepsLede:
      'One local planning desk. You send the essentials — we design the journey and reply within 1 business day (GMT+7).',
    steps: [
      {
        label: 'Step 1 · Brief',
        title: 'Tell us the essentials',
        body: 'Destination (or region), travel month, group size, and how you like to travel — via the home planner or full brief.',
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
        body: 'Swap days, hotels, or inclusions together until it fits — then we lock logistics and confirm on the ground.',
      },
    ],
    faqTitle: 'Inbound FAQ',
    exploreTitle: 'Explore before you brief',
    explore: [
      { title: 'Destinations →', body: 'Mark places first.', href: '/destinations' },
      { title: 'Travel styles →', body: 'Pick pace before places.', href: '/styles' },
      { title: 'Sample packages →', body: 'Frames to react to.', href: '/packages' },
    ],
  },
  destinations: {
    routesTitle: 'Sample multi-city routes',
    deeperTitle: 'Pick a place to go deeper',
    routes: [
      { title: 'North gateway', body: 'Hanoi · Ha Long · highland contrast.', href: '/destinations/ha-noi' },
      { title: 'Central heritage', body: 'Hue and Hoi An without hotel fatigue.', href: '/destinations/hue' },
      { title: 'Delta rhythm', body: 'Mekong days with softer pacing.', href: '/destinations/mekong' },
    ],
    places: [
      {
        title: 'Hanoi',
        body: 'Heritage, food, and the northern gateway.',
        href: '/destinations/ha-noi',
        region: 'North',
      },
      {
        title: 'Ha Long',
        body: 'Cruise rhythm and seascape contrast.',
        href: '/destinations/ha-long',
        region: 'North',
      },
      {
        title: 'Hoi An',
        body: 'Lantern streets and slower evenings.',
        href: '/destinations/hoi-an',
        region: 'Central',
      },
      {
        title: 'Hue',
        body: 'Citadel days and central heritage pairing.',
        href: '/destinations/hue',
        region: 'Central',
      },
      {
        title: 'Mekong',
        body: 'Delta rhythm with softer pacing.',
        href: '/destinations/mekong',
        region: 'South',
      },
      {
        title: 'Sapa',
        body: 'Highland terraces and cooler nights.',
        href: '/destinations',
        region: 'North',
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
      { title: 'Wellness', body: 'Softer days and recovery space.', href: '/styles' },
      { title: 'Business', body: 'Meetings with cultural contrast.', href: '/styles' },
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
    ],
  },
  guide: {
    listTitle: 'Latest travel notes',
    notes: [
      {
        title: 'When to visit North Vietnam',
        body: 'Season, weather, and pacing trade-offs for the gateway north.',
        href: '/travel-guide',
      },
      {
        title: 'Hue and Hoi An without hotel fatigue',
        body: 'How to pair heritage days without over-moving.',
        href: '/travel-guide',
      },
      {
        title: 'Transfers that protect your pacing',
        body: 'When a longer transfer is worth the day it protects.',
        href: '/travel-guide',
      },
    ],
    cta: 'Notes done — ready to brief?',
  },
  about: {
    storyTitle: 'Built for guests who want a private route, not a catalogue checkout',
    stepsTitle: 'Four steps from brief to private route',
    promisesTitle: 'Four promises. No jargon.',
    promises: [
      { title: 'Private by default', body: 'Routes are shaped for your group — not fixed coach seats.' },
      { title: 'Local design', body: 'Planners based in Vietnam own the first direction.' },
      { title: 'Clear first reply', body: 'Expect a direction email within 1 business day (GMT+7).' },
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
    ],
  },
  creds: {
    ariaLabel: 'Certificates and awards',
    kicker: 'Certificates & awards',
    title: 'Trusted standards when held',
    lede: 'Licenses, standards, and awards we can verify — only published marks appear here.',
    prev: 'Previous credential',
    next: 'Next credential',
    slides: [
      {
        kind: 'cert',
        mark: 'Cert',
        micro: 'Certificates · slots ready',
        title: 'Travel license · accreditation · quality',
        body: 'Only ship real badges. Placeholder until the license scan is confirmed — never invent seals.',
      },
      {
        kind: 'iso',
        mark: 'ISO',
        micro: 'Standards · field',
        title: 'Quality & operating standards',
        body: 'Leave hidden until documentation is on file. No invented standards marks.',
      },
      {
        kind: 'award',
        mark: 'Award',
        micro: 'Awards · field',
        title: 'Logo slots ready',
        body: 'Hidden until verified assets land. Never invent awards — swap this slide for a real mark when approved.',
      },
      {
        kind: 'member',
        mark: 'Member',
        micro: 'Memberships · optional',
        title: 'Industry memberships',
        body: 'Only list affiliations that stay current year to year.',
      },
    ],
  },
}

const vi: SectionCopy = {
  home: {
    pillarsKicker: 'Cách WingsSide làm việc',
    pillarsTitle: 'Bốn bước từ brief đến hành trình riêng',
    pillarsLede:
      'Một bàn lập kế hoạch địa phương. Bạn gửi thông tin cốt lõi — chúng tôi thiết kế hành trình và trả lời trong 1 ngày làm việc (GMT+7).',
    whyKicker: 'Vì sao đi với WingsSide',
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
      { title: 'Hành trình mẫu →', body: 'Khung để phản ứng — không tour cố định.', href: '/packages' },
      { title: 'Lên kế hoạch →', body: 'Brief đầy đủ khi đã có tháng & đoàn.', href: '/plan-your-trip' },
    ],
  },
  plan: {
    stepsKicker: 'Cách WingsSide làm việc',
    stepsTitle: 'Bốn bước từ brief đến hành trình riêng',
    stepsLede:
      'Một bàn lập kế hoạch địa phương. Bạn gửi thông tin cốt lõi — chúng tôi thiết kế hành trình và trả lời trong 1 ngày làm việc (GMT+7).',
    steps: [
      {
        label: 'Bước 1 · Brief',
        title: 'Nói điều cần thiết',
        body: 'Điểm đến (hoặc vùng), tháng đi, quy mô đoàn và cách bạn muốn đi — qua planner Home hoặc brief đầy đủ.',
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
        body: 'Đổi ngày, khách sạn hoặc dịch vụ cùng nhau cho đến khi vừa — rồi chốt logistics và xác nhận trên mặt đất.',
      },
    ],
    faqTitle: 'Câu hỏi thường gặp',
    exploreTitle: 'Khám phá trước khi gửi brief',
    explore: [
      { title: 'Điểm đến →', body: 'Chọn nơi trước.', href: '/destinations' },
      { title: 'Phong cách →', body: 'Chọn nhịp trước nơi.', href: '/styles' },
      { title: 'Gói mẫu →', body: 'Khung để phản ứng.', href: '/packages' },
    ],
  },
  destinations: {
    routesTitle: 'Tuyến nhiều điểm mẫu',
    deeperTitle: 'Chọn nơi để đi sâu hơn',
    routes: [
      { title: 'Cửa ngõ miền Bắc', body: 'Hà Nội · Hạ Long · cao nguyên.', href: '/destinations/ha-noi' },
      { title: 'Di sản miền Trung', body: 'Huế và Hội An không mệt khách sạn.', href: '/destinations/hue' },
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
      { title: 'Chăm sóc sức khỏe', body: 'Ngày nhẹ và không gian phục hồi.', href: '/styles' },
      { title: 'Công tác', body: 'Họp kết hợp trải nghiệm văn hóa.', href: '/styles' },
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
    ],
  },
  guide: {
    listTitle: 'Ghi chú du lịch mới',
    notes: [
      {
        title: 'Khi nào nên đi miền Bắc',
        body: 'Mùa, thời tiết và đánh đổi nhịp độ cho cửa ngõ phía Bắc.',
        href: '/travel-guide',
      },
      {
        title: 'Huế và Hội An không mệt khách sạn',
        body: 'Cách ghép ngày di sản mà không di chuyển quá nhiều.',
        href: '/travel-guide',
      },
      {
        title: 'Chuyển chặng bảo vệ nhịp ngày',
        body: 'Khi nào quãng đường dài hơn vẫn đáng.',
        href: '/travel-guide',
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
    ],
  },
  creds: {
    ariaLabel: 'Chứng nhận và giải thưởng',
    kicker: 'Chứng nhận & giải thưởng',
    title: 'Chuẩn tin cậy khi đã có',
    lede: 'Giấy phép, tiêu chuẩn và giải thưởng có thể xác minh — chỉ hiển thị dấu đã công bố.',
    prev: 'Chứng nhận trước',
    next: 'Chứng nhận sau',
    slides: [
      {
        kind: 'cert',
        mark: 'Cert',
        micro: 'Chứng nhận · chỗ sẵn',
        title: 'Giấy phép du lịch · kiểm định · chất lượng',
        body: 'Chỉ đăng huy hiệu thật. Placeholder đến khi quét giấy phép được xác nhận — không bịa dấu.',
      },
      {
        kind: 'iso',
        mark: 'ISO',
        micro: 'Tiêu chuẩn · trường',
        title: 'Tiêu chuẩn chất lượng & vận hành',
        body: 'Ẩn đến khi hồ sơ có trên file. Không bịa dấu tiêu chuẩn.',
      },
      {
        kind: 'award',
        mark: 'Award',
        micro: 'Giải thưởng · trường',
        title: 'Chỗ logo sẵn',
        body: 'Ẩn đến khi có asset đã xác minh. Không bịa giải — thay slide khi được duyệt.',
      },
      {
        kind: 'member',
        mark: 'Member',
        micro: 'Hội viên · tùy chọn',
        title: 'Thành viên ngành',
        body: 'Chỉ liệt kê liên kết còn hiệu lực qua từng năm.',
      },
    ],
  },
}

const it: SectionCopy = {
  home: {
    pillarsKicker: 'Come funziona WingsSide',
    pillarsTitle: 'Quattro passi dal brief al percorso privato',
    pillarsLede:
      'Un desk di pianificazione locale. Inviate l’essenziale — progettiamo il viaggio e rispondiamo entro 1 giorno lavorativo (GMT+7).',
    whyKicker: 'Perché viaggiare con WingsSide',
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
    destLede: 'Segna i luoghi prima — icone del Nord, patrimonio centrale o ritmo del Sud più soft.',
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
      { title: 'Itinerari di esempio →', body: 'Cornici da reagire — non gruppi fissi.', href: '/packages' },
      { title: 'Pianifica il viaggio →', body: 'Brief completo con mese e gruppo.', href: '/plan-your-trip' },
    ],
  },
  plan: {
    stepsKicker: 'Come funziona WingsSide',
    stepsTitle: 'Quattro passi dal brief al percorso privato',
    stepsLede:
      'Un desk di pianificazione locale. Inviate l’essenziale — progettiamo il viaggio e rispondiamo entro 1 giorno lavorativo (GMT+7).',
    steps: [
      {
        label: 'Passo 1 · Brief',
        title: 'Dicci l’essenziale',
        body: 'Destinazione (o regione), mese, gruppo e come viaggiare — dal planner home o brief completo.',
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
    faqTitle: 'FAQ inbound',
    exploreTitle: 'Esplora prima del brief',
    explore: [
      { title: 'Destinazioni →', body: 'Scegli i luoghi prima.', href: '/destinations' },
      { title: 'Stili di viaggio →', body: 'Scegli il ritmo prima dei luoghi.', href: '/styles' },
      { title: 'Pacchetti di esempio →', body: 'Cornici da reagire.', href: '/packages' },
    ],
  },
  destinations: {
    routesTitle: 'Percorsi multi-città di esempio',
    deeperTitle: 'Scegli un luogo per approfondire',
    routes: [
      { title: 'Porta del Nord', body: 'Hanoi · Ha Long · altopiani.', href: '/destinations/ha-noi' },
      { title: 'Patrimonio centrale', body: 'Hue e Hoi An senza fatica hotel.', href: '/destinations/hue' },
      { title: 'Ritmo del delta', body: 'Giorni Mekong più morbidi.', href: '/destinations/mekong' },
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
      { title: 'Wellness', body: 'Giorni più soft e recupero.', href: '/styles' },
      { title: 'Business', body: 'Meeting con contrasto culturale.', href: '/styles' },
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
    ],
  },
  guide: {
    listTitle: 'Ultime note di viaggio',
    notes: [
      {
        title: 'Quando visitare il Nord Vietnam',
        body: 'Stagione, clima e compromessi di ritmo per la porta nord.',
        href: '/travel-guide',
      },
      {
        title: 'Hue e Hoi An senza fatica hotel',
        body: 'Come abbinare giorni di patrimonio senza muoversi troppo.',
        href: '/travel-guide',
      },
      {
        title: 'Transfer che proteggono il ritmo',
        body: 'Quando un transfer più lungo vale la giornata che protegge.',
        href: '/travel-guide',
      },
    ],
    cta: 'Note fatte — pronto per il brief?',
  },
  about: {
    storyTitle: 'Per chi vuole un percorso privato, non un checkout da catalogo',
    stepsTitle: 'Quattro passi dal brief al percorso privato',
    promisesTitle: 'Quattro promesse. Niente gergo.',
    promises: [
      { title: 'Privato di default', body: 'Percorsi per il tuo gruppo — non posti pullman fissi.' },
      { title: 'Design locale', body: 'Planner in Vietnam guidano la prima direzione.' },
      { title: 'Prima risposta chiara', body: 'Email di direzione entro 1 giorno lavorativo (GMT+7).' },
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
    ],
  },
  creds: {
    ariaLabel: 'Certificati e premi',
    kicker: 'Certificati e premi',
    title: 'Standard di fiducia quando ci sono',
    lede: 'Licenze, standard e premi verificabili — solo marchi pubblicati.',
    prev: 'Credenziale precedente',
    next: 'Credenziale successiva',
    slides: [
      {
        kind: 'cert',
        mark: 'Cert',
        micro: 'Certificati · slot pronti',
        title: 'Licenza viaggio · accreditamento · qualità',
        body: 'Solo badge reali. Placeholder finché la scansione non è confermata — mai inventare sigilli.',
      },
      {
        kind: 'iso',
        mark: 'ISO',
        micro: 'Standard · campo',
        title: 'Standard di qualità e operativi',
        body: 'Nascosto finché la documentazione è in archivio. Nessun marchio inventato.',
      },
      {
        kind: 'award',
        mark: 'Award',
        micro: 'Premi · campo',
        title: 'Slot logo pronti',
        body: 'Nascosto finché arrivano asset verificati. Mai inventare premi.',
      },
      {
        kind: 'member',
        mark: 'Member',
        micro: 'Membership · opzionale',
        title: 'Membership di settore',
        body: 'Solo affiliazioni ancora attuali anno dopo anno.',
      },
    ],
  },
}

const es: SectionCopy = {
  home: {
    pillarsKicker: 'Cómo funciona WingsSide',
    pillarsTitle: 'Cuatro pasos del brief a la ruta privada',
    pillarsLede:
      'Un escritorio de planificación local. Envías lo esencial — diseñamos el viaje y respondemos en 1 día laborable (GMT+7).',
    whyKicker: 'Por qué viajar con WingsSide',
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
    destLede: 'Marca lugares primero — iconos del Norte, patrimonio central o ritmo del Sur más suave.',
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
      { title: 'Viajes de muestra →', body: 'Marcos para reaccionar — no grupos fijos.', href: '/packages' },
      { title: 'Planifica tu viaje →', body: 'Brief completo con mes y grupo.', href: '/plan-your-trip' },
    ],
  },
  plan: {
    stepsKicker: 'Cómo funciona WingsSide',
    stepsTitle: 'Cuatro pasos del brief a la ruta privada',
    stepsLede:
      'Un escritorio de planificación local. Envías lo esencial — diseñamos el viaje y respondemos en 1 día laborable (GMT+7).',
    steps: [
      {
        label: 'Paso 1 · Brief',
        title: 'Cuéntanos lo esencial',
        body: 'Destino (o región), mes, tamaño del grupo y cómo te gusta viajar — vía planner de inicio o brief completo.',
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
    faqTitle: 'FAQ inbound',
    exploreTitle: 'Explora antes del brief',
    explore: [
      { title: 'Destinos →', body: 'Elige lugares primero.', href: '/destinations' },
      { title: 'Estilos de viaje →', body: 'Elige el ritmo antes que los lugares.', href: '/styles' },
      { title: 'Paquetes de muestra →', body: 'Marcos para reaccionar.', href: '/packages' },
    ],
  },
  destinations: {
    routesTitle: 'Rutas multi-ciudad de muestra',
    deeperTitle: 'Elige un lugar para profundizar',
    routes: [
      { title: 'Puerta del Norte', body: 'Hanói · Ha Long · altiplano.', href: '/destinations/ha-noi' },
      { title: 'Patrimonio central', body: 'Hue y Hoi An sin fatiga de hoteles.', href: '/destinations/hue' },
      { title: 'Ritmo del delta', body: 'Días en el Mekong con ritmo más suave.', href: '/destinations/mekong' },
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
      { title: 'Familia', body: 'Días equilibrados para distintas edades.', href: '/styles/family' },
      { title: 'Cultura', body: 'Historias, contexto, comida, patrimonio.', href: '/styles/culture' },
      { title: 'Aventura', body: 'Un ritmo de ruta más activo.', href: '/styles/adventure' },
      { title: 'Bienestar', body: 'Días más suaves y recuperación.', href: '/styles' },
      { title: 'Negocios', body: 'Reuniones con contraste cultural.', href: '/styles' },
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
    ],
  },
  guide: {
    listTitle: 'Últimas notas de viaje',
    notes: [
      {
        title: 'Cuándo visitar el Norte de Vietnam',
        body: 'Temporada, clima y ritmo para la puerta norte.',
        href: '/travel-guide',
      },
      {
        title: 'Hue y Hoi An sin fatiga de hoteles',
        body: 'Cómo combinar días de patrimonio sin moverse de más.',
        href: '/travel-guide',
      },
      {
        title: 'Traslados que protegen el ritmo',
        body: 'Cuándo un traslado más largo vale el día que protege.',
        href: '/travel-guide',
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
    ],
  },
  creds: {
    ariaLabel: 'Certificados y premios',
    kicker: 'Certificados y premios',
    title: 'Estándares de confianza cuando existen',
    lede: 'Licencias, estándares y premios verificables — solo marcas publicadas.',
    prev: 'Credencial anterior',
    next: 'Credencial siguiente',
    slides: [
      {
        kind: 'cert',
        mark: 'Cert',
        micro: 'Certificados · huecos listos',
        title: 'Licencia de viaje · acreditación · calidad',
        body: 'Solo insignias reales. Placeholder hasta confirmar el escaneo — nunca inventar sellos.',
      },
      {
        kind: 'iso',
        mark: 'ISO',
        micro: 'Estándares · campo',
        title: 'Estándares de calidad y operación',
        body: 'Oculto hasta tener documentación en archivo. Sin sellos inventados.',
      },
      {
        kind: 'award',
        mark: 'Award',
        micro: 'Premios · campo',
        title: 'Huecos de logo listos',
        body: 'Oculto hasta activos verificados. Nunca inventar premios.',
      },
      {
        kind: 'member',
        mark: 'Member',
        micro: 'Membresías · opcional',
        title: 'Membresías del sector',
        body: 'Solo afiliaciones vigentes año tras año.',
      },
    ],
  },
}

const pt: SectionCopy = {
  home: {
    pillarsKicker: 'Como a WingsSide funciona',
    pillarsTitle: 'Quatro passos do brief ao percurso privado',
    pillarsLede:
      'Uma mesa de planeamento local. Envia o essencial — desenhamos a viagem e respondemos em 1 dia útil (GMT+7).',
    whyKicker: 'Porque viajar com a WingsSide',
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
    destLede: 'Marque lugares primeiro — ícones do Norte, património central ou ritmo do Sul mais suave.',
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
      { title: 'Itinerários de exemplo →', body: 'Molduras para reagir — não grupos fixos.', href: '/packages' },
      { title: 'Planear a viagem →', body: 'Brief completo com mês e grupo.', href: '/plan-your-trip' },
    ],
  },
  plan: {
    stepsKicker: 'Como a WingsSide funciona',
    stepsTitle: 'Quatro passos do brief ao percurso privado',
    stepsLede:
      'Uma mesa de planeamento local. Envia o essencial — desenhamos a viagem e respondemos em 1 dia útil (GMT+7).',
    steps: [
      {
        label: 'Passo 1 · Brief',
        title: 'Diga o essencial',
        body: 'Destino (ou região), mês, tamanho do grupo e como gosta de viajar — via planner da home ou brief completo.',
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
    faqTitle: 'FAQ inbound',
    exploreTitle: 'Explore antes do brief',
    explore: [
      { title: 'Destinos →', body: 'Escolha lugares primeiro.', href: '/destinations' },
      { title: 'Estilos de viagem →', body: 'Escolha o ritmo antes dos lugares.', href: '/styles' },
      { title: 'Pacotes de exemplo →', body: 'Molduras para reagir.', href: '/packages' },
    ],
  },
  destinations: {
    routesTitle: 'Rotas multi-cidade de exemplo',
    deeperTitle: 'Escolha um lugar para aprofundar',
    routes: [
      { title: 'Porta do Norte', body: 'Hanói · Ha Long · planalto.', href: '/destinations/ha-noi' },
      { title: 'Património central', body: 'Hue e Hoi An sem fadiga de hotéis.', href: '/destinations/hue' },
      { title: 'Ritmo do delta', body: 'Dias no Mekong com ritmo mais suave.', href: '/destinations/mekong' },
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
      { title: 'Cultura', body: 'Histórias, contexto, comida, património.', href: '/styles/culture' },
      { title: 'Aventura', body: 'Um ritmo de rota mais ativo.', href: '/styles/adventure' },
      { title: 'Bem-estar', body: 'Dias mais suaves e recuperação.', href: '/styles' },
      { title: 'Negócios', body: 'Reuniões com contraste cultural.', href: '/styles' },
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
    ],
  },
  guide: {
    listTitle: 'Últimas notas de viagem',
    notes: [
      {
        title: 'Quando visitar o Norte do Vietname',
        body: 'Estação, clima e ritmo para a porta norte.',
        href: '/travel-guide',
      },
      {
        title: 'Hue e Hoi An sem fadiga de hotéis',
        body: 'Como combinar dias de património sem se mover demais.',
        href: '/travel-guide',
      },
      {
        title: 'Transfers que protegem o ritmo',
        body: 'Quando um transfer mais longo vale o dia que protege.',
        href: '/travel-guide',
      },
    ],
    cta: 'Notas feitas — pronto para o brief?',
  },
  about: {
    storyTitle: 'Para quem quer uma rota privada, não um checkout de catálogo',
    stepsTitle: 'Quatro passos do brief ao percurso privado',
    promisesTitle: 'Quatro promessas. Sem jargão.',
    promises: [
      { title: 'Privado por predefinição', body: 'Rotas para o seu grupo — não lugares fixos de autocarro.' },
      { title: 'Design local', body: 'Planners no Vietname guiam a primeira direção.' },
      { title: 'Primeira resposta clara', body: 'Email de direção em 1 dia útil (GMT+7).' },
      { title: 'Prova honesta', body: 'Apenas licenças e prémios publicados.' },
    ],
    teamTitle: 'Pessoas por trás do brief',
    teamLede:
      'Rostos de planners só saem com retratos aprovados — sem stock como equipa falsa.',
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
    ],
  },
  creds: {
    ariaLabel: 'Certificados e prémios',
    kicker: 'Certificados e prémios',
    title: 'Padrões de confiança quando existem',
    lede: 'Licenças, padrões e prémios verificáveis — só marcas publicadas.',
    prev: 'Credencial anterior',
    next: 'Credencial seguinte',
    slides: [
      {
        kind: 'cert',
        mark: 'Cert',
        micro: 'Certificados · slots prontos',
        title: 'Licença de viagem · acreditação · qualidade',
        body: 'Só distintivos reais. Placeholder até confirmar o scan — nunca inventar selos.',
      },
      {
        kind: 'iso',
        mark: 'ISO',
        micro: 'Padrões · campo',
        title: 'Padrões de qualidade e operação',
        body: 'Oculto até documentação em arquivo. Sem selos inventados.',
      },
      {
        kind: 'award',
        mark: 'Award',
        micro: 'Prémios · campo',
        title: 'Slots de logo prontos',
        body: 'Oculto até ativos verificados. Nunca inventar prémios.',
      },
      {
        kind: 'member',
        mark: 'Member',
        micro: 'Associações · opcional',
        title: 'Associações do setor',
        body: 'Só afiliações ainda atuais ano após ano.',
      },
    ],
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
