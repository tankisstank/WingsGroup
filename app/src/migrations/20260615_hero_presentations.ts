import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    CREATE TYPE "public"."enum_pages_hero_presentation" AS ENUM(
      'centered-visual',
      'split-visual',
      'layered-visuals',
      'gradient-mesh'
    );

    CREATE TYPE "public"."enum__pages_v_version_hero_presentation" AS ENUM(
      'centered-visual',
      'split-visual',
      'layered-visuals',
      'gradient-mesh'
    );

    ALTER TABLE "pages_locales"
      ADD COLUMN "hero_presentation" "enum_pages_hero_presentation"
      DEFAULT 'centered-visual';

    ALTER TABLE "_pages_v_locales"
      ADD COLUMN "version_hero_presentation" "enum__pages_v_version_hero_presentation"
      DEFAULT 'centered-visual';
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "_pages_v_locales"
      DROP COLUMN "version_hero_presentation";

    ALTER TABLE "pages_locales"
      DROP COLUMN "hero_presentation";

    DROP TYPE "public"."enum__pages_v_version_hero_presentation";
    DROP TYPE "public"."enum_pages_hero_presentation";
  `)
}
