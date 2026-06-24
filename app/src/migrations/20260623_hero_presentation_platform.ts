import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TYPE "public"."enum_pages_hero_presentation" ADD VALUE IF NOT EXISTS 'planner-split';
    ALTER TYPE "public"."enum_pages_hero_presentation" ADD VALUE IF NOT EXISTS 'cinematic-carousel';
    ALTER TYPE "public"."enum_pages_hero_presentation" ADD VALUE IF NOT EXISTS 'video-background';
    ALTER TYPE "public"."enum__pages_v_version_hero_presentation" ADD VALUE IF NOT EXISTS 'planner-split';
    ALTER TYPE "public"."enum__pages_v_version_hero_presentation" ADD VALUE IF NOT EXISTS 'cinematic-carousel';
    ALTER TYPE "public"."enum__pages_v_version_hero_presentation" ADD VALUE IF NOT EXISTS 'video-background';

    CREATE TYPE "public"."enum_hero_presentation_presets_base_template" AS ENUM(
      'centered-visual', 'split-visual', 'layered-visuals', 'gradient-mesh',
      'planner-split', 'cinematic-carousel', 'video-background'
    );
    CREATE TYPE "public"."enum_hero_presentation_presets_visual_content_position" AS ENUM('left', 'center', 'right');
    CREATE TYPE "public"."enum_hero_presentation_presets_visual_content_align" AS ENUM('left', 'center', 'right');
    CREATE TYPE "public"."enum_hero_presentation_presets_visual_media_fit" AS ENUM('cover', 'contain');
    CREATE TYPE "public"."enum_hero_presentation_presets_visual_overlay_strength" AS ENUM('none', 'soft', 'strong');
    CREATE TYPE "public"."enum_hero_presentation_presets_behavior_transition" AS ENUM('crossfade', 'slide', 'zoom');
    CREATE TYPE "public"."enum_site_settings_hero_defaults_variant" AS ENUM('standard', 'retail-departures', 'planner', 'utility');
    CREATE TYPE "public"."enum_pages_hero_presentation_mode" AS ENUM('inherit', 'override');
    CREATE TYPE "public"."enum_pages_hero_behavior_mode" AS ENUM('inherit', 'override');
    CREATE TYPE "public"."enum_pages_hero_behavior_overrides_transition" AS ENUM('crossfade', 'slide', 'zoom');
    CREATE TYPE "public"."enum_pages_hero_slides_links_link_type" AS ENUM('reference', 'custom');
    CREATE TYPE "public"."enum_pages_hero_slides_links_link_appearance" AS ENUM('default', 'outline');
    CREATE TYPE "public"."enum__pages_v_version_hero_presentation_mode" AS ENUM('inherit', 'override');
    CREATE TYPE "public"."enum__pages_v_version_hero_behavior_mode" AS ENUM('inherit', 'override');
    CREATE TYPE "public"."enum__pages_v_version_hero_behavior_overrides_transition" AS ENUM('crossfade', 'slide', 'zoom');
    CREATE TYPE "public"."enum__pages_v_version_hero_slides_links_link_type" AS ENUM('reference', 'custom');
    CREATE TYPE "public"."enum__pages_v_version_hero_slides_links_link_appearance" AS ENUM('default', 'outline');

    CREATE TABLE "hero_presentation_presets" (
      "id" serial PRIMARY KEY NOT NULL,
      "name" varchar NOT NULL,
      "key" varchar NOT NULL,
      "description" varchar,
      "is_active" boolean DEFAULT true,
      "base_template" "enum_hero_presentation_presets_base_template" NOT NULL,
      "slots_show_badge" boolean DEFAULT true,
      "slots_show_postcards" boolean DEFAULT true,
      "slots_show_business_panel" boolean DEFAULT true,
      "visual_content_position" "enum_hero_presentation_presets_visual_content_position" DEFAULT 'left',
      "visual_content_align" "enum_hero_presentation_presets_visual_content_align" DEFAULT 'left',
      "visual_media_fit" "enum_hero_presentation_presets_visual_media_fit" DEFAULT 'cover',
      "visual_overlay_strength" "enum_hero_presentation_presets_visual_overlay_strength" DEFAULT 'soft',
      "behavior_autoplay" boolean DEFAULT true,
      "behavior_interval_ms" numeric DEFAULT 6000,
      "behavior_transition" "enum_hero_presentation_presets_behavior_transition" DEFAULT 'crossfade',
      "behavior_transition_ms" numeric DEFAULT 700,
      "behavior_loop" boolean DEFAULT true,
      "behavior_pause_on_hover" boolean DEFAULT true,
      "behavior_show_arrows" boolean DEFAULT true,
      "behavior_show_dots" boolean DEFAULT true,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );

    CREATE TABLE "pages_hero_slides" (
      "_order" integer NOT NULL,
      "_parent_id" integer NOT NULL,
      "_locale" "_locales" NOT NULL,
      "id" varchar PRIMARY KEY NOT NULL,
      "eyebrow" varchar,
      "title" varchar,
      "description" varchar,
      "media_id" integer,
      "mobile_media_id" integer
    );

    CREATE TABLE "pages_hero_slides_links" (
      "_order" integer NOT NULL,
      "_parent_id" varchar NOT NULL,
      "_locale" "_locales" NOT NULL,
      "id" varchar PRIMARY KEY NOT NULL,
      "link_type" "enum_pages_hero_slides_links_link_type" DEFAULT 'reference',
      "link_new_tab" boolean,
      "link_url" varchar,
      "link_label" varchar,
      "link_appearance" "enum_pages_hero_slides_links_link_appearance" DEFAULT 'default'
    );

    CREATE TABLE "_pages_v_version_hero_slides" (
      "_order" integer NOT NULL,
      "_parent_id" integer NOT NULL,
      "_locale" "_locales" NOT NULL,
      "id" serial PRIMARY KEY NOT NULL,
      "eyebrow" varchar,
      "title" varchar,
      "description" varchar,
      "media_id" integer,
      "mobile_media_id" integer,
      "_uuid" varchar
    );

    CREATE TABLE "_pages_v_version_hero_slides_links" (
      "_order" integer NOT NULL,
      "_parent_id" integer NOT NULL,
      "_locale" "_locales" NOT NULL,
      "id" serial PRIMARY KEY NOT NULL,
      "link_type" "enum__pages_v_version_hero_slides_links_link_type" DEFAULT 'reference',
      "link_new_tab" boolean,
      "link_url" varchar,
      "link_label" varchar,
      "link_appearance" "enum__pages_v_version_hero_slides_links_link_appearance" DEFAULT 'default',
      "_uuid" varchar
    );

    ALTER TABLE "site_settings"
      ADD COLUMN "hero_defaults_presentation_preset_id" integer,
      ADD COLUMN "hero_defaults_variant" "enum_site_settings_hero_defaults_variant" DEFAULT 'standard';

    ALTER TABLE "pages_locales"
      ADD COLUMN "hero_presentation_mode" "enum_pages_hero_presentation_mode",
      ADD COLUMN "hero_presentation_preset_id" integer,
      ADD COLUMN "hero_behavior_mode" "enum_pages_hero_behavior_mode" DEFAULT 'inherit',
      ADD COLUMN "hero_behavior_overrides_autoplay" boolean,
      ADD COLUMN "hero_behavior_overrides_interval_ms" numeric,
      ADD COLUMN "hero_behavior_overrides_transition" "enum_pages_hero_behavior_overrides_transition",
      ADD COLUMN "hero_behavior_overrides_transition_ms" numeric,
      ADD COLUMN "hero_behavior_overrides_loop" boolean,
      ADD COLUMN "hero_behavior_overrides_pause_on_hover" boolean,
      ADD COLUMN "hero_behavior_overrides_show_arrows" boolean,
      ADD COLUMN "hero_behavior_overrides_show_dots" boolean,
      ADD COLUMN "hero_video_desktop_video_id" integer,
      ADD COLUMN "hero_video_mobile_video_id" integer,
      ADD COLUMN "hero_video_poster_id" integer;

    ALTER TABLE "_pages_v_locales"
      ADD COLUMN "version_hero_presentation_mode" "enum__pages_v_version_hero_presentation_mode",
      ADD COLUMN "version_hero_presentation_preset_id" integer,
      ADD COLUMN "version_hero_behavior_mode" "enum__pages_v_version_hero_behavior_mode" DEFAULT 'inherit',
      ADD COLUMN "version_hero_behavior_overrides_autoplay" boolean,
      ADD COLUMN "version_hero_behavior_overrides_interval_ms" numeric,
      ADD COLUMN "version_hero_behavior_overrides_transition" "enum__pages_v_version_hero_behavior_overrides_transition",
      ADD COLUMN "version_hero_behavior_overrides_transition_ms" numeric,
      ADD COLUMN "version_hero_behavior_overrides_loop" boolean,
      ADD COLUMN "version_hero_behavior_overrides_pause_on_hover" boolean,
      ADD COLUMN "version_hero_behavior_overrides_show_arrows" boolean,
      ADD COLUMN "version_hero_behavior_overrides_show_dots" boolean,
      ADD COLUMN "version_hero_video_desktop_video_id" integer,
      ADD COLUMN "version_hero_video_mobile_video_id" integer,
      ADD COLUMN "version_hero_video_poster_id" integer;

    ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "hero_presentation_presets_id" integer;

    ALTER TABLE "site_settings" ADD CONSTRAINT "site_settings_hero_defaults_presentation_preset_id_fk"
      FOREIGN KEY ("hero_defaults_presentation_preset_id") REFERENCES "public"."hero_presentation_presets"("id") ON DELETE set null ON UPDATE no action;
    ALTER TABLE "pages_locales" ADD CONSTRAINT "pages_hero_presentation_preset_id_fk"
      FOREIGN KEY ("hero_presentation_preset_id") REFERENCES "public"."hero_presentation_presets"("id") ON DELETE set null ON UPDATE no action;
    ALTER TABLE "_pages_v_locales" ADD CONSTRAINT "_pages_v_version_hero_presentation_preset_id_fk"
      FOREIGN KEY ("version_hero_presentation_preset_id") REFERENCES "public"."hero_presentation_presets"("id") ON DELETE set null ON UPDATE no action;
    ALTER TABLE "pages_hero_slides" ADD CONSTRAINT "pages_hero_slides_media_id_fk"
      FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
    ALTER TABLE "pages_hero_slides" ADD CONSTRAINT "pages_hero_slides_mobile_media_id_fk"
      FOREIGN KEY ("mobile_media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
    ALTER TABLE "pages_hero_slides" ADD CONSTRAINT "pages_hero_slides_parent_id_fk"
      FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
    ALTER TABLE "pages_hero_slides_links" ADD CONSTRAINT "pages_hero_slides_links_parent_id_fk"
      FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_hero_slides"("id") ON DELETE cascade ON UPDATE no action;
    ALTER TABLE "_pages_v_version_hero_slides" ADD CONSTRAINT "_pages_v_version_hero_slides_media_id_fk"
      FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
    ALTER TABLE "_pages_v_version_hero_slides" ADD CONSTRAINT "_pages_v_version_hero_slides_mobile_media_id_fk"
      FOREIGN KEY ("mobile_media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
    ALTER TABLE "_pages_v_version_hero_slides" ADD CONSTRAINT "_pages_v_version_hero_slides_parent_id_fk"
      FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
    ALTER TABLE "_pages_v_version_hero_slides_links" ADD CONSTRAINT "_pages_v_version_hero_slides_links_parent_id_fk"
      FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_version_hero_slides"("id") ON DELETE cascade ON UPDATE no action;
    ALTER TABLE "pages_locales" ADD CONSTRAINT "pages_hero_video_desktop_video_id_fk"
      FOREIGN KEY ("hero_video_desktop_video_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
    ALTER TABLE "pages_locales" ADD CONSTRAINT "pages_hero_video_mobile_video_id_fk"
      FOREIGN KEY ("hero_video_mobile_video_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
    ALTER TABLE "pages_locales" ADD CONSTRAINT "pages_hero_video_poster_id_fk"
      FOREIGN KEY ("hero_video_poster_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
    ALTER TABLE "_pages_v_locales" ADD CONSTRAINT "_pages_v_version_hero_video_desktop_video_id_fk"
      FOREIGN KEY ("version_hero_video_desktop_video_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
    ALTER TABLE "_pages_v_locales" ADD CONSTRAINT "_pages_v_version_hero_video_mobile_video_id_fk"
      FOREIGN KEY ("version_hero_video_mobile_video_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
    ALTER TABLE "_pages_v_locales" ADD CONSTRAINT "_pages_v_version_hero_video_poster_id_fk"
      FOREIGN KEY ("version_hero_video_poster_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
    ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_hero_presentation_presets_fk"
      FOREIGN KEY ("hero_presentation_presets_id") REFERENCES "public"."hero_presentation_presets"("id") ON DELETE cascade ON UPDATE no action;

    CREATE UNIQUE INDEX "hero_presentation_presets_key_idx" ON "hero_presentation_presets" ("key");
    CREATE INDEX "hero_presentation_presets_updated_at_idx" ON "hero_presentation_presets" ("updated_at");
    CREATE INDEX "hero_presentation_presets_created_at_idx" ON "hero_presentation_presets" ("created_at");
    CREATE INDEX "site_settings_hero_defaults_hero_defaults_presentation_p_idx" ON "site_settings" ("hero_defaults_presentation_preset_id");
    CREATE INDEX "pages_hero_hero_presentation_preset_idx" ON "pages_locales" ("hero_presentation_preset_id");
    CREATE INDEX "pages_hero_video_hero_video_desktop_video_idx" ON "pages_locales" ("hero_video_desktop_video_id");
    CREATE INDEX "pages_hero_video_hero_video_mobile_video_idx" ON "pages_locales" ("hero_video_mobile_video_id");
    CREATE INDEX "pages_hero_video_hero_video_poster_idx" ON "pages_locales" ("hero_video_poster_id");
    CREATE INDEX "_pages_v_version_hero_presentation_preset_idx" ON "_pages_v_locales" ("version_hero_presentation_preset_id");
    CREATE INDEX "_pages_v_version_hero_video_desktop_v_idx" ON "_pages_v_locales" ("version_hero_video_desktop_video_id");
    CREATE INDEX "_pages_v_version_hero_video_mobile_vi_idx" ON "_pages_v_locales" ("version_hero_video_mobile_video_id");
    CREATE INDEX "_pages_v_version_hero_video_poster_idx" ON "_pages_v_locales" ("version_hero_video_poster_id");
    CREATE INDEX "pages_hero_slides_order_idx" ON "pages_hero_slides" ("_order");
    CREATE INDEX "pages_hero_slides_parent_id_idx" ON "pages_hero_slides" ("_parent_id");
    CREATE INDEX "pages_hero_slides_locale_idx" ON "pages_hero_slides" ("_locale");
    CREATE INDEX "pages_hero_slides_media_idx" ON "pages_hero_slides" ("media_id");
    CREATE INDEX "pages_hero_slides_mobile_media_idx" ON "pages_hero_slides" ("mobile_media_id");
    CREATE INDEX "pages_hero_slides_links_order_idx" ON "pages_hero_slides_links" ("_order");
    CREATE INDEX "pages_hero_slides_links_parent_id_idx" ON "pages_hero_slides_links" ("_parent_id");
    CREATE INDEX "pages_hero_slides_links_locale_idx" ON "pages_hero_slides_links" ("_locale");
    CREATE INDEX "_pages_v_version_hero_slides_order_idx" ON "_pages_v_version_hero_slides" ("_order");
    CREATE INDEX "_pages_v_version_hero_slides_parent_id_idx" ON "_pages_v_version_hero_slides" ("_parent_id");
    CREATE INDEX "_pages_v_version_hero_slides_locale_idx" ON "_pages_v_version_hero_slides" ("_locale");
    CREATE INDEX "_pages_v_version_hero_slides_media_idx" ON "_pages_v_version_hero_slides" ("media_id");
    CREATE INDEX "_pages_v_version_hero_slides_mobile_media_idx" ON "_pages_v_version_hero_slides" ("mobile_media_id");
    CREATE INDEX "_pages_v_version_hero_slides_links_order_idx" ON "_pages_v_version_hero_slides_links" ("_order");
    CREATE INDEX "_pages_v_version_hero_slides_links_parent_id_idx" ON "_pages_v_version_hero_slides_links" ("_parent_id");
    CREATE INDEX "_pages_v_version_hero_slides_links_locale_idx" ON "_pages_v_version_hero_slides_links" ("_locale");
    CREATE INDEX "payload_locked_documents_rels_hero_presentation_presets__idx"
      ON "payload_locked_documents_rels" ("hero_presentation_presets_id");
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_hero_presentation_presets_fk";
    ALTER TABLE "site_settings" DROP CONSTRAINT "site_settings_hero_defaults_presentation_preset_id_fk";
    ALTER TABLE "pages_locales" DROP CONSTRAINT "pages_hero_presentation_preset_id_fk";
    ALTER TABLE "_pages_v_locales" DROP CONSTRAINT "_pages_v_version_hero_presentation_preset_id_fk";

    DROP TABLE "_pages_v_version_hero_slides_links" CASCADE;
    DROP TABLE "_pages_v_version_hero_slides" CASCADE;
    DROP TABLE "pages_hero_slides_links" CASCADE;
    DROP TABLE "pages_hero_slides" CASCADE;

    ALTER TABLE "site_settings"
      DROP COLUMN "hero_defaults_presentation_preset_id",
      DROP COLUMN "hero_defaults_variant";
    ALTER TABLE "pages_locales"
      DROP COLUMN "hero_presentation_mode",
      DROP COLUMN "hero_presentation_preset_id",
      DROP COLUMN "hero_behavior_mode",
      DROP COLUMN "hero_behavior_overrides_autoplay",
      DROP COLUMN "hero_behavior_overrides_interval_ms",
      DROP COLUMN "hero_behavior_overrides_transition",
      DROP COLUMN "hero_behavior_overrides_transition_ms",
      DROP COLUMN "hero_behavior_overrides_loop",
      DROP COLUMN "hero_behavior_overrides_pause_on_hover",
      DROP COLUMN "hero_behavior_overrides_show_arrows",
      DROP COLUMN "hero_behavior_overrides_show_dots",
      DROP COLUMN "hero_video_desktop_video_id",
      DROP COLUMN "hero_video_mobile_video_id",
      DROP COLUMN "hero_video_poster_id";
    ALTER TABLE "_pages_v_locales"
      DROP COLUMN "version_hero_presentation_mode",
      DROP COLUMN "version_hero_presentation_preset_id",
      DROP COLUMN "version_hero_behavior_mode",
      DROP COLUMN "version_hero_behavior_overrides_autoplay",
      DROP COLUMN "version_hero_behavior_overrides_interval_ms",
      DROP COLUMN "version_hero_behavior_overrides_transition",
      DROP COLUMN "version_hero_behavior_overrides_transition_ms",
      DROP COLUMN "version_hero_behavior_overrides_loop",
      DROP COLUMN "version_hero_behavior_overrides_pause_on_hover",
      DROP COLUMN "version_hero_behavior_overrides_show_arrows",
      DROP COLUMN "version_hero_behavior_overrides_show_dots",
      DROP COLUMN "version_hero_video_desktop_video_id",
      DROP COLUMN "version_hero_video_mobile_video_id",
      DROP COLUMN "version_hero_video_poster_id";
    ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "hero_presentation_presets_id";
    DROP TABLE "hero_presentation_presets" CASCADE;

    DROP TYPE "public"."enum_hero_presentation_presets_base_template";
    DROP TYPE "public"."enum_hero_presentation_presets_visual_content_position";
    DROP TYPE "public"."enum_hero_presentation_presets_visual_content_align";
    DROP TYPE "public"."enum_hero_presentation_presets_visual_media_fit";
    DROP TYPE "public"."enum_hero_presentation_presets_visual_overlay_strength";
    DROP TYPE "public"."enum_hero_presentation_presets_behavior_transition";
    DROP TYPE "public"."enum_site_settings_hero_defaults_variant";
    DROP TYPE "public"."enum_pages_hero_presentation_mode";
    DROP TYPE "public"."enum_pages_hero_behavior_mode";
    DROP TYPE "public"."enum_pages_hero_behavior_overrides_transition";
    DROP TYPE "public"."enum_pages_hero_slides_links_link_type";
    DROP TYPE "public"."enum_pages_hero_slides_links_link_appearance";
    DROP TYPE "public"."enum__pages_v_version_hero_presentation_mode";
    DROP TYPE "public"."enum__pages_v_version_hero_behavior_mode";
    DROP TYPE "public"."enum__pages_v_version_hero_behavior_overrides_transition";
    DROP TYPE "public"."enum__pages_v_version_hero_slides_links_link_type";
    DROP TYPE "public"."enum__pages_v_version_hero_slides_links_link_appearance";

    ALTER TABLE "pages_locales" ALTER COLUMN "hero_presentation" DROP DEFAULT;
    ALTER TYPE "public"."enum_pages_hero_presentation" RENAME TO "enum_pages_hero_presentation_old";
    CREATE TYPE "public"."enum_pages_hero_presentation" AS ENUM(
      'centered-visual', 'split-visual', 'layered-visuals', 'gradient-mesh'
    );
    ALTER TABLE "pages_locales"
      ALTER COLUMN "hero_presentation" TYPE "enum_pages_hero_presentation"
      USING "hero_presentation"::text::"enum_pages_hero_presentation";
    ALTER TABLE "pages_locales" ALTER COLUMN "hero_presentation" SET DEFAULT 'centered-visual';
    DROP TYPE "public"."enum_pages_hero_presentation_old";

    ALTER TABLE "_pages_v_locales" ALTER COLUMN "version_hero_presentation" DROP DEFAULT;
    ALTER TYPE "public"."enum__pages_v_version_hero_presentation"
      RENAME TO "enum__pages_v_version_hero_presentation_old";
    CREATE TYPE "public"."enum__pages_v_version_hero_presentation" AS ENUM(
      'centered-visual', 'split-visual', 'layered-visuals', 'gradient-mesh'
    );
    ALTER TABLE "_pages_v_locales"
      ALTER COLUMN "version_hero_presentation" TYPE "enum__pages_v_version_hero_presentation"
      USING "version_hero_presentation"::text::"enum__pages_v_version_hero_presentation";
    ALTER TABLE "_pages_v_locales" ALTER COLUMN "version_hero_presentation" SET DEFAULT 'centered-visual';
    DROP TYPE "public"."enum__pages_v_version_hero_presentation_old";
  `)
}
