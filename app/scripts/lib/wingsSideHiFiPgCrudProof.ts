/**
 * Payload ORM CRUD proof for wingsSideHiFi on PostgreSQL.
 * Expects DATABASE_URL already migrated empty→head (no push).
 */
import { createLocalReq, getPayload } from 'payload'
import config from '@payload-config'
import { ensureLocalAdminUser } from '@/utilities/adminSeed'

const assert = (cond: unknown, msg: string): void => {
  if (!cond) throw new Error(msg)
}

const seedContext = { disableRevalidate: true, seed: true }

const layoutBlock = (text: string) => [
  {
    blockName: 'CRUD layout',
    blockType: 'content',
    columns: [
      {
        size: 'full',
        richText: {
          root: {
            type: 'root',
            children: [
              {
                type: 'paragraph',
                children: [
                  {
                    type: 'text',
                    detail: 0,
                    format: 0,
                    mode: 'normal',
                    style: '',
                    text,
                    version: 1,
                  },
                ],
                direction: 'ltr',
                format: '',
                indent: 0,
                version: 1,
              },
            ],
            direction: 'ltr',
            format: '',
            indent: 0,
            version: 1,
          },
        },
      },
    ],
  },
]

const main = async () => {
  const payload = await getPayload({ config })

  try {
    const admin = await ensureLocalAdminUser(payload)
    const req = await createLocalReq({ user: admin as never }, payload)
    req.context = { ...req.context, ...seedContext }

    // Minimal site for pages.site FK
    const site = await payload.create({
      collection: 'sites',
      context: seedContext,
      data: {
        code: 'wings-side-hifi-crud',
        name: 'WingSide HiFi CRUD',
        primaryDomain: 'hifi-crud.local',
        supportedLocales: ['en', 'vi'],
        defaultLocale: 'en',
        isActive: true,
      } as never,
      overrideAccess: true,
      req,
    })

    assert(site.id != null, 'site create failed')
    console.log('[hifi-pg-crud] site', site.id)

    const created = await payload.create({
      collection: 'pages',
      context: seedContext,
      locale: 'en',
      data: {
        title: 'HiFi CRUD Home EN',
        slug: 'hifi-crud-home',
        site: site.id,
        _status: 'draft',
        layout: layoutBlock('HiFi CRUD layout EN'),
        hero: { type: 'none' },
        wingsSideHiFi: {
          enabled: true,
          routeVariant: 'home',
          hero: {
            title: 'Tailor-made Vietnam journeys',
            lede: 'EN lede',
            primaryCta: { label: 'Plan trip', href: '/plan-your-trip' },
          },
          home: {
            pillarsTitle: 'Four steps EN',
            pillars: [
              { label: 'Step 1', title: 'Brief EN', body: 'Body EN' },
              { label: 'Step 2', title: 'Match EN', body: 'Body2 EN' },
            ],
            whyTitle: 'Why EN',
            whyCards: [{ title: 'Card EN', body: 'Why body EN', cta: 'Go', href: '/styles' }],
            destTitle: 'Dest EN',
            stylesTitle: 'Styles EN',
            journeysTitle: 'Journeys EN',
            notesTitle: 'Notes EN',
            notes: [{ title: 'Note EN', body: 'Note body EN' }],
            trust: [{ kind: 'sla', title: 'SLA EN', body: 'Reply EN' }],
            closeTitle: 'Close EN',
            closeCta: 'Plan',
            related: [{ title: 'Rel EN', body: 'Rel body', href: '/packages' }],
            credentials: [],
          },
        },
      } as never,
      overrideAccess: true,
      req,
    })

    assert(created.id, 'create returned id')

    // Re-read EN with row ids so VI localization updates the same array rows.
    const enAfterCreate = await payload.findByID({
      collection: 'pages',
      id: created.id,
      locale: 'en',
      depth: 0,
      overrideAccess: true,
      req,
    })
    const enHifiCreated = (enAfterCreate as { wingsSideHiFi?: Record<string, unknown> }).wingsSideHiFi
    const enHomeCreated = enHifiCreated?.home as {
      pillars?: Array<{ id?: string; label?: string; title?: string; body?: string }>
      whyCards?: Array<{ id?: string; title?: string; body?: string; cta?: string; href?: string }>
      notes?: Array<{ id?: string; title?: string; body?: string }>
      trust?: Array<{ id?: string; kind?: string; title?: string; body?: string }>
      related?: Array<{ id?: string; title?: string; body?: string; href?: string }>
      pillarsTitle?: string
    }
    const createdPillars = enHomeCreated?.pillars || []
    assert(
      createdPillars.length === 2,
      `EN create pillars missing: ${JSON.stringify(enHomeCreated?.pillars)}`,
    )
    assert(createdPillars[0]?.title === 'Brief EN', 'EN create pillar title')

    const mapRows = <T extends { id?: string }>(
      rows: T[] | undefined,
      patch: (row: T, index: number) => Record<string, unknown>,
    ) =>
      (rows || []).map((row, index) => ({
        id: row.id,
        ...patch(row, index),
      }))

    // Localize VI on the same array row ids (field-level localization).
    await payload.update({
      collection: 'pages',
      context: seedContext,
      id: created.id,
      locale: 'vi',
      data: {
        title: 'HiFi CRUD Home VI',
        layout: layoutBlock('HiFi CRUD layout VI'),
        wingsSideHiFi: {
          enabled: true,
          routeVariant: 'home',
          hero: {
            title: 'Hành trình Việt Nam may đo',
            lede: 'VI lede',
            primaryCta: { label: 'Lên kế hoạch', href: '/plan-your-trip' },
          },
          home: {
            pillarsTitle: 'Bốn bước VI',
            pillars: mapRows(createdPillars, (_row, index) =>
              index === 0
                ? { label: 'B1', title: 'Brief VI', body: 'Body VI' }
                : { label: 'B2', title: 'Match VI', body: 'Body2 VI' },
            ),
            whyTitle: 'Why VI',
            whyCards: mapRows(enHomeCreated.whyCards, () => ({
              title: 'Card VI',
              body: 'Why body VI',
              cta: 'Đi',
              href: '/styles',
            })),
            destTitle: 'Dest VI',
            stylesTitle: 'Styles VI',
            journeysTitle: 'Journeys VI',
            notesTitle: 'Notes VI',
            notes: mapRows(enHomeCreated.notes, () => ({
              title: 'Note VI',
              body: 'Note body VI',
            })),
            trust: mapRows(enHomeCreated.trust, () => ({
              kind: 'sla',
              title: 'SLA VI',
              body: 'Reply VI',
            })),
            closeTitle: 'Close VI',
            closeCta: 'Plan',
            related: mapRows(enHomeCreated.related, () => ({
              title: 'Rel VI',
              body: 'Rel body',
              href: '/packages',
            })),
            credentials: [],
          },
        },
      } as never,
      overrideAccess: true,
      req,
    })

    const en = await payload.findByID({
      collection: 'pages',
      id: created.id,
      locale: 'en',
      depth: 0,
      overrideAccess: true,
      req,
    })
    const vi = await payload.findByID({
      collection: 'pages',
      id: created.id,
      locale: 'vi',
      depth: 0,
      overrideAccess: true,
      req,
    })

    const enHifi = (en as { wingsSideHiFi?: Record<string, unknown> }).wingsSideHiFi
    const viHifi = (vi as { wingsSideHiFi?: Record<string, unknown> }).wingsSideHiFi
    assert(enHifi?.enabled === true, 'EN enabled')
    assert(enHifi?.routeVariant === 'home', 'EN routeVariant')
    const enHome = enHifi?.home as { pillars?: Array<{ title?: string }>; pillarsTitle?: string }
    const viHome = viHifi?.home as { pillars?: Array<{ title?: string }>; pillarsTitle?: string }
    assert(enHome?.pillarsTitle === 'Four steps EN', `EN pillarsTitle got ${enHome?.pillarsTitle}`)
    assert(viHome?.pillarsTitle === 'Bốn bước VI', `VI pillarsTitle got ${viHome?.pillarsTitle}`)
    assert(Array.isArray(enHome?.pillars) && enHome.pillars.length === 2, 'EN pillars length')
    assert(Array.isArray(viHome?.pillars) && viHome.pillars.length === 2, 'VI pillars length')
    const enPillars = enHome?.pillars || []
    const viPillars = viHome?.pillars || []
    assert(enPillars[0]?.title === 'Brief EN', `EN pillar title got ${JSON.stringify(enPillars[0])}`)
    assert(viPillars[0]?.title === 'Brief VI', `VI pillar title got ${JSON.stringify(viPillars[0])}`)

    // Update EN pillar in place (same row ids so VI locales remain)
    const enPillarRows = (enHome?.pillars || []) as Array<{
      id?: string
      label?: string
      title?: string
      body?: string
    }>
    await payload.update({
      collection: 'pages',
      context: seedContext,
      id: created.id,
      locale: 'en',
      data: {
        layout: layoutBlock('HiFi CRUD layout EN'),
        wingsSideHiFi: {
          ...(enHifi as object),
          home: {
            ...enHome,
            pillars: enPillarRows.map((row, index) =>
              index === 0
                ? { id: row.id, label: 'Step 1', title: 'Brief EN updated', body: 'Body EN' }
                : { id: row.id, label: row.label, title: row.title, body: row.body },
            ),
          },
        },
      } as never,
      overrideAccess: true,
      req,
    })

    const en2 = await payload.findByID({
      collection: 'pages',
      id: created.id,
      locale: 'en',
      depth: 0,
      overrideAccess: true,
      req,
    })
    const en2Home = (en2 as { wingsSideHiFi?: { home?: { pillars?: Array<{ title?: string }> } } })
      .wingsSideHiFi?.home
    assert(en2Home?.pillars?.[0]?.title === 'Brief EN updated', 'EN update failed')

    // VI still intact after EN update
    const vi2 = await payload.findByID({
      collection: 'pages',
      id: created.id,
      locale: 'vi',
      depth: 0,
      overrideAccess: true,
      req,
    })
    const vi2Home = (vi2 as { wingsSideHiFi?: { home?: { pillars?: Array<{ title?: string }> } } })
      .wingsSideHiFi?.home
    assert(vi2Home?.pillars?.[0]?.title === 'Brief VI', 'VI leaked after EN update')

    console.log(
      JSON.stringify(
        {
          ok: true,
          pageId: created.id,
          siteId: site.id,
          enPillars: en2Home?.pillars?.map((p) => p.title),
          viPillars: vi2Home?.pillars?.map((p) => p.title),
        },
        null,
        2,
      ),
    )
  } finally {
    try {
      if (typeof payload.destroy === 'function') await payload.destroy()
    } catch {
      // ignore destroy errors after successful proof
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
