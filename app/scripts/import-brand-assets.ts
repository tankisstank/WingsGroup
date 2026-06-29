import 'dotenv/config'

import fs from 'fs/promises'
import path from 'path'
import { execFileSync } from 'child_process'
import { fileURLToPath } from 'url'

import { createLocalReq, getPayload } from 'payload'
import { DEFAULT_LOCAL_DATABASE_URL, resolveLocalDatabaseURL } from '../src/utilities/localDatabase'

const filename = fileURLToPath(import.meta.url)
const scriptDir = path.dirname(filename)
const repoRoot = path.resolve(scriptDir, '../..')
const visualIdentityRoot = process.env.VISUAL_IDENTITY_ROOT
  ? path.resolve(process.env.VISUAL_IDENTITY_ROOT)
  : path.join(repoRoot, 'source/brand/visual-identity')
const referencePath = path.join(visualIdentityRoot, 'site-brand-reference.json')

type BrandSite = {
  colors: {
    accent: string
    primary: string
    secondaryAccent?: string
  }
  displayTitle: string
  siteCode: string
  tagline?: null | string
  valueLine?: null | string
}

type BrandReference = {
  sites: BrandSite[]
}

type AssetManifest = {
  assets: {
    favicon: string
    logoPrimary: string
    ogImage: string
  }
  displayTitle: string
  siteCode: string
}

const runtimeSiteCodeByReferenceCode: Record<string, string> = {
  wingsgroup: 'wings-group',
  wingsgo: 'wings-go',
  wingspass: 'wings-pass',
  wingsside: 'wings-side',
  wingscare: 'wings-care',
  wingsplus: 'wings-plus',
}

const mimeByExtension: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
}

const seedContext = {
  disableRevalidate: true,
}

const richText = (heading: string, body: string) => ({
  root: {
    type: 'root',
    children: [
      {
        type: 'heading',
        tag: 'h3',
        version: 1,
        children: [{ type: 'text', text: heading, version: 1 }],
      },
      {
        type: 'paragraph',
        version: 1,
        children: [{ type: 'text', text: body, version: 1 }],
      },
    ],
    direction: 'ltr' as const,
    format: '' as const,
    indent: 0,
    version: 1,
  },
})

const readUploadFile = async (filePath: string) => {
  const bytes = await fs.readFile(filePath)
  const extension = path.extname(filePath).replace('.', '').toLowerCase() || 'png'

  return {
    name: path.basename(filePath),
    data: bytes,
    mimetype: mimeByExtension[extension] || 'image/png',
    size: bytes.byteLength,
  }
}

async function readJSON<T>(filePath: string): Promise<T> {
  return JSON.parse(await fs.readFile(filePath, 'utf-8')) as T
}

async function createBrandMedia({
  assetPath,
  caption,
  payload,
  req,
  siteID,
  title,
}: {
  assetPath: string
  caption: string
  payload: Awaited<ReturnType<typeof getPayload>>
  req: Awaited<ReturnType<typeof createLocalReq>>
  siteID: number
  title: string
}) {
  const absolutePath = path.join(visualIdentityRoot, assetPath)
  const filename = path.basename(absolutePath)
  const existing = await payload.find({
    collection: 'media',
    depth: 0,
    limit: 50,
    overrideAccess: true,
    pagination: false,
    req,
    where: {
      and: [
        { filename: { equals: filename } },
        { site: { equals: siteID } },
      ],
    },
  })

  void existing

  return payload.create({
    collection: 'media',
    context: seedContext,
    data: {
      alt: title,
      caption: richText(title, caption),
      site: siteID,
    },
    file: await readUploadFile(absolutePath),
    overrideAccess: true,
    req,
  })
}

async function main() {
  const databaseURL = resolveLocalDatabaseURL(process.env.DATABASE_URL || DEFAULT_LOCAL_DATABASE_URL)
  const isPostgresURL =
    databaseURL.startsWith('postgres://') || databaseURL.startsWith('postgresql://')

  if (!isPostgresURL && databaseURL.startsWith('file:')) {
    const sqlitePath = path.resolve(process.cwd(), databaseURL.replace(/^file:/, ''))
    execFileSync(
      'python',
      [
        '-c',
        [
          'import sqlite3, sys',
          'db = sys.argv[1]',
          'con = sqlite3.connect(db)',
          'cols = {row[1] for row in con.execute("PRAGMA table_info(site_settings)")}',
          'if "branding_favicon_image_id" not in cols:',
          '    con.execute("ALTER TABLE site_settings ADD COLUMN branding_favicon_image_id INTEGER")',
          '    con.execute("UPDATE site_settings SET branding_favicon_image_id = COALESCE(branding_logo_image_id, seo_default_image_id) WHERE branding_favicon_image_id IS NULL")',
          'site_cols = {row[1] for row in con.execute("PRAGMA table_info(sites)")}',
          'if {"code", "name", "primary_domain"}.issubset(site_cols):',
          '    con.execute("UPDATE sites SET code = ?, name = ?, primary_domain = CASE WHEN primary_domain = ? THEN ? WHEN primary_domain = ? THEN ? ELSE primary_domain END WHERE code = ?", ("wings-group", "WingsGroup", "wingstravel.local", "wingsgroup.local", "wingstravel.vn", "wingsgroup.vn", "wings-travel"))',
          'if {"site_name", "branding_logo_text", "branding_theme_key"}.issubset(cols):',
          '    con.execute("UPDATE site_settings SET site_name = CASE WHEN site_name = ? THEN ? ELSE site_name END, branding_logo_text = CASE WHEN branding_logo_text = ? THEN ? ELSE branding_logo_text END, branding_theme_key = ? WHERE branding_theme_key = ? OR site_name = ? OR branding_logo_text = ?", ("WingsTravel", "WingsGroup", "WingsTravel", "WingsGroup", "wings-group", "wings-travel", "WingsTravel", "WingsTravel"))',
          'if "seo_default_title" in cols:',
          '    con.execute("UPDATE site_settings SET seo_default_title = ? WHERE seo_default_title = ?", ("WingsGroup", "WingsTravel"))',
          'if "seo_canonical_domain" in cols:',
          '    con.execute("UPDATE site_settings SET seo_canonical_domain = CASE WHEN seo_canonical_domain = ? THEN ? WHEN seo_canonical_domain = ? THEN ? ELSE seo_canonical_domain END", ("https://wingstravel.vn", "https://wingsgroup.vn", "https://wingstravel.local", "https://wingsgroup.local"))',
          'con.commit()',
          'con.close()',
        ].join('\n'),
        sqlitePath,
      ],
      { stdio: 'inherit' },
    )
  }

  const { default: config } = await import('../src/payload.config')
  const payload = await getPayload({ config })
  const adminUsers = await payload.find({
    collection: 'users',
    depth: 0,
    limit: 1,
    overrideAccess: true,
    where: {
      role: {
        equals: 'super-admin',
      },
    },
  })
  const req = await createLocalReq({ user: adminUsers.docs[0] }, payload)
  const reference = await readJSON<BrandReference>(referencePath)

  for (const brandSite of reference.sites) {
    const runtimeCode = runtimeSiteCodeByReferenceCode[brandSite.siteCode]
    if (!runtimeCode) {
      throw new Error(`No runtime site code configured for ${brandSite.siteCode}`)
    }

    const sites = await payload.find({
      collection: 'sites',
      depth: 0,
      limit: 1,
      overrideAccess: true,
      pagination: false,
      req,
      where: {
        code: {
          equals: runtimeCode,
        },
      },
    })
    const site = sites.docs[0]
    if (!site) {
      throw new Error(`Site not found for code ${runtimeCode}`)
    }

    const existingSettings = await payload.find({
      collection: 'site-settings',
      depth: 1,
      limit: 1,
      overrideAccess: true,
      pagination: false,
      req,
      where: {
        site: {
          equals: site.id,
        },
      },
    })
    const settings = existingSettings.docs[0]
    if (!settings) {
      throw new Error(`Site settings not found for ${runtimeCode}`)
    }

    const manifestPath = path.join(visualIdentityRoot, 'exports', brandSite.siteCode, 'manifest.json')
    const manifest = await readJSON<AssetManifest>(manifestPath)

    const logo = await createBrandMedia({
      assetPath: manifest.assets.logoPrimary,
      caption: `Generated primary logo from ${brandSite.displayTitle} source board.`,
      payload,
      req,
      siteID: site.id,
      title: `${brandSite.displayTitle} primary logo`,
    })
    const favicon = await createBrandMedia({
      assetPath: manifest.assets.favicon,
      caption: `Generated favicon from ${brandSite.displayTitle} mark.`,
      payload,
      req,
      siteID: site.id,
      title: `${brandSite.displayTitle} favicon`,
    })
    const ogImage = await createBrandMedia({
      assetPath: manifest.assets.ogImage,
      caption: `Generated Open Graph image for ${brandSite.displayTitle}.`,
      payload,
      req,
      siteID: site.id,
      title: `${brandSite.displayTitle} Open Graph image`,
    })

    await payload.update({
      collection: 'site-settings',
      context: seedContext,
      data: {
        branding: {
          ...settings.branding,
          accentColor: brandSite.colors.accent,
          brandColor: brandSite.colors.primary,
          faviconImage: favicon.id,
          logoImage: logo.id,
          logoText: brandSite.displayTitle,
        },
        seo: {
          ...settings.seo,
          defaultImage: ogImage.id,
        },
        siteName: brandSite.displayTitle,
        tagline: brandSite.tagline || brandSite.valueLine || settings.tagline,
      },
      id: settings.id,
      overrideAccess: true,
      req,
    })

    console.log(`Imported brand assets for ${runtimeCode}`)
  }

  console.log('Brand asset import completed.')
  await payload.destroy()
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
}).then(() => {
  process.exit(0)
})
