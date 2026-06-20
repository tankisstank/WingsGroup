import type { CollectionSlug, GlobalSlug, Payload, PayloadRequest, File } from 'payload'

import { contactForm as contactFormData } from './contact-form'
import { contact as contactPageData } from './contact-page'
import { home } from './home'
import { image1 } from './image-1'
import { image2 } from './image-2'
import { imageHero1 } from './image-hero-1'
import { post1 } from './post-1'
import { post2 } from './post-2'
import { post3 } from './post-3'
import { ensureLocalAdminUser, localAdminCredentials } from '@/utilities/adminSeed'
import { ensureThemePresetSeeds, siteThemeAssignments } from '@/utilities/themeSeed'

const collections: CollectionSlug[] = [
  'form-submissions',
  'pages',
  'posts',
  'categories',
  'media',
  'forms',
  'site-settings',
  'search',
  'sites',
]

const globals: GlobalSlug[] = ['header', 'footer']

const categories = ['Technology', 'News', 'Finance', 'Design', 'Software', 'Engineering']
const seedContext = {
  disableRevalidate: true,
  seed: true,
}

const seedData = <T>(data: T) => data as never

// Next.js revalidation errors are normal when seeding the database without a server running
// i.e. running `yarn seed` locally instead of using the admin UI within an active app
// The app is not running to revalidate the pages and so the API routes are not available
// These error messages can be ignored: `Error hitting revalidate route for...`
export const seed = async ({
  payload,
  req,
}: {
  payload: Payload
  req: PayloadRequest
}): Promise<void> => {
  payload.logger.info('Seeding database...')

  // we need to clear the media directory before seeding
  // as well as the collections and globals
  // this is because while `yarn seed` drops the database
  // the custom `/api/seed` endpoint does not
  payload.logger.info(`— Clearing collections and globals...`)

  // clear the database
  await Promise.all(
    globals.map((global) =>
      payload.updateGlobal({
        slug: global,
        data: {
          navItems: [],
        },
        depth: 0,
        context: seedContext,
        req,
      }),
    ),
  )

  await Promise.all(
    collections.map((collection) => payload.db.deleteMany({ collection, req, where: {} })),
  )

  await Promise.all(
    collections
      .filter((collection) => Boolean(payload.collections[collection].config.versions))
      .map((collection) => payload.db.deleteVersions({ collection, req, where: {} })),
  )

  payload.logger.info(`— Seeding local admin and demo author...`)

  await ensureLocalAdminUser(payload, req)
  payload.logger.info(`— Local admin ready: ${localAdminCredentials.email}`)

  await payload.delete({
    collection: 'users',
    depth: 0,
    req,
    context: seedContext,
    where: {
      email: {
        equals: 'demo-author@example.com',
      },
    },
  })

  payload.logger.info(`— Seeding site...`)

  const seedSite = await payload.create({
    collection: 'sites',
    req,
    context: seedContext,
    data: {
      name: 'WingsGroup',
      code: 'wings-group',
      primaryDomain: 'wingsgroup.local',
      additionalDomains: [
        {
          domain: 'wingsgo.local',
        },
      ],
      supportedLocales: ['vi', 'en'],
      defaultLocale: 'vi',
      isActive: true,
    },
  })

  const themePresetIDs = await ensureThemePresetSeeds(payload, req)
  const siteThemeAssignment = siteThemeAssignments['wings-group']

  payload.logger.info(`— Seeding media...`)

  const [image1Buffer, image2Buffer, image3Buffer, hero1Buffer] = await Promise.all([
    fetchFileByURL(
      'https://raw.githubusercontent.com/payloadcms/payload/refs/heads/main/templates/website/src/endpoints/seed/image-post1.webp',
    ),
    fetchFileByURL(
      'https://raw.githubusercontent.com/payloadcms/payload/refs/heads/main/templates/website/src/endpoints/seed/image-post2.webp',
    ),
    fetchFileByURL(
      'https://raw.githubusercontent.com/payloadcms/payload/refs/heads/main/templates/website/src/endpoints/seed/image-post3.webp',
    ),
    fetchFileByURL(
      'https://raw.githubusercontent.com/payloadcms/payload/refs/heads/main/templates/website/src/endpoints/seed/image-hero1.webp',
    ),
  ])

  const demoAuthor = await payload.create({
    collection: 'users',
    req,
    context: seedContext,
    data: {
      name: 'Demo Author',
      email: 'demo-author@example.com',
      password: 'password',
      role: 'editor',
      sites: [seedSite.id],
    },
  })

  const image1Doc = await payload.create({
    collection: 'media',
    req,
    context: seedContext,
    data: seedData({
      ...image1,
      site: seedSite.id,
    }),
    file: image1Buffer,
  })

  const image2Doc = await payload.create({
    collection: 'media',
    req,
    context: seedContext,
    data: seedData({
      ...image2,
      site: seedSite.id,
    }),
    file: image2Buffer,
  })

  const image3Doc = await payload.create({
    collection: 'media',
    req,
    context: seedContext,
    data: seedData({
      ...image2,
      site: seedSite.id,
    }),
    file: image3Buffer,
  })

  const imageHomeDoc = await payload.create({
    collection: 'media',
    req,
    context: seedContext,
    data: seedData({
      ...imageHero1,
      site: seedSite.id,
    }),
    file: hero1Buffer,
  })

  await payload.create({
    collection: 'site-settings',
    req,
    context: seedContext,
    data: {
      branding: {
        accentColor: '#A16207',
        brandColor: '#1C1917',
        faviconImage: imageHomeDoc.id,
        logoImage: imageHomeDoc.id,
        logoText: 'WingsGroup',
        themeKey: 'wings-group',
        themePreset: themePresetIDs[siteThemeAssignment.themePreset],
      },
      site: seedSite.id,
      siteName: 'WingsGroup',
    },
  })

  for (const category of categories) {
    await payload.create({
      collection: 'categories',
      req,
      context: seedContext,
      data: {
        site: seedSite.id,
        title: category,
        slug: category,
      },
    })
  }

  payload.logger.info(`— Seeding posts...`)

  // Do not create posts with `Promise.all` because we want the posts to be created in order
  // This way we can sort them by `createdAt` or `publishedAt` and they will be in the expected order
  const post1Doc = await payload.create({
    collection: 'posts',
    depth: 0,
    req,
    context: seedContext,
    data: seedData({
      site: seedSite.id,
      ...post1({ heroImage: image1Doc, blockImage: image2Doc, author: demoAuthor }),
    }),
  })

  const post2Doc = await payload.create({
    collection: 'posts',
    depth: 0,
    req,
    context: seedContext,
    data: seedData({
      site: seedSite.id,
      ...post2({ heroImage: image2Doc, blockImage: image3Doc, author: demoAuthor }),
    }),
  })

  const post3Doc = await payload.create({
    collection: 'posts',
    depth: 0,
    req,
    context: seedContext,
    data: seedData({
      site: seedSite.id,
      ...post3({ heroImage: image3Doc, blockImage: image1Doc, author: demoAuthor }),
    }),
  })

  // update each post with related posts
  await payload.update({
    id: post1Doc.id,
    collection: 'posts',
    req,
    context: seedContext,
    data: {
      relatedPosts: [post2Doc.id, post3Doc.id],
    },
  })
  await payload.update({
    id: post2Doc.id,
    collection: 'posts',
    req,
    context: seedContext,
    data: {
      relatedPosts: [post1Doc.id, post3Doc.id],
    },
  })
  await payload.update({
    id: post3Doc.id,
    collection: 'posts',
    req,
    context: seedContext,
    data: {
      relatedPosts: [post1Doc.id, post2Doc.id],
    },
  })

  payload.logger.info(`— Seeding contact form...`)

  const contactForm = await payload.create({
    collection: 'forms',
    depth: 0,
    req,
    context: seedContext,
    data: {
      ...contactFormData,
      site: seedSite.id,
    },
  })

  payload.logger.info(`— Seeding pages...`)

  const homePage = await payload.create({
    collection: 'pages',
    depth: 0,
    req,
    context: seedContext,
    data: seedData({
      site: seedSite.id,
      ...home({ heroImage: imageHomeDoc, metaImage: image2Doc }),
    }),
  })

  const contactPage = await payload.create({
    collection: 'pages',
    depth: 0,
    req,
    context: seedContext,
    data: seedData({
      site: seedSite.id,
      ...contactPageData({ contactForm: contactForm }),
    }),
  })

  payload.logger.info(`— Seeding globals...`)

  await payload.updateGlobal({
    slug: 'header',
    req,
    context: seedContext,
    data: {
      navItems: [
        {
          link: {
            type: 'custom',
            label: 'Posts',
            url: '/posts',
          },
        },
        {
          link: {
            type: 'reference',
            label: 'Contact',
            reference: {
              relationTo: 'pages',
              value: contactPage.id,
            },
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
            label: 'Admin',
            url: '/admin',
          },
        },
        {
          link: {
            type: 'custom',
            label: 'Source Code',
            newTab: true,
            url: 'https://github.com/payloadcms/payload/tree/main/templates/website',
          },
        },
        {
          link: {
            type: 'custom',
            label: 'Payload',
            newTab: true,
            url: 'https://payloadcms.com/',
          },
        },
      ],
    },
  })

  void homePage

  payload.logger.info('Seeded database successfully!')
}

async function fetchFileByURL(url: string): Promise<File> {
  const res = await fetch(url, {
    credentials: 'include',
    method: 'GET',
  })

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
