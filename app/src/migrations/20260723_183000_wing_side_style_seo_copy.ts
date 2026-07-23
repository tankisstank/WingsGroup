import type { MigrateDownArgs, MigrateUpArgs } from '@payloadcms/db-postgres'
import { sql } from '@payloadcms/db-postgres'

const localizedSuffixes = sql`
  VALUES
    ('vi', ' Khám phá hành trình Việt Nam thiết kế riêng theo nhịp độ và sở thích của bạn.'),
    ('en', ' Explore private Vietnam journeys tailored to your pace, interests, and travel dates.'),
    ('it', ' Scopri viaggi privati in Vietnam su misura per ritmo, interessi e date del viaggio.'),
    ('es', ' Descubre viajes privados por Vietnam adaptados a tu ritmo, intereses y fechas.'),
    ('pt', ' Descubra viagens privadas pelo Vietname adaptadas ao seu ritmo, interesses e datas.')
`

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    UPDATE "pages_locales" AS pl
    SET "meta_description" = trim(pl."meta_description") || suffixes.suffix
    FROM (${localizedSuffixes}) AS suffixes(locale, suffix)
    WHERE pl."_locale"::text = suffixes.locale
      AND length(trim(coalesce(pl."meta_description", ''))) < 50
      AND right(trim(coalesce(pl."meta_description", '')), length(suffixes.suffix)) <> suffixes.suffix
      AND EXISTS (
        SELECT 1
        FROM "pages" AS p
        INNER JOIN "sites" AS s ON s."id" = p."site_id"
        WHERE p."id" = pl."_parent_id"
          AND s."code" = 'wing-side'
          AND p."slug" IN (
            'wings-side-adventure',
            'wings-side-culture',
            'wings-side-family',
            'wings-side-luxury'
          )
      );
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    UPDATE "pages_locales" AS pl
    SET "meta_description" = left(
      trim(pl."meta_description"),
      length(trim(pl."meta_description")) - length(suffixes.suffix)
    )
    FROM (${localizedSuffixes}) AS suffixes(locale, suffix)
    WHERE pl."_locale"::text = suffixes.locale
      AND right(trim(coalesce(pl."meta_description", '')), length(suffixes.suffix)) = suffixes.suffix
      AND EXISTS (
        SELECT 1
        FROM "pages" AS p
        INNER JOIN "sites" AS s ON s."id" = p."site_id"
        WHERE p."id" = pl."_parent_id"
          AND s."code" = 'wing-side'
          AND p."slug" IN (
            'wings-side-adventure',
            'wings-side-culture',
            'wings-side-family',
            'wings-side-luxury'
          )
      );
  `)
}
