import { createLocalReq, getPayload } from 'payload'

import config from '../../src/payload.config.js'

const seedContext = {
  disableRevalidate: true,
  seed: true,
}

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

const seedData = <T>(data: T) => data as never

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

export async function seedPhase1LaunchSmoke(): Promise<void> {
  const payload = await getPayload({ config })
  const adminResult = await payload.find({
    collection: 'users',
    depth: 0,
    limit: 1,
    where: {
      role: {
        equals: 'super-admin',
      },
    },
  })
  const adminUser =
    adminResult.docs[0] ||
    (await payload.create({
      collection: 'users',
      context: seedContext,
      data: {
        email: 'phase1-smoke-admin@example.com',
        password: 'test',
        role: 'super-admin',
      },
    }))
  const req = await createLocalReq({ user: adminUser }, payload)

  const siteResult = await payload.find({
    collection: 'sites',
    depth: 0,
    limit: 1,
    req,
    where: {
      code: {
        equals: 'wings-go',
      },
    },
  })
  const site = siteResult.docs[0]

  if (!site) {
    throw new Error('WingsGo site is required before running Phase 1 E2E smoke tests.')
  }

  const existingCampaign = await payload.find({
    collection: 'pages',
    depth: 0,
    limit: 1,
    req,
    where: {
      and: [
        {
          site: {
            equals: site.id,
          },
        },
        {
          slug: {
            equals: 'campaign',
          },
        },
      ],
    },
  })

  if (existingCampaign.docs[0]) {
    return
  }

  const [homeResult, contactResult, mediaResult, formResult] = await Promise.all([
    payload.find({
      collection: 'pages',
      depth: 0,
      limit: 1,
      req,
      where: {
        and: [
          {
            site: {
              equals: site.id,
            },
          },
          {
            slug: {
              equals: 'wings-go-home',
            },
          },
        ],
      },
    }),
    payload.find({
      collection: 'pages',
      depth: 0,
      limit: 1,
      req,
      where: {
        and: [
          {
            site: {
              equals: site.id,
            },
          },
          {
            slug: {
              equals: 'wings-go-contact',
            },
          },
        ],
      },
    }),
    payload.find({
      collection: 'media',
      depth: 0,
      limit: 1,
      req,
      where: {
        site: {
          equals: site.id,
        },
      },
    }),
    payload.find({
      collection: 'forms',
      depth: 0,
      limit: 1,
      req,
      where: {
        title: {
          equals: 'WingsGo Contact Form',
        },
      },
    }),
  ])

  const form =
    formResult.docs[0] ||
    (await payload.create({
      collection: 'forms',
      context: seedContext,
      req,
      data: seedData({
        title: 'WingsGo Contact Form',
        submitButtonLabel: 'Send request',
        confirmationType: 'message',
        confirmationMessage: richText('Request received', 'Your message has been submitted.'),
        fields: [
          {
            blockName: 'email',
            blockType: 'email',
            name: 'email',
            label: 'Email',
            required: true,
            width: 100,
          },
        ],
      }),
    }))
  const media = mediaResult.docs[0]

  if (!media) {
    throw new Error('WingsGo media is required before running campaign landing smoke tests.')
  }

  await payload.create({
    collection: 'pages',
    context: seedContext,
    req,
    data: seedData({
      title: 'WingsGo Campaign Landing',
      slug: 'campaign',
      _status: 'published',
      site: site.id,
      parentPage: homeResult.docs[0]?.id,
      relatedPages: contactResult.docs[0] ? [contactResult.docs[0].id] : [],
      hero: {
        type: 'none',
      },
      layout: [
        {
          blockType: 'content',
          columns: [
            {
              size: 'full',
              richText: richText(
                'WingsGo Campaign Landing',
                'Phase 1 campaign page smoke content for the WingsGo child site.',
              ),
            },
          ],
        },
        {
          blockType: 'mediaBlock',
          media: media.id,
        },
        {
          blockType: 'cta',
          richText: richText('Contact WingsGo', 'Reusable landing page CTA for Phase 1.'),
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
          form: form.id,
          introContent: richText('Request WingsGo information', 'This form proves CMS-managed landing capture.'),
        },
      ],
      meta: {
        title: 'WingsGo Campaign',
        description: 'Reusable landing page pattern for WingsGo campaign smoke testing.',
        image: media.id,
        breadcrumbLabel: 'Campaign',
      },
    }),
  })
}
