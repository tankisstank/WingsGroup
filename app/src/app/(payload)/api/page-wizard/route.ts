import { createLocalReq, getPayload } from 'payload'
import config from '@payload-config'
import { headers } from 'next/headers'
import type { Payload } from 'payload'

type PageWizardPayload = {
  site?: number | string
  slug?: string
  summary?: string
  template?:
    | 'about'
    | 'basic'
    | 'campaign'
    | 'contact'
    | 'destination'
    | 'home'
    | 'insurance'
    | 'leadMagnet'
    | 'service'
    | 'tour'
  title?: string
}

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
            text: body || 'Bổ sung nội dung chi tiết cho trang này.',
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

const slugify = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

const contentBlock = (...columns: Array<{ body?: string; heading: string; size?: string }>) => ({
  blockType: 'content',
  columns: columns.map((column) => ({
    size: column.size || 'full',
    richText: richText(column.heading, column.body),
  })),
})

const ctaBlock = (heading: string, body: string, label = 'Liên hệ tư vấn') => ({
  blockType: 'cta',
  links: [
    {
      link: {
        appearance: 'default',
        label,
        type: 'custom',
        url: '/contact',
      },
    },
  ],
  richText: richText(heading, body),
})

const formBlock = (formID?: number | string, heading?: string, body?: string) => {
  if (!formID) {
    return null
  }

  return {
    blockType: 'formBlock',
    enableIntro: true,
    form: formID,
    introContent: richText(
      heading || 'Gửi yêu cầu tư vấn',
      body || 'Điền thông tin để đội ngũ WingsTravel liên hệ lại.',
    ),
  }
}

const findSiteForm = async (payload: Payload, req: Awaited<ReturnType<typeof createLocalReq>>, siteID: number | string) => {
  const scopedForms = await payload.find({
    collection: 'forms',
    depth: 0,
    limit: 1,
    overrideAccess: false,
    req,
    where: {
      site: {
        equals: siteID,
      },
    },
  })

  if (scopedForms.docs[0]) {
    return scopedForms.docs[0].id
  }

  const fallbackForms = await payload.find({
    collection: 'forms',
    depth: 0,
    limit: 1,
    overrideAccess: false,
    req,
  })

  return fallbackForms.docs[0]?.id
}

const getTemplateContent = (
  template: PageWizardPayload['template'],
  title: string,
  summary?: string,
  formID?: number | string,
) => {
  const lead = summary || 'Bổ sung mô tả ngắn cho trang này.'

  if (template === 'home') {
    return {
      hero: {
        type: 'lowImpact',
        richText: richText(title, lead),
      },
      layout: [
        contentBlock(
          {
            heading: 'Giá trị chính của site',
            body: 'Viết 3-4 ý giúp khách hiểu site này phục vụ nhu cầu nào.',
          },
          {
            heading: 'Dịch vụ nổi bật',
            body: 'Liệt kê các dịch vụ, tour hoặc nhóm nội dung cần điều hướng ngay từ trang chủ.',
          },
        ),
        contentBlock(
          {
            heading: 'Vì sao chọn WingsTravel',
            body: 'Thêm bằng chứng, cam kết dịch vụ, kinh nghiệm và điểm khác biệt.',
          },
          {
            heading: 'Nội dung cần dẫn tiếp',
            body: 'Gợi ý các trang con quan trọng như dịch vụ, liên hệ, bài viết hoặc campaign.',
          },
        ),
        ctaBlock('Bắt đầu lên kế hoạch', 'Dẫn khách đến form tư vấn hoặc trang liên hệ phù hợp.'),
      ],
    }
  }

  if (template === 'about') {
    return {
      hero: {
        type: 'lowImpact',
        richText: richText(title, lead),
      },
      layout: [
        contentBlock({
          heading: 'Câu chuyện thương hiệu',
          body: 'Giới thiệu bối cảnh, sứ mệnh và nhóm khách hàng mà site này phục vụ.',
        }),
        contentBlock(
          {
            heading: 'Năng lực vận hành',
            body: 'Thêm kinh nghiệm, đối tác, thị trường hoặc khả năng hỗ trợ khách hàng.',
          },
          {
            heading: 'Cam kết dịch vụ',
            body: 'Nêu rõ cách WingsTravel đảm bảo chất lượng, minh bạch và hỗ trợ.',
          },
        ),
        ctaBlock('Trao đổi với đội ngũ', 'Mời khách liên hệ để được tư vấn theo nhu cầu cụ thể.'),
      ],
    }
  }

  if (template === 'campaign') {
    return {
      hero: {
        type: 'lowImpact',
        richText: richText(title, lead),
      },
      layout: [
        {
          blockType: 'content',
          columns: [
            {
              size: 'full',
              richText: richText('Vấn đề khách hàng cần giải quyết', lead),
            },
            {
              size: 'full',
              richText: richText('Lý do nên chọn WingsTravel', 'Thêm các lợi ích, bằng chứng và điểm khác biệt chính.'),
            },
            {
              size: 'full',
              richText: richText('Ưu đãi hoặc thông điệp chiến dịch', 'Thêm deadline, điều kiện áp dụng hoặc gói dịch vụ nổi bật.'),
            },
          ],
        },
        formBlock(formID, 'Nhận tư vấn chiến dịch', 'Form sẽ thu lead cho chiến dịch nếu site đã có biểu mẫu.'),
        ctaBlock('Sẵn sàng tư vấn?', 'Thêm lời kêu gọi hành động phù hợp với chiến dịch.'),
      ].filter(Boolean),
    }
  }

  if (template === 'tour') {
    return {
      hero: {
        type: 'lowImpact',
        richText: richText(title, lead),
      },
      layout: [
        contentBlock({
          heading: 'Tổng quan gói tour',
          body: lead,
        }),
        contentBlock(
          {
            heading: 'Điểm nổi bật',
            body: 'Thêm các trải nghiệm chính, địa điểm quan trọng và lý do nên chọn tour này.',
          },
          {
            heading: 'Lịch trình gợi ý',
            body: 'Phác thảo lịch trình theo ngày hoặc theo chặng để editor hoàn thiện.',
          },
        ),
        contentBlock(
          {
            heading: 'Phù hợp với ai',
            body: 'Mô tả nhóm khách hàng phù hợp, thời điểm đi và ngân sách tham khảo.',
          },
          {
            heading: 'Thông tin cần chuẩn bị',
            body: 'Thêm visa, giấy tờ, bảo hiểm, hành lý hoặc lưu ý trước chuyến đi.',
          },
        ),
        ctaBlock('Nhận lịch trình chi tiết', 'Dẫn khách gửi yêu cầu để nhận tư vấn tour.'),
      ],
    }
  }

  if (template === 'destination') {
    return {
      hero: {
        type: 'lowImpact',
        richText: richText(title, lead),
      },
      layout: [
        contentBlock({
          heading: 'Tổng quan điểm đến',
          body: 'Viết đoạn giới thiệu thị trường, mùa đi đẹp và nhu cầu khách hàng.',
        }),
        contentBlock(
          {
            heading: 'Trải nghiệm nên có',
            body: 'Liệt kê các trải nghiệm, khu vực, lịch trình hoặc sản phẩm nên điều hướng.',
          },
          {
            heading: 'Lưu ý khi lên kế hoạch',
            body: 'Thêm visa, thời tiết, ngân sách, di chuyển và những điểm cần tư vấn.',
          },
        ),
        ctaBlock('Tư vấn lịch trình điểm đến', 'Dẫn khách sang trang liên hệ hoặc form tư vấn.'),
      ],
    }
  }

  if (template === 'insurance') {
    return {
      hero: {
        type: 'lowImpact',
        richText: richText(title, lead),
      },
      layout: [
        contentBlock({
          heading: 'Dịch vụ này dành cho ai',
          body: 'Mô tả nhóm khách, bối cảnh chuyến đi và nhu cầu bảo vệ/hỗ trợ.',
        }),
        contentBlock(
          {
            heading: 'Quyền lợi hoặc phạm vi hỗ trợ',
            body: 'Liệt kê các quyền lợi, điểm cần lưu ý và trường hợp áp dụng.',
          },
          {
            heading: 'Quy trình xử lý',
            body: 'Mô tả các bước tư vấn, chuẩn bị hồ sơ, xác nhận và hỗ trợ sau mua.',
          },
        ),
        ctaBlock('Kiểm tra phương án phù hợp', 'Dẫn khách gửi thông tin để được tư vấn.'),
      ],
    }
  }

  if (template === 'service') {
    return {
      hero: {
        type: 'lowImpact',
        richText: richText(title, lead),
      },
      layout: [
        {
          blockType: 'content',
          columns: [
            {
              size: 'full',
              richText: richText('Tổng quan dịch vụ', lead),
            },
            {
              size: 'full',
              richText: richText('Thông tin cần bổ sung', 'Thêm lợi ích, quy trình, đối tượng phù hợp và CTA.'),
            },
          ],
        },
        ctaBlock('Trao đổi về dịch vụ', 'Dẫn khách gửi yêu cầu để đội ngũ tư vấn chi tiết.'),
      ],
    }
  }

  if (template === 'leadMagnet') {
    return {
      hero: {
        type: 'lowImpact',
        richText: richText(title, lead),
      },
      layout: [
        contentBlock({
          heading: 'Offer chính',
          body: 'Mô tả tài liệu, checklist, báo giá hoặc quyền lợi khách sẽ nhận được.',
        }),
        contentBlock(
          {
            heading: 'Khách nhận được gì',
            body: 'Nêu rõ lợi ích cụ thể sau khi gửi thông tin.',
          },
          {
            heading: 'Ai nên đăng ký',
            body: 'Mô tả nhóm khách hàng phù hợp để tăng chất lượng lead.',
          },
        ),
        formBlock(formID, 'Nhận tài liệu / tư vấn', 'Form sẽ thu lead nếu site đã có biểu mẫu.'),
        ctaBlock('Cần tư vấn nhanh?', 'Dẫn khách đến kênh liên hệ trực tiếp nếu chưa dùng form.'),
      ].filter(Boolean),
    }
  }

  if (template === 'contact') {
    return {
      hero: {
        type: 'lowImpact',
        richText: richText(title, lead),
      },
      layout: [
        {
          blockType: 'content',
          columns: [
            {
              size: 'full',
              richText: richText('Thông tin liên hệ', lead),
            },
          ],
        },
        formBlock(formID, 'Gửi yêu cầu tư vấn', 'Form sẽ hiển thị nếu site đã có biểu mẫu.'),
        ctaBlock('Liên hệ đội ngũ', 'Thêm số điện thoại, email hoặc kênh chat trong nội dung trang.'),
      ].filter(Boolean),
    }
  }

  return {
    hero: {
      type: 'lowImpact',
      richText: richText(title, lead),
    },
    layout: [
      {
        blockType: 'content',
        columns: [
          {
            size: 'full',
            richText: richText('Nội dung chính', lead),
          },
        ],
      },
    ],
  }
}

export async function POST(request: Request): Promise<Response> {
  const payload = await getPayload({ config })
  const requestHeaders = await headers()
  const { user } = await payload.auth({ headers: requestHeaders })

  if (!user) {
    return Response.json({ message: 'Bạn cần đăng nhập để tạo trang.' }, { status: 401 })
  }

  const body = (await request.json()) as PageWizardPayload
  const title = body.title?.trim()
  const slug = slugify(body.slug || title || '')

  const siteID =
    typeof body.site === 'string' && /^\d+$/.test(body.site) ? Number(body.site) : body.site

  if (!siteID || !title || !slug) {
    return Response.json(
      { message: 'Thiếu site, tiêu đề hoặc đường dẫn.' },
      { status: 400 },
    )
  }

  const payloadReq = await createLocalReq({ user }, payload)
  const formID = await findSiteForm(payload, payloadReq, siteID)
  const templateData = getTemplateContent(body.template, title, body.summary?.trim(), formID)

  const createdPage = await payload.create({
    collection: 'pages',
    data: {
      _status: 'draft',
      meta: {
        description: body.summary,
        title,
      },
      site: siteID as number,
      slug,
      title,
      ...templateData,
    } as never,
    overrideAccess: false,
    req: payloadReq,
  })

  return Response.json({
    id: createdPage.id,
  })
}
