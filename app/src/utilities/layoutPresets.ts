export type LayoutPresetCategory = 'campaign' | 'content' | 'core' | 'lead' | 'service'

export type LayoutPresetInput = {
  formID?: number | string
  summary?: string
  title: string
}

export type LayoutPresetDefinition = {
  category: LayoutPresetCategory
  description: string
  key:
    | 'campaign-launch'
    | 'contact-support'
    | 'destination-showcase'
    | 'homepage-editorial'
    | 'homepage-service-hub'
    | 'lead-capture'
    | 'long-form-guide'
    | 'magazine-content-hub'
    | 'pricing-package-comparison'
    | 'service-detail'
    | 'social-proof'
    | 'tour-conversion'
    | 'wingsside-inbound-homepage'
  label: string
  preview: {
    accent: string
    sections: string[]
  }
}

export type LayoutPresetKey = LayoutPresetDefinition['key']

export const layoutPresetDefinitions: readonly LayoutPresetDefinition[] = [
  {
    category: 'core',
    description: 'Trang chủ thiên về câu chuyện thương hiệu, số liệu và nội dung biên tập.',
    key: 'homepage-editorial',
    label: 'Trang chủ biên tập (Homepage editorial)',
    preview: {
      accent: 'editorial',
      sections: ['Hero centered', 'Editorial split', 'Stats', 'Stories', 'CTA'],
    },
  },
  {
    category: 'core',
    description: 'Trang chủ điều hướng nhanh vào các nhóm dịch vụ và điểm đến.',
    key: 'homepage-service-hub',
    label: 'Trang chủ trung tâm dịch vụ (Homepage service hub)',
    preview: {
      accent: 'service',
      sections: ['Hero split', 'Bento services', 'Stats', 'Testimonials', 'CTA'],
    },
  },
  {
    category: 'core',
    description:
      'Trang chủ inbound Vietnam thiên về trust proof, destination cards, sample itinerary và inquiry CTA.',
    key: 'wingsside-inbound-homepage',
    label: 'Trang chủ inbound WingsSide (WingsSide inbound homepage)',
    preview: {
      accent: 'inbound',
      sections: [
        'Hero cinematic',
        'Value props',
        'Destinations',
        'Sample itineraries',
        'Stats',
        'Testimonials',
        'CTA',
      ],
    },
  },
  {
    category: 'service',
    description: 'Trang điểm đến giàu hình ảnh, trải nghiệm và nội dung SEO.',
    key: 'destination-showcase',
    label: 'Giới thiệu điểm đến (Destination showcase)',
    preview: {
      accent: 'destination',
      sections: ['Hero layered', 'Alternating features', 'Media', 'FAQ', 'CTA'],
    },
  },
  {
    category: 'service',
    description: 'Trang tour tập trung chuyển đổi với điểm nổi bật, giá và bằng chứng.',
    key: 'tour-conversion',
    label: 'Chuyển đổi tour (Tour conversion)',
    preview: {
      accent: 'tour',
      sections: ['Hero split', 'Features', 'Pricing', 'Testimonials', 'FAQ', 'CTA'],
    },
  },
  {
    category: 'service',
    description: 'Trang dịch vụ có quy trình, phương án lựa chọn và form tư vấn.',
    key: 'service-detail',
    label: 'Chi tiết dịch vụ (Service detail)',
    preview: {
      accent: 'service',
      sections: ['Hero split', 'Sticky features', 'Comparison', 'FAQ', 'Form'],
    },
  },
  {
    category: 'campaign',
    description: 'Landing page ra mắt chiến dịch, ưu đãi hoặc thị trường mới.',
    key: 'campaign-launch',
    label: 'Ra mắt chiến dịch (Campaign launch)',
    preview: {
      accent: 'campaign',
      sections: ['Hero mesh', 'Bento benefits', 'Stats', 'Social proof', 'Form', 'CTA'],
    },
  },
  {
    category: 'lead',
    description: 'Landing page nhận brochure, báo giá hoặc yêu cầu tư vấn.',
    key: 'lead-capture',
    label: 'Thu thập khách hàng tiềm năng (Lead capture)',
    preview: {
      accent: 'lead',
      sections: ['Hero centered', 'Benefits', 'Stats', 'Form', 'FAQ'],
    },
  },
  {
    category: 'lead',
    description: 'Trang liên hệ với kênh hỗ trợ, cam kết phản hồi và form.',
    key: 'contact-support',
    label: 'Liên hệ và hỗ trợ (Contact and support)',
    preview: {
      accent: 'contact',
      sections: ['Hero low impact', 'Support channels', 'Form', 'FAQ'],
    },
  },
  {
    category: 'service',
    description: 'Trang so sánh gói, quyền lợi hoặc phương án dịch vụ.',
    key: 'pricing-package-comparison',
    label: 'So sánh giá và gói dịch vụ (Pricing and package comparison)',
    preview: {
      accent: 'pricing',
      sections: ['Hero low impact', 'Tier cards', 'Comparison matrix', 'FAQ', 'CTA'],
    },
  },
  {
    category: 'content',
    description: 'Trang hub bài viết theo phong cách tạp chí và chủ đề.',
    key: 'magazine-content-hub',
    label: 'Trung tâm nội dung tạp chí (Magazine and content hub)',
    preview: {
      accent: 'content',
      sections: ['Hero editorial', 'Magazine archive', 'Stats', 'Newsletter CTA'],
    },
  },
  {
    category: 'content',
    description: 'Trang hướng dẫn dài với mục lục, nội dung và FAQ.',
    key: 'long-form-guide',
    label: 'Hướng dẫn chuyên sâu (Long-form guide)',
    preview: {
      accent: 'guide',
      sections: ['Hero low impact', 'Sidebar TOC', 'Media', 'FAQ', 'CTA'],
    },
  },
  {
    category: 'content',
    description: 'Trang tổng hợp uy tín, logo, chỉ số và câu chuyện khách hàng.',
    key: 'social-proof',
    label: 'Bằng chứng uy tín (Trust and social proof)',
    preview: {
      accent: 'proof',
      sections: ['Hero centered', 'Logo proof', 'Featured quote', 'Social wall', 'CTA'],
    },
  },
] as const

export const layoutPresetKeys = new Set(layoutPresetDefinitions.map(({ key }) => key))

export const isLayoutPresetKey = (value: unknown): value is LayoutPresetKey =>
  typeof value === 'string' && layoutPresetKeys.has(value as LayoutPresetKey)

export const getLayoutPresetDefinition = (key: unknown) =>
  layoutPresetDefinitions.find((preset) => preset.key === key) || layoutPresetDefinitions[0]

const blockID = () => Math.random().toString(36).slice(2)

const richText = (heading: string, body?: string) => ({
  root: {
    type: 'root',
    children: [
      {
        type: 'heading',
        children: [
          {
            detail: 0,
            format: 0,
            mode: 'normal',
            style: '',
            text: heading,
            type: 'text',
            version: 1,
          },
        ],
        direction: 'ltr',
        format: '',
        indent: 0,
        tag: 'h2',
        version: 1,
      },
      {
        type: 'paragraph',
        children: [
          {
            detail: 0,
            format: 0,
            mode: 'normal',
            style: '',
            text: body || 'Bổ sung nội dung chi tiết cho phần này.',
            type: 'text',
            version: 1,
          },
        ],
        direction: 'ltr',
        format: '',
        indent: 0,
        textFormat: 0,
        textStyle: '',
        version: 1,
      },
    ],
    direction: 'ltr',
    format: '',
    indent: 0,
    version: 1,
  },
})

const hero = (
  title: string,
  summary: string,
  presentation: 'centered-visual' | 'gradient-mesh' | 'layered-visuals' | 'split-visual',
) => ({
  type: presentation === 'centered-visual' ? 'lowImpact' : 'highImpact',
  ...(presentation !== 'centered-visual' ? { presentation } : {}),
  richText: richText(title, summary),
})

const content = (
  presentation: 'columns' | 'editorial-split' | 'reading' | 'sidebar-toc',
  ...sections: Array<[string, string]>
) => ({
  blockType: 'content',
  id: blockID(),
  presentation,
  columns: sections.map(([heading, body], index) => ({
    size: presentation === 'sidebar-toc' && index === 0 ? 'oneThird' : 'full',
    richText: richText(heading, body),
  })),
})

const features = (
  presentation:
    | 'accordion'
    | 'alternating'
    | 'before-after'
    | 'bento'
    | 'icon-grid'
    | 'icon-wall'
    | 'sticky-reveal'
    | 'tabs',
  title: string,
  items: string[],
) => ({
  blockType: 'featureGrid',
  id: blockID(),
  columns: '3',
  presentation,
  title,
  variant: presentation === 'bento' ? 'highlight' : 'default',
  items: items.map((item, index) => ({
    description: 'Editor cập nhật mô tả, hình ảnh và liên kết phù hợp với nội dung thực tế.',
    eyebrow: `0${index + 1}`,
    title: item,
  })),
})

const infoStrip = (
  title: string,
  description: string,
  items: Array<{ description: string; label: string; value?: string }>,
  eyebrow?: string,
) => ({
  blockType: 'infoStrip',
  id: blockID(),
  description,
  eyebrow,
  items,
  title,
})

const stats = (
  presentation:
    | 'card-grid'
    | 'editorial'
    | 'floating'
    | 'inline-bar'
    | 'logo-proof'
    | 'progress'
    | 'split-statement',
  title: string,
) => ({
  blockType: 'stats',
  id: blockID(),
  presentation,
  title,
  items: [
    { label: 'Thị trường phục vụ', value: '12+' },
    { label: 'Hành trình đã hỗ trợ', value: '2.500+' },
    { label: 'Phản hồi đúng hạn', value: '98%' },
    { label: 'Kinh nghiệm vận hành', value: '10 năm' },
  ],
})

const testimonials = (
  presentation:
    | 'carousel'
    | 'featured'
    | 'logo-cloud'
    | 'marquee'
    | 'masonry'
    | 'quote-grid'
    | 'social-wall'
    | 'video',
  title = 'Khách hàng nói gì',
) => ({
  blockType: 'testimonial',
  id: blockID(),
  presentation,
  title,
  items: [
    {
      name: 'Khách hàng doanh nghiệp',
      quote: 'Quy trình rõ ràng, phản hồi nhanh và luôn có phương án dự phòng.',
      role: 'Đoàn công tác quốc tế',
    },
    {
      name: 'Gia đình khách hàng',
      quote: 'Lịch trình vừa sức, thông tin minh bạch và hỗ trợ xuyên suốt chuyến đi.',
      role: 'Tour gia đình',
    },
    {
      name: 'Đối tác thị trường',
      quote: 'Đội ngũ am hiểu điểm đến và phối hợp rất chủ động.',
      role: 'Đối tác vận hành',
    },
  ],
})

const faq = (
  presentation: 'categorized' | 'chat-bubbles' | 'searchable' | 'single-column' | 'two-column',
) => ({
  blockType: 'faq',
  id: blockID(),
  presentation,
  title: 'Câu hỏi thường gặp',
  items: [
    {
      answer: 'Đội ngũ sẽ xác nhận nhu cầu và gửi phương án phù hợp theo từng trường hợp.',
      category: 'Tư vấn',
      question: 'Tôi bắt đầu từ đâu?',
    },
    {
      answer: 'Thời gian phản hồi phụ thuộc dịch vụ, thông thường trong một ngày làm việc.',
      category: 'Quy trình',
      question: 'Bao lâu tôi nhận được phản hồi?',
    },
    {
      answer: 'Có. Nội dung và hành trình có thể điều chỉnh theo ngân sách và nhóm khách.',
      category: 'Dịch vụ',
      question: 'Có thể tùy chỉnh phương án không?',
    },
  ],
})

const cta = (
  presentation:
    | 'card'
    | 'dual-action'
    | 'full-bleed'
    | 'inline-form'
    | 'patterned'
    | 'split-card'
    | 'sticky-bar'
    | 'testimonial',
  heading = 'Sẵn sàng lên kế hoạch?',
) => ({
  blockType: 'cta',
  id: blockID(),
  presentation,
  richText: richText(heading, 'Trao đổi với đội ngũ WingsGroup để nhận phương án phù hợp.'),
  links: [
    {
      link: {
        appearance: 'default',
        label: 'Liên hệ tư vấn',
        type: 'custom',
        url: '/contact',
      },
    },
  ],
})

const form = (formID: number | string | undefined, presentation = 'split-contact') =>
  formID
    ? {
        blockType: 'formBlock',
        id: blockID(),
        enableIntro: true,
        form: formID,
        introContent: richText('Gửi yêu cầu tư vấn', 'Điền thông tin để đội ngũ liên hệ lại.'),
        presentation,
      }
    : cta('inline-form', 'Gửi yêu cầu tư vấn')

const pricing = (presentation: string) => ({
  blockType: 'pricingTable',
  id: blockID(),
  presentation,
  title: 'Các phương án tham khảo',
  items: [
    {
      features: [{ label: 'Tư vấn nhu cầu' }, { label: 'Lịch trình cơ bản' }],
      price: 'Liên hệ',
      subtitle: 'Phù hợp nhu cầu tiêu chuẩn',
      title: 'Tiêu chuẩn',
    },
    {
      featured: true,
      features: [{ label: 'Thiết kế riêng' }, { label: 'Hỗ trợ ưu tiên' }],
      price: 'Theo yêu cầu',
      subtitle: 'Phương án được đề xuất',
      title: 'Linh hoạt',
    },
    {
      features: [{ label: 'Điều phối riêng' }, { label: 'Hỗ trợ xuyên suốt' }],
      price: 'Báo giá riêng',
      subtitle: 'Cho đoàn và doanh nghiệp',
      title: 'Chuyên biệt',
    },
  ],
})

const comparison = () => ({
  blockType: 'comparison',
  id: blockID(),
  presentation: 'matrix',
  title: 'So sánh phương án',
  options: [
    {
      features: [
        { label: 'Tư vấn', value: 'Tiêu chuẩn' },
        { label: 'Tùy chỉnh', value: 'Giới hạn' },
      ],
      price: 'Cơ bản',
      title: 'Phương án A',
    },
    {
      featured: true,
      features: [
        { label: 'Tư vấn', value: 'Chuyên sâu' },
        { label: 'Tùy chỉnh', value: 'Toàn diện' },
      ],
      price: 'Đề xuất',
      title: 'Phương án B',
    },
  ],
})

const archive = (presentation: 'card-grid' | 'compact-list' | 'magazine') => ({
  blockType: 'archive',
  id: blockID(),
  introContent: richText('Nội dung mới nhất', 'Bài viết và hướng dẫn được cập nhật theo site.'),
  limit: 7,
  populateBy: 'collection',
  presentation,
  relationTo: 'posts',
})

export const createLayoutPresetData = (
  key: LayoutPresetKey,
  { formID, summary, title }: LayoutPresetInput,
) => {
  const lead = summary || 'Bổ sung mô tả ngắn giúp khách hàng hiểu giá trị của trang.'

  switch (key) {
    case 'homepage-editorial':
      return {
        hero: hero(title, lead, 'centered-visual'),
        layout: [
          content(
            'editorial-split',
            ['Câu chuyện thương hiệu', lead],
            ['Cam kết phục vụ', 'Nêu điểm khác biệt và nguyên tắc vận hành.'],
          ),
          stats('editorial', 'Năng lực được chứng minh'),
          testimonials('featured', 'Một hành trình đáng nhớ bắt đầu từ sự tin cậy'),
          archive('magazine'),
          cta('full-bleed'),
        ],
      }
    case 'homepage-service-hub':
      return {
        hero: hero(title, lead, 'split-visual'),
        layout: [
          features('bento', 'Khám phá dịch vụ', [
            'Tour trọn gói',
            'Vé và lưu trú',
            'Visa',
            'Bảo hiểm',
            'Dịch vụ doanh nghiệp',
          ]),
          stats('inline-bar', 'WingsGroup trong những con số'),
          testimonials('carousel'),
          cta('split-card'),
        ],
      }
    case 'wingsside-inbound-homepage':
      return {
        hero: hero(title, lead, 'split-visual'),
        layout: [
          infoStrip(
            'Travel planning signals',
            'Bốn điểm nhấn giúp khách inbound hiểu ngay cách WingsSide hỗ trợ một hành trình riêng tại Việt Nam.',
            [
              {
                label: 'Destination-led',
                value: 'Vietnam first',
                description:
                  'Bắt đầu từ điểm đến, mùa đi và nhịp di chuyển thay vì bán gói cố định.',
              },
              {
                label: 'Tailor-made',
                value: 'Private brief',
                description: 'Form tư vấn thu thập nhu cầu đủ ngắn để khách gửi yêu cầu nhanh.',
              },
              {
                label: 'Local design',
                value: 'On-ground logic',
                description: 'Nội dung nhấn vào pacing, route logic và trải nghiệm thực tế.',
              },
              {
                label: 'Ad-ready',
                value: 'EN / IT / ES / PT',
                description: 'Cấu trúc đủ rõ để chạy paid traffic vào các locale launch.',
              },
            ],
            'Inbound value props',
          ),
          features('bento', 'Explore Vietnam by intent', [
            'Destinations',
            'Travel styles',
            'Sample itineraries',
            'Planning process',
          ]),
          stats('logo-proof', 'Trust proof for inbound planning'),
          features('alternating', 'Sample itinerary cards', [
            'Vietnam highlights',
            'Northern Vietnam',
            'Central heritage',
          ]),
          testimonials('carousel', 'Traveler notes and planning signals'),
          cta('full-bleed', 'Start a Vietnam planning brief'),
        ],
      }
    case 'destination-showcase':
      return {
        hero: hero(title, lead, 'layered-visuals'),
        layout: [
          features('alternating', 'Trải nghiệm nổi bật', [
            'Điểm đến biểu tượng',
            'Ẩm thực địa phương',
            'Mùa đẹp nhất',
          ]),
          content('reading', [
            'Thông tin cần biết',
            'Thời tiết, di chuyển, visa và ngân sách tham khảo.',
          ]),
          faq('two-column'),
          cta('patterned', 'Thiết kế hành trình đến điểm đến này'),
        ],
      }
    case 'tour-conversion':
      return {
        hero: hero(title, lead, 'split-visual'),
        layout: [
          features('icon-grid', 'Điểm nổi bật của hành trình', [
            'Lịch trình tối ưu',
            'Khách sạn phù hợp',
            'Hướng dẫn tận tâm',
          ]),
          pricing('tier-cards'),
          testimonials('quote-grid'),
          faq('categorized'),
          cta('sticky-bar', 'Giữ chỗ và nhận lịch trình chi tiết'),
        ],
      }
    case 'service-detail':
      return {
        hero: hero(title, lead, 'split-visual'),
        layout: [
          features('sticky-reveal', 'Quy trình dịch vụ', [
            'Tiếp nhận nhu cầu',
            'Đề xuất phương án',
            'Xác nhận và triển khai',
            'Hỗ trợ sau dịch vụ',
          ]),
          comparison(),
          faq('searchable'),
          form(formID, 'split-contact'),
        ],
      }
    case 'campaign-launch':
      return {
        hero: hero(title, lead, 'gradient-mesh'),
        layout: [
          features('bento', 'Lợi ích chiến dịch', [
            'Ưu đãi nổi bật',
            'Thời gian giới hạn',
            'Hỗ trợ nhanh',
            'Điều kiện minh bạch',
          ]),
          stats('floating', 'Kết quả nổi bật'),
          testimonials('social-wall'),
          form(formID, 'centered-card'),
          cta('full-bleed', 'Đừng bỏ lỡ cơ hội này'),
        ],
      }
    case 'lead-capture':
      return {
        hero: hero(title, lead, 'centered-visual'),
        layout: [
          features('icon-grid', 'Bạn sẽ nhận được gì', [
            'Checklist chuẩn bị',
            'Dự toán tham khảo',
            'Tư vấn chuyên gia',
          ]),
          stats('card-grid', 'Thông tin đáng tin cậy'),
          form(formID, 'centered-card'),
          faq('single-column'),
        ],
      }
    case 'contact-support':
      return {
        hero: hero(title, lead, 'centered-visual'),
        layout: [
          features('icon-wall', 'Kênh hỗ trợ', [
            'Điện thoại',
            'Email',
            'Chat trực tuyến',
            'Văn phòng',
          ]),
          form(formID, 'support-channels'),
          faq('chat-bubbles'),
        ],
      }
    case 'pricing-package-comparison':
      return {
        hero: hero(title, lead, 'centered-visual'),
        layout: [pricing('tier-cards'), comparison(), faq('categorized'), cta('dual-action')],
      }
    case 'magazine-content-hub':
      return {
        hero: hero(title, lead, 'centered-visual'),
        layout: [
          archive('magazine'),
          stats('inline-bar', 'Cẩm nang từ kinh nghiệm thực tế'),
          cta('inline-form', 'Nhận nội dung mới từ WingsGroup'),
        ],
      }
    case 'long-form-guide':
      return {
        hero: hero(title, lead, 'centered-visual'),
        layout: [
          content(
            'sidebar-toc',
            ['Trong hướng dẫn này', 'Tổng quan, chuẩn bị, lịch trình và lưu ý.'],
            ['Nội dung hướng dẫn', lead],
          ),
          features('accordion', 'Các bước thực hiện', [
            'Chuẩn bị giấy tờ',
            'Lập ngân sách',
            'Chọn hành trình',
            'Kiểm tra trước chuyến đi',
          ]),
          faq('single-column'),
          cta('card', 'Cần tư vấn cho trường hợp cụ thể?'),
        ],
      }
    case 'social-proof':
      return {
        hero: hero(title, lead, 'centered-visual'),
        layout: [
          stats('logo-proof', 'Được tin tưởng bởi khách hàng và đối tác'),
          testimonials('featured'),
          testimonials('social-wall', 'Những trải nghiệm thực tế'),
          testimonials('logo-cloud', 'Đối tác đồng hành'),
          cta('testimonial', 'Bắt đầu hành trình cùng WingsGroup'),
        ],
      }
  }
}
