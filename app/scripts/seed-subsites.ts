import 'dotenv/config'

import type { File, Payload, PayloadRequest } from 'payload'

import { createLocalReq, getPayload } from 'payload'

import config from '../src/payload.config'

const seedContext = {
  disableRevalidate: true,
  seed: true,
}

const seedData = <T>(data: T) => data as never

type SeedRichText = {
  root: {
    type: 'root'
    children: Array<Record<string, unknown> & { type: string; version: number }>
    direction: 'ltr' | 'rtl' | null
    format: '' | 'center' | 'end' | 'justify' | 'left' | 'right' | 'start'
    indent: number
    version: number
  }
}

type SiteSeed = {
  accentColor: string
  brandColor: string
  code: string
  domain: string
  name: string
  seoDescription: string
  seoSuffix: string
  services: string[]
  summary: string
}

const siteSeeds: SiteSeed[] = [
  {
    accentColor: '#F59E0B',
    brandColor: '#0F766E',
    code: 'wings-travel',
    domain: 'wingstravel.local',
    name: 'WingsTravel',
    seoDescription:
      'Nền tảng nội dung trung tâm cho sản phẩm du lịch, landing page bán hàng và hệ thống site dịch vụ của WingsTravel.',
    seoSuffix: 'Travel Platform',
    services: ['Tours', 'Packages', 'Destinations'],
    summary: 'Travel products, destination pages, booking-oriented landing pages, and editorial travel content.',
  },
  {
    accentColor: '#F97316',
    brandColor: '#1D4ED8',
    code: 'wings-go',
    domain: 'wingsgo.local',
    name: 'WingsGo',
    seoDescription:
      'Microsite cho các chuyến đi ngắn ngày, lịch trình nhanh và nội dung thúc đẩy chuyển đổi cho dịch vụ di chuyển.',
    seoSuffix: 'Fast Trip Service',
    services: ['City Break', 'Transport', 'Itinerary'],
    summary: 'Fast-trip microsite for short trips, route suggestions, and lightweight service pages.',
  },
  {
    accentColor: '#14B8A6',
    brandColor: '#0F172A',
    code: 'wings-care',
    domain: 'wingscare.local',
    name: 'WingsCare',
    seoDescription:
      'Site chăm sóc khách hàng, trung tâm hỗ trợ và nội dung hậu mãi cho hệ sinh thái WingsTravel.',
    seoSuffix: 'Customer Care',
    services: ['Support', 'After-sales', 'Customer Care'],
    summary: 'Customer support, help center, and service assurance content for travelers.',
  },
  {
    accentColor: '#EF4444',
    brandColor: '#1E293B',
    code: 'wings-insurance',
    domain: 'wingsinsurance.local',
    name: 'WingsInsurance',
    seoDescription:
      'Site nội dung cho bảo hiểm du lịch, quyền lợi bảo vệ, quy trình bồi thường và thông tin an toàn hành trình.',
    seoSuffix: 'Travel Protection',
    services: ['Coverage', 'Claims', 'Travel Safety'],
    summary: 'Insurance plans, travel protection landing pages, and safety-focused editorial content.',
  },
]

async function fetchFileByURL(url: string): Promise<File> {
  const res = await fetch(url)

  if (!res.ok) {
    throw new Error(`Failed to fetch file from ${url}, status: ${res.status}`)
  }

  const data = await res.arrayBuffer()

  return {
    name: url.split('/').pop() || `file-${Date.now()}`,
    data: Buffer.from(data),
    mimetype: `image/${url.split('.').pop()}`,
    size: data.byteLength,
  }
}

const richText = (heading: string, paragraph: string): SeedRichText => ({
  root: {
    type: 'root',
    children: [
      {
        type: 'heading',
        children: [
          {
            type: 'text',
            detail: 0,
            format: 0,
            mode: 'normal',
            style: '',
            text: heading,
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
            type: 'text',
            detail: 0,
            format: 0,
            mode: 'normal',
            style: '',
            text: paragraph,
            version: 1,
          },
        ],
        direction: 'ltr',
        format: '',
        indent: 0,
        textFormat: 0,
        version: 1,
      },
    ],
    direction: 'ltr',
    format: '',
    indent: 0,
    version: 1,
  },
})

async function upsertSite(payload: Payload, req: PayloadRequest, siteSeed: SiteSeed) {
  const existing = await payload.find({
    collection: 'sites',
    depth: 0,
    limit: 1,
    req,
    where: {
      code: {
        equals: siteSeed.code,
      },
    },
  })

  if (existing.docs[0]) {
    return payload.update({
      collection: 'sites',
      id: existing.docs[0].id,
      req,
      context: seedContext,
      data: {
        name: siteSeed.name,
        code: siteSeed.code,
        primaryDomain: siteSeed.domain,
        supportedLocales: ['vi', 'en'],
        defaultLocale: 'vi',
        isActive: true,
      },
    })
  }

  return payload.create({
    collection: 'sites',
    req,
    context: seedContext,
    data: seedData({
      name: siteSeed.name,
      code: siteSeed.code,
      primaryDomain: siteSeed.domain,
      supportedLocales: ['vi', 'en'],
      defaultLocale: 'vi',
      isActive: true,
    }),
  })
}

async function clearSiteContent(payload: Payload, req: PayloadRequest, siteID: number | string) {
  await payload.db.deleteMany({
    collection: 'site-settings',
    req,
    where: {
      site: {
        equals: siteID,
      },
    },
  })

  await payload.db.deleteMany({
    collection: 'posts',
    req,
    where: {
      site: {
        equals: siteID,
      },
    },
  })

  await payload.db.deleteMany({
    collection: 'pages',
    req,
    where: {
      site: {
        equals: siteID,
      },
    },
  })

  await payload.db.deleteMany({
    collection: 'categories',
    req,
    where: {
      site: {
        equals: siteID,
      },
    },
  })

  await payload.db.deleteMany({
    collection: 'media',
    req,
    where: {
      site: {
        equals: siteID,
      },
    },
  })
}

async function seedSite(payload: Payload, req: PayloadRequest, siteSeed: SiteSeed) {
  const site = await upsertSite(payload, req, siteSeed)
  await clearSiteContent(payload, req, site.id)
  const homeSlug = siteSeed.code === 'wings-travel' ? 'home' : `${siteSeed.code}-home`
  const contactSlug = siteSeed.code === 'wings-travel' ? 'contact' : `${siteSeed.code}-contact`
  const landingSlug = 'campaign'

  const heroFile = await fetchFileByURL(
    'https://raw.githubusercontent.com/payloadcms/payload/refs/heads/main/templates/website/src/endpoints/seed/image-hero1.webp',
  )
  const postFile = await fetchFileByURL(
    'https://raw.githubusercontent.com/payloadcms/payload/refs/heads/main/templates/website/src/endpoints/seed/image-post1.webp',
  )

  const heroImage = await payload.create({
    collection: 'media',
    req,
    context: seedContext,
    data: {
      alt: `${siteSeed.name} hero`,
      caption: richText(siteSeed.name, siteSeed.summary),
      site: site.id,
    },
    file: heroFile,
  })

  const postImage = await payload.create({
    collection: 'media',
    req,
    context: seedContext,
    data: {
      alt: `${siteSeed.name} editorial`,
      caption: richText(`${siteSeed.name} article`, `Editorial image for ${siteSeed.name}.`),
      site: site.id,
    },
    file: postFile,
  })

  const categoryIDs: number[] = []
  for (const service of siteSeed.services) {
    const category = await payload.create({
      collection: 'categories',
      req,
      context: seedContext,
      data: {
        title: service,
        slug: service.toLowerCase().replace(/\s+/g, '-'),
        site: site.id,
      },
    })
    categoryIDs.push(category.id)
  }

  const contactForm = await payload.create({
    collection: 'forms',
    req,
    context: seedContext,
    data: {
      title: `${siteSeed.name} Contact Form`,
      submitButtonLabel: 'Send request',
      confirmationType: 'message',
      confirmationMessage: richText(
        'Request received',
        `Your message to ${siteSeed.name} has been submitted successfully.`,
      ),
      fields: [
        {
          blockName: 'full-name',
          blockType: 'text',
          name: 'full-name',
          label: 'Full Name',
          required: true,
          width: 100,
        },
        {
          blockName: 'email',
          blockType: 'email',
          name: 'email',
          label: 'Email',
          required: true,
          width: 100,
        },
        {
          blockName: 'message',
          blockType: 'textarea',
          name: 'message',
          label: 'Message',
          required: true,
          width: 100,
        },
      ],
    },
  })

  const homePage = await payload.create({
    collection: 'pages',
    req,
    context: seedContext,
    data: {
      title: `${siteSeed.name} Home`,
      slug: homeSlug,
      _status: 'published',
      site: site.id,
      hero: {
        type: 'highImpact',
        media: heroImage.id,
        links: [
          {
            link: {
              type: 'custom',
              appearance: 'default',
              label: 'Services',
              url: '/posts',
            },
          },
          {
            link: {
              type: 'custom',
              appearance: 'outline',
              label: 'Contact',
              url: '/contact',
            },
          },
        ],
        richText: richText(siteSeed.name, siteSeed.summary),
      },
      layout: [
        {
          blockType: 'content',
          blockName: 'Overview',
          columns: [
            {
              size: 'full',
              richText: richText(
                `About ${siteSeed.name}`,
                `${siteSeed.name} is seeded as a standalone service site under WingsTravel with its own domain and content scope.`,
              ),
            },
          ],
        },
      ],
      meta: {
        title: siteSeed.name,
        description: siteSeed.seoDescription,
        image: heroImage.id,
      },
    },
  })

  const contactPage = await payload.create({
    collection: 'pages',
    req,
    context: seedContext,
    data: {
      title: `${siteSeed.name} Contact`,
      slug: contactSlug,
      _status: 'published',
      site: site.id,
      hero: {
        type: 'none',
      },
      layout: [
        {
          blockType: 'formBlock',
          enableIntro: true,
          form: contactForm.id,
          introContent: richText(
            `Contact ${siteSeed.name}`,
            `Use this form to send inquiries for ${siteSeed.name}.`,
          ),
        },
      ],
      meta: {
        title: `${siteSeed.name} Contact`,
        description: `Trang lien he va tiep nhan yeu cau cho ${siteSeed.name}.`,
        image: heroImage.id,
      },
    },
  })

  const landingPage = await payload.create({
    collection: 'pages',
    req,
    context: seedContext,
    data: seedData({
      title: `${siteSeed.name} Campaign Landing`,
      slug: landingSlug,
      _status: 'published',
      site: site.id,
      parentPage: homePage.id,
      relatedPages: [contactPage.id],
      hero: {
        type: 'highImpact',
        media: heroImage.id,
        links: [
          {
            link: {
              type: 'custom',
              appearance: 'default',
              label: 'Send inquiry',
              url: '/contact',
            },
          },
          {
            link: {
              type: 'custom',
              appearance: 'outline',
              label: 'Read updates',
              url: '/posts',
            },
          },
        ],
        richText: richText(
          `${siteSeed.name} campaign landing page`,
          `Reusable campaign structure for ${siteSeed.name}: hero, proof content, visual asset, CTA, and contact form.`,
        ),
      },
      layout: [
        {
          blockType: 'content',
          blockName: 'Campaign proof points',
          columns: [
            {
              size: 'half',
              richText: richText(
                'Campaign promise',
                `${siteSeed.name} can adapt this section for a service, seasonal promotion, or market-specific message.`,
              ),
            },
            {
              size: 'half',
              richText: richText(
                'Editorial control',
                'Editors can update this block, CTA labels, images, and form intro from Payload without frontend code changes.',
              ),
            },
          ],
        },
        {
          blockType: 'mediaBlock',
          media: heroImage.id,
        },
        {
          blockType: 'cta',
          richText: richText('Ready to plan the next step?', `Contact ${siteSeed.name} from this reusable landing page.`),
          links: [
            {
              link: {
                type: 'custom',
                appearance: 'default',
                label: 'Contact team',
                url: '/contact',
              },
            },
          ],
        },
        {
          blockType: 'formBlock',
          enableIntro: true,
          form: contactForm.id,
          introContent: richText(
            `Request ${siteSeed.name} information`,
            'This form block proves landing pages can capture campaign inquiries through CMS-managed structure.',
          ),
        },
      ],
      meta: {
        title: `${siteSeed.name} Campaign`,
        description: `Reusable landing page pattern for ${siteSeed.name} campaigns and market-specific offers.`,
        image: heroImage.id,
        breadcrumbLabel: 'Campaign',
      },
    }),
  })

  await payload.create({
    collection: 'posts',
    req,
    context: seedContext,
    data: {
      title: `${siteSeed.name} launch content`,
      slug: `${siteSeed.code}-launch-content`,
      _status: 'published',
      site: site.id,
      heroImage: postImage.id,
      content: richText(
        `${siteSeed.name} ready for content operations`,
        `${siteSeed.name} has sample data for multi-domain, multi-language, and per-site management testing.`,
      ),
      categories: categoryIDs,
      relatedPosts: [],
      authors: [],
      meta: {
        title: `${siteSeed.name} launch content`,
        description: siteSeed.seoDescription,
        image: postImage.id,
      },
    },
  })

  await payload.create({
    collection: 'site-settings',
    req,
    context: seedContext,
    data: {
      site: site.id,
      siteName: siteSeed.name,
      tagline: siteSeed.summary,
      branding: {
        logoText: siteSeed.name,
        brandColor: siteSeed.brandColor,
        accentColor: siteSeed.accentColor,
        logoImage: heroImage.id,
      },
      seo: {
        defaultTitle: siteSeed.name,
        titleSuffix: siteSeed.seoSuffix,
        defaultDescription: siteSeed.seoDescription,
        defaultImage: heroImage.id,
        canonicalDomain: `https://${siteSeed.domain.replace('.local', '.com')}`,
      },
      supportEmail: `hello@${siteSeed.domain.replace('.local', '.com')}`,
      supportPhone: '+84 28 0000 0000',
      headerNavItems: [
        {
          link: {
            type: 'custom',
            label: 'Home',
            url: '/',
          },
        },
        {
          link: {
            type: 'custom',
            label: 'Campaign',
            url: '/campaign',
          },
        },
        {
          link: {
            type: 'custom',
            label: 'Posts',
            url: '/posts',
          },
        },
        {
          link: {
            type: 'custom',
            label: 'Contact',
            url: '/contact',
          },
        },
      ],
      footerNavItems: [
        {
          link: {
            type: 'custom',
            label: 'Home',
            url: '/',
          },
        },
        {
          link: {
            type: 'custom',
            label: 'Admin',
            url: '/admin',
          },
        },
      ],
      footerNote: `${siteSeed.name} is configured as a standalone service site under the WingsTravel multisite platform.`,
    },
  })

  return {
    homePageID: homePage.id,
    contactPageID: contactPage.id,
    landingPageID: landingPage.id,
    siteID: site.id,
  }
}

async function main() {
  const payload = await getPayload({ config })
  const users = await payload.find({
    collection: 'users',
    depth: 0,
    limit: 1,
  })
  const currentUser = users.docs[0]

  if (!currentUser) {
    throw new Error('No admin user found. Create the first user before running the multisite seed.')
  }

  const adminUser =
    currentUser.role === 'super-admin'
      ? currentUser
      : await payload.update({
          collection: 'users',
          id: currentUser.id,
          data: {
            role: 'super-admin',
            sites: [],
          },
        })

  const req = await createLocalReq({ user: adminUser }, payload)

  for (const siteSeed of siteSeeds) {
    payload.logger.info(`Seeding ${siteSeed.name}...`)
    await seedSite(payload, req, siteSeed)
  }

  await payload.updateGlobal({
    slug: 'header',
    req,
    context: seedContext,
    data: {
      navItems: [
        {
          link: {
            type: 'custom',
            label: 'Sites',
            url: '/',
          },
        },
        {
          link: {
            type: 'custom',
            label: 'Admin',
            url: '/admin',
          },
        },
      ],
    },
  })

  await payload.updateGlobal({
    slug: 'footer',
    req,
    context: seedContext,
    data: {
      navItems: [
        {
          link: {
            type: 'custom',
            label: 'WingsTravel',
            url: '/',
          },
        },
        {
          link: {
            type: 'custom',
            label: 'Payload Admin',
            url: '/admin',
          },
        },
      ],
    },
  })

  payload.logger.info('Subsites seeded successfully.')
}

try {
  await main()
  process.exit(0)
} catch (error) {
  console.error(error)
  process.exit(1)
}
