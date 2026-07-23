import type { MigrateDownArgs, MigrateUpArgs } from '@payloadcms/db-postgres'
import { sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    CREATE TYPE "public"."enum_pages_blocks_credentials_carousel_items_review_status"
      AS ENUM('verified', 'needs-review');
    CREATE TYPE "public"."enum__pages_v_blocks_credentials_carousel_items_review_status"
      AS ENUM('verified', 'needs-review');

    ALTER TABLE "pages_blocks_credentials_carousel_items"
      ADD COLUMN "review_status" "enum_pages_blocks_credentials_carousel_items_review_status" DEFAULT 'verified',
      ADD COLUMN "issuer" varchar,
      ADD COLUMN "recipient" varchar,
      ADD COLUMN "recognition_year" numeric,
      ADD COLUMN "issued_on" timestamp(3) with time zone,
      ADD COLUMN "reference_code" varchar,
      ADD COLUMN "source_filename" varchar;

    ALTER TABLE "_pages_v_blocks_credentials_carousel_items"
      ADD COLUMN "review_status" "enum__pages_v_blocks_credentials_carousel_items_review_status" DEFAULT 'verified',
      ADD COLUMN "issuer" varchar,
      ADD COLUMN "recipient" varchar,
      ADD COLUMN "recognition_year" numeric,
      ADD COLUMN "issued_on" timestamp(3) with time zone,
      ADD COLUMN "reference_code" varchar,
      ADD COLUMN "source_filename" varchar;
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "pages_blocks_credentials_carousel_items"
      DROP COLUMN IF EXISTS "review_status",
      DROP COLUMN IF EXISTS "issuer",
      DROP COLUMN IF EXISTS "recipient",
      DROP COLUMN IF EXISTS "recognition_year",
      DROP COLUMN IF EXISTS "issued_on",
      DROP COLUMN IF EXISTS "reference_code",
      DROP COLUMN IF EXISTS "source_filename";

    ALTER TABLE "_pages_v_blocks_credentials_carousel_items"
      DROP COLUMN IF EXISTS "review_status",
      DROP COLUMN IF EXISTS "issuer",
      DROP COLUMN IF EXISTS "recipient",
      DROP COLUMN IF EXISTS "recognition_year",
      DROP COLUMN IF EXISTS "issued_on",
      DROP COLUMN IF EXISTS "reference_code",
      DROP COLUMN IF EXISTS "source_filename";

    DROP TYPE IF EXISTS "public"."enum_pages_blocks_credentials_carousel_items_review_status";
    DROP TYPE IF EXISTS "public"."enum__pages_v_blocks_credentials_carousel_items_review_status";
  `)
}
