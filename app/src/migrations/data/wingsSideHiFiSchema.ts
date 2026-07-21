/**
 * WingSide hi-fi Pages contract schema (Payload field group `wingsSideHiFi`).
 *
 * Two exact dialect helpers — do not string-convert between them:
 * - SQLite: used only by local `repairLocalSQLiteSchema` (bootstrap)
 * - PostgreSQL: used by migration `20260721_180000_wings_side_hifi_page_contract`
 *
 * PostgreSQL shape follows Payload 3.84 field-level localization for nested arrays
 * (same pattern as forms_blocks_select_options + _locales): base array table holds
 * non-localized cols; sibling *_locales table holds localized cols with
 * `_locale "_locales"` and `serial` id. Version arrays use `serial` ids + `_uuid`.
 */

export const WINGSSIDE_HIFI_ROUTE_VARIANT_ENUM =
  "CREATE TYPE \"public\".\"enum_pages_wings_side_hi_fi_route_variant\" AS ENUM('home', 'plan', 'destinations', 'styles', 'packages', 'guide', 'about', 'contact')"

export const WINGSSIDE_HIFI_ROUTE_VARIANT_ENUM_V =
  "CREATE TYPE \"public\".\"enum__pages_v_version_wings_side_hi_fi_route_variant\" AS ENUM('home', 'plan', 'destinations', 'styles', 'packages', 'guide', 'about', 'contact')"

export const WINGSSIDE_HIFI_TRUST_KIND_ENUM =
  "CREATE TYPE \"public\".\"enum_pages_wings_side_hi_fi_home_trust_kind\" AS ENUM('sla', 'proof', 'planner')"

export const WINGSSIDE_HIFI_TRUST_KIND_ENUM_V =
  "CREATE TYPE \"public\".\"enum__pages_v_version_wings_side_hi_fi_home_trust_kind\" AS ENUM('sla', 'proof', 'planner')"

export const WINGSSIDE_HIFI_CRED_KIND_ENUM =
  "CREATE TYPE \"public\".\"enum_pages_wings_side_hi_fi_home_credentials_kind\" AS ENUM('cert', 'award', 'member', 'iso')"

export const WINGSSIDE_HIFI_CRED_KIND_ENUM_V =
  "CREATE TYPE \"public\".\"enum__pages_v_version_wings_side_hi_fi_home_credentials_kind\" AS ENUM('cert', 'award', 'member', 'iso')"

/** Non-localized scalar columns on pages / version tables */
export const WINGSSIDE_HIFI_PAGES_COLUMNS_SQLITE: ReadonlyArray<readonly [string, string]> = [
  ['wings_side_hi_fi_enabled', 'integer'],
  ['wings_side_hi_fi_route_variant', 'text'],
  ['wings_side_hi_fi_hero_media_id', 'integer'],
  ['wings_side_hi_fi_hero_primary_cta_href', 'text'],
  ['wings_side_hi_fi_hero_secondary_cta_href', 'text'],
  ['wings_side_hi_fi_home_why_featured_href', 'text'],
  ['wings_side_hi_fi_plan_form_id', 'integer'],
  ['wings_side_hi_fi_guide_closing_href', 'text'],
  ['wings_side_hi_fi_contact_form_id', 'integer'],
  ['wings_side_hi_fi_contact_closing_href', 'text'],
]

/** Same columns for SQLite repair (legacy name export). */
export const WINGSSIDE_HIFI_PAGES_COLUMNS = WINGSSIDE_HIFI_PAGES_COLUMNS_SQLITE

export const WINGSSIDE_HIFI_PAGES_LOCALE_COLUMNS: ReadonlyArray<readonly [string, string]> = [
  ['wings_side_hi_fi_hero_eyebrow', 'text'],
  ['wings_side_hi_fi_hero_title', 'text'],
  ['wings_side_hi_fi_hero_lede', 'text'],
  ['wings_side_hi_fi_hero_primary_cta_label', 'text'],
  ['wings_side_hi_fi_hero_secondary_cta_label', 'text'],
  ['wings_side_hi_fi_home_pillars_kicker', 'text'],
  ['wings_side_hi_fi_home_pillars_title', 'text'],
  ['wings_side_hi_fi_home_pillars_lede', 'text'],
  ['wings_side_hi_fi_home_why_kicker', 'text'],
  ['wings_side_hi_fi_home_why_title', 'text'],
  ['wings_side_hi_fi_home_why_featured_badge', 'text'],
  ['wings_side_hi_fi_home_why_featured_title', 'text'],
  ['wings_side_hi_fi_home_why_featured_body', 'text'],
  ['wings_side_hi_fi_home_why_featured_cta', 'text'],
  ['wings_side_hi_fi_home_dest_kicker', 'text'],
  ['wings_side_hi_fi_home_dest_title', 'text'],
  ['wings_side_hi_fi_home_dest_lede', 'text'],
  ['wings_side_hi_fi_home_styles_kicker', 'text'],
  ['wings_side_hi_fi_home_styles_title', 'text'],
  ['wings_side_hi_fi_home_journeys_kicker', 'text'],
  ['wings_side_hi_fi_home_journeys_title', 'text'],
  ['wings_side_hi_fi_home_journeys_lede', 'text'],
  ['wings_side_hi_fi_home_notes_kicker', 'text'],
  ['wings_side_hi_fi_home_notes_title', 'text'],
  ['wings_side_hi_fi_home_close_title', 'text'],
  ['wings_side_hi_fi_home_close_lede', 'text'],
  ['wings_side_hi_fi_home_close_cta', 'text'],
  ['wings_side_hi_fi_home_close_cta_secondary', 'text'],
  ['wings_side_hi_fi_plan_steps_kicker', 'text'],
  ['wings_side_hi_fi_plan_steps_title', 'text'],
  ['wings_side_hi_fi_plan_steps_lede', 'text'],
  ['wings_side_hi_fi_plan_faq_title', 'text'],
  ['wings_side_hi_fi_plan_explore_title', 'text'],
  ['wings_side_hi_fi_destinations_routes_title', 'text'],
  ['wings_side_hi_fi_destinations_deeper_title', 'text'],
  ['wings_side_hi_fi_destinations_closing_title', 'text'],
  ['wings_side_hi_fi_styles_intro_title', 'text'],
  ['wings_side_hi_fi_styles_closing_title', 'text'],
  ['wings_side_hi_fi_packages_grid_title', 'text'],
  ['wings_side_hi_fi_packages_grid_lede', 'text'],
  ['wings_side_hi_fi_packages_closing_title', 'text'],
  ['wings_side_hi_fi_packages_closing_note', 'text'],
  ['wings_side_hi_fi_guide_list_title', 'text'],
  ['wings_side_hi_fi_guide_closing_title', 'text'],
  ['wings_side_hi_fi_guide_closing_cta', 'text'],
  ['wings_side_hi_fi_about_story_title', 'text'],
  ['wings_side_hi_fi_about_story_body', 'text'],
  ['wings_side_hi_fi_about_steps_title', 'text'],
  ['wings_side_hi_fi_about_promises_title', 'text'],
  ['wings_side_hi_fi_about_team_title', 'text'],
  ['wings_side_hi_fi_about_team_lede', 'text'],
  ['wings_side_hi_fi_about_closing_title', 'text'],
  ['wings_side_hi_fi_contact_channels_title', 'text'],
  ['wings_side_hi_fi_contact_next_title', 'text'],
  ['wings_side_hi_fi_contact_closing_title', 'text'],
  ['wings_side_hi_fi_contact_closing_cta', 'text'],
]

type ArrayTableSpec = {
  name: string
  /** Non-localized columns on the base array row (excluding order/parent/id). */
  extraColumns?: ReadonlyArray<readonly [string, string]>
  /** Localized column names stored in *_locales (or inlined for SQLite text). */
  localeColumns: readonly string[]
  media?: boolean
  /** Optional select enum short name for a `kind` column on the base row. */
  kindEnum?: 'trust' | 'credentials'
}

/** Array child tables under pages.wingsSideHiFi.* */
export const WINGSSIDE_HIFI_ARRAY_TABLES: readonly ArrayTableSpec[] = [
  { name: 'home_pillars', localeColumns: ['label', 'title', 'body'] },
  {
    name: 'home_why_cards',
    extraColumns: [['href', 'text']],
    localeColumns: ['title', 'body', 'cta'],
  },
  { name: 'home_notes', localeColumns: ['title', 'body'] },
  {
    name: 'home_trust',
    extraColumns: [['kind', 'text']],
    localeColumns: ['title', 'body'],
    kindEnum: 'trust',
  },
  { name: 'home_related', extraColumns: [['href', 'text']], localeColumns: ['title', 'body'] },
  {
    name: 'home_credentials',
    extraColumns: [['kind', 'text']],
    localeColumns: ['mark', 'micro', 'title', 'body'],
    kindEnum: 'credentials',
  },
  { name: 'plan_steps', localeColumns: ['label', 'title', 'body'] },
  { name: 'plan_explore', extraColumns: [['href', 'text']], localeColumns: ['title', 'body'] },
  {
    name: 'destinations_routes',
    extraColumns: [['href', 'text']],
    localeColumns: ['title', 'body'],
  },
  {
    name: 'destinations_places',
    extraColumns: [['href', 'text']],
    localeColumns: ['title', 'body', 'region'],
    media: true,
  },
  {
    name: 'destinations_closing_links',
    extraColumns: [['href', 'text']],
    localeColumns: ['title', 'body'],
  },
  {
    name: 'styles_styles',
    extraColumns: [['href', 'text']],
    localeColumns: ['title', 'body'],
    media: true,
  },
  {
    name: 'styles_closing_links',
    extraColumns: [['href', 'text']],
    localeColumns: ['title', 'body'],
  },
  {
    name: 'packages_cards',
    extraColumns: [['href', 'text']],
    localeColumns: [
      'badge',
      'micro',
      'title',
      'body',
      'price_from',
      'price_unit',
      'note',
      'view_label',
      'customize_label',
    ],
    media: true,
  },
  {
    name: 'packages_closing_links',
    extraColumns: [['href', 'text']],
    localeColumns: ['title', 'body'],
  },
  { name: 'guide_notes', extraColumns: [['href', 'text']], localeColumns: ['title', 'body'] },
  { name: 'about_promises', localeColumns: ['title', 'body'] },
  {
    name: 'about_closing_links',
    extraColumns: [['href', 'text']],
    localeColumns: ['title', 'body'],
  },
  {
    name: 'contact_channels',
    extraColumns: [['href', 'text']],
    localeColumns: ['label', 'value'],
  },
  { name: 'contact_next_steps', localeColumns: ['title', 'body'] },
  {
    name: 'contact_closing_links',
    extraColumns: [['href', 'text']],
    localeColumns: ['title', 'body'],
  },
]

// --- SQLite (local bootstrap only; exact for libsql/sqlite Payload adapter) ---

const sqlitePagesArray = (spec: ArrayTableSpec): string => {
  const extras = [
    ...(spec.extraColumns || []).map(([n, t]) => `\`${n}\` ${t}`),
    ...(spec.media ? ['`media_id` integer'] : []),
  ]
  return `CREATE TABLE IF NOT EXISTS \`pages_wings_side_hi_fi_${spec.name}\` (
\`_order\` integer NOT NULL,
\`_parent_id\` integer NOT NULL,
\`id\` text PRIMARY KEY NOT NULL,
${extras.length ? `${extras.join(',\n')},\n` : ''}FOREIGN KEY (\`_parent_id\`) REFERENCES \`pages\`(\`id\`) ON UPDATE no action ON DELETE cascade${
    spec.media
      ? ',\nFOREIGN KEY (`media_id`) REFERENCES `media`(`id`) ON UPDATE no action ON DELETE set null'
      : ''
  }
)`
}

const sqlitePagesArrayLocales = (spec: ArrayTableSpec): string => {
  const localeCols = spec.localeColumns.map((n) => `\`${n}\` text`)
  return `CREATE TABLE IF NOT EXISTS \`pages_wings_side_hi_fi_${spec.name}_locales\` (
${localeCols.join(',\n')},
\`id\` integer PRIMARY KEY NOT NULL,
\`_locale\` text NOT NULL,
\`_parent_id\` text NOT NULL,
FOREIGN KEY (\`_parent_id\`) REFERENCES \`pages_wings_side_hi_fi_${spec.name}\`(\`id\`) ON UPDATE no action ON DELETE cascade
)`
}

const sqliteVersionArray = (spec: ArrayTableSpec): string => {
  const extras = [
    ...(spec.extraColumns || []).map(([n, t]) => `\`${n}\` ${t}`),
    ...(spec.media ? ['`media_id` integer'] : []),
  ]
  return `CREATE TABLE IF NOT EXISTS \`_pages_v_version_wings_side_hi_fi_${spec.name}\` (
\`_order\` integer NOT NULL,
\`_parent_id\` integer NOT NULL,
\`id\` integer PRIMARY KEY NOT NULL,
\`_uuid\` text,
${extras.length ? `${extras.join(',\n')},\n` : ''}FOREIGN KEY (\`_parent_id\`) REFERENCES \`_pages_v\`(\`id\`) ON UPDATE no action ON DELETE cascade${
    spec.media
      ? ',\nFOREIGN KEY (`media_id`) REFERENCES `media`(`id`) ON UPDATE no action ON DELETE set null'
      : ''
  }
)`
}

const sqliteVersionArrayLocales = (spec: ArrayTableSpec): string => {
  const localeCols = spec.localeColumns.map((n) => `\`${n}\` text`)
  return `CREATE TABLE IF NOT EXISTS \`_pages_v_version_wings_side_hi_fi_${spec.name}_locales\` (
${localeCols.join(',\n')},
\`id\` integer PRIMARY KEY NOT NULL,
\`_locale\` text NOT NULL,
\`_parent_id\` integer NOT NULL,
FOREIGN KEY (\`_parent_id\`) REFERENCES \`_pages_v_version_wings_side_hi_fi_${spec.name}\`(\`id\`) ON UPDATE no action ON DELETE cascade
)`
}

export const getWingsSideHiFiSQLiteCreateTableStatements = (): string[] => {
  const statements: string[] = []
  for (const spec of WINGSSIDE_HIFI_ARRAY_TABLES) {
    statements.push(
      sqlitePagesArray(spec),
      sqlitePagesArrayLocales(spec),
      sqliteVersionArray(spec),
      sqliteVersionArrayLocales(spec),
    )
  }
  return statements
}

export const getWingsSideHiFiSQLiteIndexStatements = (): string[] => {
  const statements: string[] = []
  for (const spec of WINGSSIDE_HIFI_ARRAY_TABLES) {
    const base = `pages_wings_side_hi_fi_${spec.name}`
    const vBase = `_pages_v_version_wings_side_hi_fi_${spec.name}`
    statements.push(
      `CREATE INDEX IF NOT EXISTS \`${base}_order_idx\` ON \`${base}\` (\`_order\`)`,
      `CREATE INDEX IF NOT EXISTS \`${base}_parent_id_idx\` ON \`${base}\` (\`_parent_id\`)`,
      `CREATE INDEX IF NOT EXISTS \`${base}_locales_locale_idx\` ON \`${base}_locales\` (\`_locale\`)`,
      `CREATE INDEX IF NOT EXISTS \`${base}_locales_parent_id_idx\` ON \`${base}_locales\` (\`_parent_id\`)`,
      `CREATE INDEX IF NOT EXISTS \`${vBase}_order_idx\` ON \`${vBase}\` (\`_order\`)`,
      `CREATE INDEX IF NOT EXISTS \`${vBase}_parent_id_idx\` ON \`${vBase}\` (\`_parent_id\`)`,
      `CREATE INDEX IF NOT EXISTS \`${vBase}_locales_locale_idx\` ON \`${vBase}_locales\` (\`_locale\`)`,
      `CREATE INDEX IF NOT EXISTS \`${vBase}_locales_parent_id_idx\` ON \`${vBase}_locales\` (\`_parent_id\`)`,
    )
    if (spec.media) {
      statements.push(
        `CREATE INDEX IF NOT EXISTS \`${base}_media_idx\` ON \`${base}\` (\`media_id\`)`,
        `CREATE INDEX IF NOT EXISTS \`${vBase}_media_idx\` ON \`${vBase}\` (\`media_id\`)`,
      )
    }
  }
  return statements
}

// --- PostgreSQL (production migration; exact Payload ORM types) ---

const pgKindType = (spec: ArrayTableSpec, version: boolean): string | null => {
  if (spec.kindEnum === 'trust') {
    return version
      ? '"enum__pages_v_version_wings_side_hi_fi_home_trust_kind"'
      : '"enum_pages_wings_side_hi_fi_home_trust_kind"'
  }
  if (spec.kindEnum === 'credentials') {
    return version
      ? '"enum__pages_v_version_wings_side_hi_fi_home_credentials_kind"'
      : '"enum_pages_wings_side_hi_fi_home_credentials_kind"'
  }
  return null
}

const pgPagesArray = (spec: ArrayTableSpec): string => {
  const kindType = pgKindType(spec, false)
  const extras: string[] = []
  for (const [n, t] of spec.extraColumns || []) {
    if (n === 'kind' && kindType) extras.push(`"${n}" ${kindType}`)
    else if (t === 'text') extras.push(`"${n}" varchar`)
    else extras.push(`"${n}" ${t}`)
  }
  if (spec.media) extras.push('"media_id" integer')
  return `CREATE TABLE IF NOT EXISTS "pages_wings_side_hi_fi_${spec.name}" (
	"_order" integer NOT NULL,
	"_parent_id" integer NOT NULL,
	"id" varchar PRIMARY KEY NOT NULL${extras.length ? `,\n\t${extras.join(',\n\t')}` : ''}
)`
}

const pgPagesArrayLocales = (spec: ArrayTableSpec): string => {
  const localeCols = spec.localeColumns.map((n) => `"${n}" varchar`)
  return `CREATE TABLE IF NOT EXISTS "pages_wings_side_hi_fi_${spec.name}_locales" (
	${localeCols.join(',\n\t')},
	"id" serial PRIMARY KEY NOT NULL,
	"_locale" "_locales" NOT NULL,
	"_parent_id" varchar NOT NULL
)`
}

const pgVersionArray = (spec: ArrayTableSpec): string => {
  const kindType = pgKindType(spec, true)
  const extras: string[] = []
  for (const [n, t] of spec.extraColumns || []) {
    if (n === 'kind' && kindType) extras.push(`"${n}" ${kindType}`)
    else if (t === 'text') extras.push(`"${n}" varchar`)
    else extras.push(`"${n}" ${t}`)
  }
  if (spec.media) extras.push('"media_id" integer')
  return `CREATE TABLE IF NOT EXISTS "_pages_v_version_wings_side_hi_fi_${spec.name}" (
	"_order" integer NOT NULL,
	"_parent_id" integer NOT NULL,
	"id" serial PRIMARY KEY NOT NULL,
	"_uuid" varchar${extras.length ? `,\n\t${extras.join(',\n\t')}` : ''}
)`
}

const pgVersionArrayLocales = (spec: ArrayTableSpec): string => {
  const localeCols = spec.localeColumns.map((n) => `"${n}" varchar`)
  return `CREATE TABLE IF NOT EXISTS "_pages_v_version_wings_side_hi_fi_${spec.name}_locales" (
	${localeCols.join(',\n\t')},
	"id" serial PRIMARY KEY NOT NULL,
	"_locale" "_locales" NOT NULL,
	"_parent_id" integer NOT NULL
)`
}

/**
 * Exact PostgreSQL DDL for Payload 3.84 wingsSideHiFi group.
 * Not derived by string-replacing SQLite.
 */
export const getWingsSideHiFiPostgresStatements = (): string[] => {
  const statements: string[] = [
    // Enums (IF NOT EXISTS via DO block for re-runs / smoke)
    `DO $$ BEGIN CREATE TYPE "public"."enum_pages_wings_side_hi_fi_route_variant" AS ENUM('home', 'plan', 'destinations', 'styles', 'packages', 'guide', 'about', 'contact'); EXCEPTION WHEN duplicate_object THEN null; END $$`,
    `DO $$ BEGIN CREATE TYPE "public"."enum__pages_v_version_wings_side_hi_fi_route_variant" AS ENUM('home', 'plan', 'destinations', 'styles', 'packages', 'guide', 'about', 'contact'); EXCEPTION WHEN duplicate_object THEN null; END $$`,
    `DO $$ BEGIN CREATE TYPE "public"."enum_pages_wings_side_hi_fi_home_trust_kind" AS ENUM('sla', 'proof', 'planner'); EXCEPTION WHEN duplicate_object THEN null; END $$`,
    `DO $$ BEGIN CREATE TYPE "public"."enum__pages_v_version_wings_side_hi_fi_home_trust_kind" AS ENUM('sla', 'proof', 'planner'); EXCEPTION WHEN duplicate_object THEN null; END $$`,
    `DO $$ BEGIN CREATE TYPE "public"."enum_pages_wings_side_hi_fi_home_credentials_kind" AS ENUM('cert', 'award', 'member', 'iso'); EXCEPTION WHEN duplicate_object THEN null; END $$`,
    `DO $$ BEGIN CREATE TYPE "public"."enum__pages_v_version_wings_side_hi_fi_home_credentials_kind" AS ENUM('cert', 'award', 'member', 'iso'); EXCEPTION WHEN duplicate_object THEN null; END $$`,
  ]

  for (const spec of WINGSSIDE_HIFI_ARRAY_TABLES) {
    statements.push(
      pgPagesArray(spec),
      pgPagesArrayLocales(spec),
      pgVersionArray(spec),
      pgVersionArrayLocales(spec),
    )
  }

  // Scalar columns — boolean enabled, enum route_variant, varchar hrefs, integer FKs
  statements.push(
    `ALTER TABLE "pages" ADD COLUMN IF NOT EXISTS "wings_side_hi_fi_enabled" boolean`,
    `ALTER TABLE "pages" ADD COLUMN IF NOT EXISTS "wings_side_hi_fi_route_variant" "enum_pages_wings_side_hi_fi_route_variant"`,
    `ALTER TABLE "pages" ADD COLUMN IF NOT EXISTS "wings_side_hi_fi_hero_media_id" integer`,
    `ALTER TABLE "pages" ADD COLUMN IF NOT EXISTS "wings_side_hi_fi_hero_primary_cta_href" varchar`,
    `ALTER TABLE "pages" ADD COLUMN IF NOT EXISTS "wings_side_hi_fi_hero_secondary_cta_href" varchar`,
    `ALTER TABLE "pages" ADD COLUMN IF NOT EXISTS "wings_side_hi_fi_home_why_featured_href" varchar`,
    `ALTER TABLE "pages" ADD COLUMN IF NOT EXISTS "wings_side_hi_fi_plan_form_id" integer`,
    `ALTER TABLE "pages" ADD COLUMN IF NOT EXISTS "wings_side_hi_fi_guide_closing_href" varchar`,
    `ALTER TABLE "pages" ADD COLUMN IF NOT EXISTS "wings_side_hi_fi_contact_form_id" integer`,
    `ALTER TABLE "pages" ADD COLUMN IF NOT EXISTS "wings_side_hi_fi_contact_closing_href" varchar`,
    `ALTER TABLE "_pages_v" ADD COLUMN IF NOT EXISTS "version_wings_side_hi_fi_enabled" boolean`,
    `ALTER TABLE "_pages_v" ADD COLUMN IF NOT EXISTS "version_wings_side_hi_fi_route_variant" "enum__pages_v_version_wings_side_hi_fi_route_variant"`,
    `ALTER TABLE "_pages_v" ADD COLUMN IF NOT EXISTS "version_wings_side_hi_fi_hero_media_id" integer`,
    `ALTER TABLE "_pages_v" ADD COLUMN IF NOT EXISTS "version_wings_side_hi_fi_hero_primary_cta_href" varchar`,
    `ALTER TABLE "_pages_v" ADD COLUMN IF NOT EXISTS "version_wings_side_hi_fi_hero_secondary_cta_href" varchar`,
    `ALTER TABLE "_pages_v" ADD COLUMN IF NOT EXISTS "version_wings_side_hi_fi_home_why_featured_href" varchar`,
    `ALTER TABLE "_pages_v" ADD COLUMN IF NOT EXISTS "version_wings_side_hi_fi_plan_form_id" integer`,
    `ALTER TABLE "_pages_v" ADD COLUMN IF NOT EXISTS "version_wings_side_hi_fi_guide_closing_href" varchar`,
    `ALTER TABLE "_pages_v" ADD COLUMN IF NOT EXISTS "version_wings_side_hi_fi_contact_form_id" integer`,
    `ALTER TABLE "_pages_v" ADD COLUMN IF NOT EXISTS "version_wings_side_hi_fi_contact_closing_href" varchar`,
  )

  for (const [col] of WINGSSIDE_HIFI_PAGES_LOCALE_COLUMNS) {
    statements.push(
      `ALTER TABLE "pages_locales" ADD COLUMN IF NOT EXISTS "${col}" varchar`,
      `ALTER TABLE "_pages_v_locales" ADD COLUMN IF NOT EXISTS "version_${col}" varchar`,
    )
  }

  // FKs + indexes (IF NOT EXISTS where supported)
  for (const spec of WINGSSIDE_HIFI_ARRAY_TABLES) {
    const base = `pages_wings_side_hi_fi_${spec.name}`
    const vBase = `_pages_v_version_wings_side_hi_fi_${spec.name}`
    statements.push(
      `DO $$ BEGIN ALTER TABLE "${base}" ADD CONSTRAINT "${base}_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "pages"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object THEN null; END $$`,
      `DO $$ BEGIN ALTER TABLE "${base}_locales" ADD CONSTRAINT "${base}_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "${base}"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object THEN null; END $$`,
      `DO $$ BEGIN ALTER TABLE "${vBase}" ADD CONSTRAINT "${vBase}_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "_pages_v"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object THEN null; END $$`,
      `DO $$ BEGIN ALTER TABLE "${vBase}_locales" ADD CONSTRAINT "${vBase}_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "${vBase}"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object THEN null; END $$`,
      `CREATE INDEX IF NOT EXISTS "${base}_order_idx" ON "${base}" USING btree ("_order")`,
      `CREATE INDEX IF NOT EXISTS "${base}_parent_id_idx" ON "${base}" USING btree ("_parent_id")`,
      `CREATE INDEX IF NOT EXISTS "${base}_locales_locale_idx" ON "${base}_locales" USING btree ("_locale")`,
      `CREATE INDEX IF NOT EXISTS "${base}_locales_parent_id_idx" ON "${base}_locales" USING btree ("_parent_id")`,
      `CREATE INDEX IF NOT EXISTS "${vBase}_order_idx" ON "${vBase}" USING btree ("_order")`,
      `CREATE INDEX IF NOT EXISTS "${vBase}_parent_id_idx" ON "${vBase}" USING btree ("_parent_id")`,
      `CREATE INDEX IF NOT EXISTS "${vBase}_locales_locale_idx" ON "${vBase}_locales" USING btree ("_locale")`,
      `CREATE INDEX IF NOT EXISTS "${vBase}_locales_parent_id_idx" ON "${vBase}_locales" USING btree ("_parent_id")`,
    )
    if (spec.media) {
      statements.push(
        `DO $$ BEGIN ALTER TABLE "${base}" ADD CONSTRAINT "${base}_media_id_media_id_fk" FOREIGN KEY ("media_id") REFERENCES "media"("id") ON DELETE set null ON UPDATE no action; EXCEPTION WHEN duplicate_object THEN null; END $$`,
        `DO $$ BEGIN ALTER TABLE "${vBase}" ADD CONSTRAINT "${vBase}_media_id_media_id_fk" FOREIGN KEY ("media_id") REFERENCES "media"("id") ON DELETE set null ON UPDATE no action; EXCEPTION WHEN duplicate_object THEN null; END $$`,
        `CREATE INDEX IF NOT EXISTS "${base}_media_idx" ON "${base}" USING btree ("media_id")`,
        `CREATE INDEX IF NOT EXISTS "${vBase}_media_idx" ON "${vBase}" USING btree ("media_id")`,
      )
    }
  }

  statements.push(
    `DO $$ BEGIN ALTER TABLE "pages" ADD CONSTRAINT "pages_wings_side_hi_fi_hero_media_id_media_id_fk" FOREIGN KEY ("wings_side_hi_fi_hero_media_id") REFERENCES "media"("id") ON DELETE set null ON UPDATE no action; EXCEPTION WHEN duplicate_object THEN null; END $$`,
    `DO $$ BEGIN ALTER TABLE "_pages_v" ADD CONSTRAINT "_pages_v_version_wings_side_hi_fi_hero_media_id_media_id_fk" FOREIGN KEY ("version_wings_side_hi_fi_hero_media_id") REFERENCES "media"("id") ON DELETE set null ON UPDATE no action; EXCEPTION WHEN duplicate_object THEN null; END $$`,
    `CREATE INDEX IF NOT EXISTS "pages_wings_side_hi_fi_hero_media_idx" ON "pages" USING btree ("wings_side_hi_fi_hero_media_id")`,
    `CREATE INDEX IF NOT EXISTS "_pages_v_version_wings_side_hi_fi_hero_media_idx" ON "_pages_v" USING btree ("version_wings_side_hi_fi_hero_media_id")`,
  )

  return statements
}
