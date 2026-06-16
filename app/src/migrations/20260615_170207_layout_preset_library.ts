import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_pages_blocks_cta_presentation" AS ENUM('card', 'full-bleed', 'split-card', 'sticky-bar', 'patterned', 'dual-action', 'inline-form', 'testimonial');
  CREATE TYPE "public"."enum_pages_blocks_content_presentation" AS ENUM('columns', 'reading', 'sidebar-toc', 'editorial-split');
  CREATE TYPE "public"."enum_pages_blocks_feature_grid_presentation" AS ENUM('icon-grid', 'bento', 'alternating', 'tabs', 'accordion', 'sticky-reveal', 'icon-wall', 'before-after');
  CREATE TYPE "public"."enum_pages_blocks_pricing_table_presentation" AS ENUM('departure-table', 'tier-cards', 'comparison-table', 'single-offer', 'package-split', 'mobile-stacked');
  CREATE TYPE "public"."enum_pages_blocks_stats_presentation" AS ENUM('inline-bar', 'card-grid', 'editorial', 'logo-proof', 'progress', 'split-statement', 'floating');
  CREATE TYPE "public"."enum_pages_blocks_testimonial_presentation" AS ENUM('quote-grid', 'marquee', 'masonry', 'featured', 'video', 'social-wall', 'logo-cloud', 'carousel');
  CREATE TYPE "public"."enum_pages_blocks_comparison_options_link_type" AS ENUM('reference', 'custom');
  CREATE TYPE "public"."enum_pages_blocks_comparison_presentation" AS ENUM('matrix', 'before-after', 'package-cards');
  CREATE TYPE "public"."enum_pages_blocks_faq_presentation" AS ENUM('single-column', 'two-column', 'chat-bubbles', 'searchable', 'categorized');
  CREATE TYPE "public"."enum_pages_blocks_media_block_presentation" AS ENUM('contained', 'full-bleed', 'editorial-offset', 'framed');
  CREATE TYPE "public"."enum_pages_blocks_archive_presentation" AS ENUM('card-grid', 'magazine', 'compact-list');
  CREATE TYPE "public"."enum_pages_blocks_form_block_presentation" AS ENUM('split-contact', 'centered-card', 'minimal', 'support-channels');
  CREATE TYPE "public"."enum__pages_v_blocks_cta_presentation" AS ENUM('card', 'full-bleed', 'split-card', 'sticky-bar', 'patterned', 'dual-action', 'inline-form', 'testimonial');
  CREATE TYPE "public"."enum__pages_v_blocks_content_presentation" AS ENUM('columns', 'reading', 'sidebar-toc', 'editorial-split');
  CREATE TYPE "public"."enum__pages_v_blocks_feature_grid_presentation" AS ENUM('icon-grid', 'bento', 'alternating', 'tabs', 'accordion', 'sticky-reveal', 'icon-wall', 'before-after');
  CREATE TYPE "public"."enum__pages_v_blocks_pricing_table_presentation" AS ENUM('departure-table', 'tier-cards', 'comparison-table', 'single-offer', 'package-split', 'mobile-stacked');
  CREATE TYPE "public"."enum__pages_v_blocks_stats_presentation" AS ENUM('inline-bar', 'card-grid', 'editorial', 'logo-proof', 'progress', 'split-statement', 'floating');
  CREATE TYPE "public"."enum__pages_v_blocks_testimonial_presentation" AS ENUM('quote-grid', 'marquee', 'masonry', 'featured', 'video', 'social-wall', 'logo-cloud', 'carousel');
  CREATE TYPE "public"."enum__pages_v_blocks_comparison_options_link_type" AS ENUM('reference', 'custom');
  CREATE TYPE "public"."enum__pages_v_blocks_comparison_presentation" AS ENUM('matrix', 'before-after', 'package-cards');
  CREATE TYPE "public"."enum__pages_v_blocks_faq_presentation" AS ENUM('single-column', 'two-column', 'chat-bubbles', 'searchable', 'categorized');
  CREATE TYPE "public"."enum__pages_v_blocks_media_block_presentation" AS ENUM('contained', 'full-bleed', 'editorial-offset', 'framed');
  CREATE TYPE "public"."enum__pages_v_blocks_archive_presentation" AS ENUM('card-grid', 'magazine', 'compact-list');
  CREATE TYPE "public"."enum__pages_v_blocks_form_block_presentation" AS ENUM('split-contact', 'centered-card', 'minimal', 'support-channels');
  CREATE TABLE "pages_blocks_pricing_table_items_features" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"label" varchar
  );
  
  CREATE TABLE "pages_blocks_stats_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"value" varchar,
  	"label" varchar,
  	"description" varchar,
  	"progress" numeric,
  	"logo_id" integer
  );
  
  CREATE TABLE "pages_blocks_stats" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"presentation" "enum_pages_blocks_stats_presentation" DEFAULT 'inline-bar',
  	"eyebrow" varchar,
  	"title" varchar,
  	"description" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "pages_blocks_testimonial_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"quote" varchar,
  	"name" varchar,
  	"role" varchar,
  	"avatar_id" integer,
  	"logo_id" integer,
  	"video_u_r_l" varchar,
  	"rating" numeric DEFAULT 5
  );
  
  CREATE TABLE "pages_blocks_testimonial" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"presentation" "enum_pages_blocks_testimonial_presentation" DEFAULT 'quote-grid',
  	"eyebrow" varchar,
  	"title" varchar,
  	"description" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "pages_blocks_comparison_options_features" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"label" varchar,
  	"value" varchar
  );
  
  CREATE TABLE "pages_blocks_comparison_options" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"summary" varchar,
  	"price" varchar,
  	"featured" boolean,
  	"link_type" "enum_pages_blocks_comparison_options_link_type" DEFAULT 'reference',
  	"link_new_tab" boolean,
  	"link_url" varchar,
  	"link_label" varchar
  );
  
  CREATE TABLE "pages_blocks_comparison" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"presentation" "enum_pages_blocks_comparison_presentation" DEFAULT 'matrix',
  	"eyebrow" varchar,
  	"title" varchar,
  	"description" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_pricing_table_items_features" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"label" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_stats_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"value" varchar,
  	"label" varchar,
  	"description" varchar,
  	"progress" numeric,
  	"logo_id" integer,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_stats" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"presentation" "enum__pages_v_blocks_stats_presentation" DEFAULT 'inline-bar',
  	"eyebrow" varchar,
  	"title" varchar,
  	"description" varchar,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_testimonial_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"quote" varchar,
  	"name" varchar,
  	"role" varchar,
  	"avatar_id" integer,
  	"logo_id" integer,
  	"video_u_r_l" varchar,
  	"rating" numeric DEFAULT 5,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_testimonial" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"presentation" "enum__pages_v_blocks_testimonial_presentation" DEFAULT 'quote-grid',
  	"eyebrow" varchar,
  	"title" varchar,
  	"description" varchar,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_comparison_options_features" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"label" varchar,
  	"value" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_comparison_options" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"summary" varchar,
  	"price" varchar,
  	"featured" boolean,
  	"link_type" "enum__pages_v_blocks_comparison_options_link_type" DEFAULT 'reference',
  	"link_new_tab" boolean,
  	"link_url" varchar,
  	"link_label" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_comparison" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"presentation" "enum__pages_v_blocks_comparison_presentation" DEFAULT 'matrix',
  	"eyebrow" varchar,
  	"title" varchar,
  	"description" varchar,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  ALTER TABLE "pages_blocks_cta" ADD COLUMN "presentation" "enum_pages_blocks_cta_presentation" DEFAULT 'card';
  ALTER TABLE "pages_blocks_cta" ADD COLUMN "eyebrow" varchar;
  ALTER TABLE "pages_blocks_cta" ADD COLUMN "supporting_quote" varchar;
  ALTER TABLE "pages_blocks_content" ADD COLUMN "presentation" "enum_pages_blocks_content_presentation" DEFAULT 'columns';
  ALTER TABLE "pages_blocks_feature_grid" ADD COLUMN "presentation" "enum_pages_blocks_feature_grid_presentation" DEFAULT 'icon-grid';
  ALTER TABLE "pages_blocks_pricing_table_items" ADD COLUMN "featured" boolean;
  ALTER TABLE "pages_blocks_pricing_table" ADD COLUMN "presentation" "enum_pages_blocks_pricing_table_presentation" DEFAULT 'departure-table';
  ALTER TABLE "pages_blocks_faq_items" ADD COLUMN "category" varchar;
  ALTER TABLE "pages_blocks_faq" ADD COLUMN "presentation" "enum_pages_blocks_faq_presentation" DEFAULT 'single-column';
  ALTER TABLE "pages_blocks_media_block" ADD COLUMN "presentation" "enum_pages_blocks_media_block_presentation" DEFAULT 'contained';
  ALTER TABLE "pages_blocks_archive" ADD COLUMN "presentation" "enum_pages_blocks_archive_presentation" DEFAULT 'card-grid';
  ALTER TABLE "pages_blocks_form_block" ADD COLUMN "presentation" "enum_pages_blocks_form_block_presentation" DEFAULT 'split-contact';
  ALTER TABLE "pages" ADD COLUMN "layout_preset_key" varchar;
  ALTER TABLE "pages_rels" ADD COLUMN "media_id" integer;
  ALTER TABLE "_pages_v_blocks_cta" ADD COLUMN "presentation" "enum__pages_v_blocks_cta_presentation" DEFAULT 'card';
  ALTER TABLE "_pages_v_blocks_cta" ADD COLUMN "eyebrow" varchar;
  ALTER TABLE "_pages_v_blocks_cta" ADD COLUMN "supporting_quote" varchar;
  ALTER TABLE "_pages_v_blocks_content" ADD COLUMN "presentation" "enum__pages_v_blocks_content_presentation" DEFAULT 'columns';
  ALTER TABLE "_pages_v_blocks_feature_grid" ADD COLUMN "presentation" "enum__pages_v_blocks_feature_grid_presentation" DEFAULT 'icon-grid';
  ALTER TABLE "_pages_v_blocks_pricing_table_items" ADD COLUMN "featured" boolean;
  ALTER TABLE "_pages_v_blocks_pricing_table" ADD COLUMN "presentation" "enum__pages_v_blocks_pricing_table_presentation" DEFAULT 'departure-table';
  ALTER TABLE "_pages_v_blocks_faq_items" ADD COLUMN "category" varchar;
  ALTER TABLE "_pages_v_blocks_faq" ADD COLUMN "presentation" "enum__pages_v_blocks_faq_presentation" DEFAULT 'single-column';
  ALTER TABLE "_pages_v_blocks_media_block" ADD COLUMN "presentation" "enum__pages_v_blocks_media_block_presentation" DEFAULT 'contained';
  ALTER TABLE "_pages_v_blocks_archive" ADD COLUMN "presentation" "enum__pages_v_blocks_archive_presentation" DEFAULT 'card-grid';
  ALTER TABLE "_pages_v_blocks_form_block" ADD COLUMN "presentation" "enum__pages_v_blocks_form_block_presentation" DEFAULT 'split-contact';
  ALTER TABLE "_pages_v" ADD COLUMN "version_layout_preset_key" varchar;
  ALTER TABLE "_pages_v_rels" ADD COLUMN "media_id" integer;
  ALTER TABLE "pages_blocks_pricing_table_items_features" ADD CONSTRAINT "pages_blocks_pricing_table_items_features_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_pricing_table_items"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_stats_items" ADD CONSTRAINT "pages_blocks_stats_items_logo_id_media_id_fk" FOREIGN KEY ("logo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "pages_blocks_stats_items" ADD CONSTRAINT "pages_blocks_stats_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_stats"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_stats" ADD CONSTRAINT "pages_blocks_stats_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_testimonial_items" ADD CONSTRAINT "pages_blocks_testimonial_items_avatar_id_media_id_fk" FOREIGN KEY ("avatar_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "pages_blocks_testimonial_items" ADD CONSTRAINT "pages_blocks_testimonial_items_logo_id_media_id_fk" FOREIGN KEY ("logo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "pages_blocks_testimonial_items" ADD CONSTRAINT "pages_blocks_testimonial_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_testimonial"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_testimonial" ADD CONSTRAINT "pages_blocks_testimonial_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_comparison_options_features" ADD CONSTRAINT "pages_blocks_comparison_options_features_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_comparison_options"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_comparison_options" ADD CONSTRAINT "pages_blocks_comparison_options_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_comparison"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_comparison" ADD CONSTRAINT "pages_blocks_comparison_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_pricing_table_items_features" ADD CONSTRAINT "_pages_v_blocks_pricing_table_items_features_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_blocks_pricing_table_items"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_stats_items" ADD CONSTRAINT "_pages_v_blocks_stats_items_logo_id_media_id_fk" FOREIGN KEY ("logo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_stats_items" ADD CONSTRAINT "_pages_v_blocks_stats_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_blocks_stats"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_stats" ADD CONSTRAINT "_pages_v_blocks_stats_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_testimonial_items" ADD CONSTRAINT "_pages_v_blocks_testimonial_items_avatar_id_media_id_fk" FOREIGN KEY ("avatar_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_testimonial_items" ADD CONSTRAINT "_pages_v_blocks_testimonial_items_logo_id_media_id_fk" FOREIGN KEY ("logo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_testimonial_items" ADD CONSTRAINT "_pages_v_blocks_testimonial_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_blocks_testimonial"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_testimonial" ADD CONSTRAINT "_pages_v_blocks_testimonial_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_comparison_options_features" ADD CONSTRAINT "_pages_v_blocks_comparison_options_features_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_blocks_comparison_options"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_comparison_options" ADD CONSTRAINT "_pages_v_blocks_comparison_options_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_blocks_comparison"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_comparison" ADD CONSTRAINT "_pages_v_blocks_comparison_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "pages_blocks_pricing_table_items_features_order_idx" ON "pages_blocks_pricing_table_items_features" USING btree ("_order");
  CREATE INDEX "pages_blocks_pricing_table_items_features_parent_id_idx" ON "pages_blocks_pricing_table_items_features" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_pricing_table_items_features_locale_idx" ON "pages_blocks_pricing_table_items_features" USING btree ("_locale");
  CREATE INDEX "pages_blocks_stats_items_order_idx" ON "pages_blocks_stats_items" USING btree ("_order");
  CREATE INDEX "pages_blocks_stats_items_parent_id_idx" ON "pages_blocks_stats_items" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_stats_items_locale_idx" ON "pages_blocks_stats_items" USING btree ("_locale");
  CREATE INDEX "pages_blocks_stats_items_logo_idx" ON "pages_blocks_stats_items" USING btree ("logo_id");
  CREATE INDEX "pages_blocks_stats_order_idx" ON "pages_blocks_stats" USING btree ("_order");
  CREATE INDEX "pages_blocks_stats_parent_id_idx" ON "pages_blocks_stats" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_stats_path_idx" ON "pages_blocks_stats" USING btree ("_path");
  CREATE INDEX "pages_blocks_stats_locale_idx" ON "pages_blocks_stats" USING btree ("_locale");
  CREATE INDEX "pages_blocks_testimonial_items_order_idx" ON "pages_blocks_testimonial_items" USING btree ("_order");
  CREATE INDEX "pages_blocks_testimonial_items_parent_id_idx" ON "pages_blocks_testimonial_items" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_testimonial_items_locale_idx" ON "pages_blocks_testimonial_items" USING btree ("_locale");
  CREATE INDEX "pages_blocks_testimonial_items_avatar_idx" ON "pages_blocks_testimonial_items" USING btree ("avatar_id");
  CREATE INDEX "pages_blocks_testimonial_items_logo_idx" ON "pages_blocks_testimonial_items" USING btree ("logo_id");
  CREATE INDEX "pages_blocks_testimonial_order_idx" ON "pages_blocks_testimonial" USING btree ("_order");
  CREATE INDEX "pages_blocks_testimonial_parent_id_idx" ON "pages_blocks_testimonial" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_testimonial_path_idx" ON "pages_blocks_testimonial" USING btree ("_path");
  CREATE INDEX "pages_blocks_testimonial_locale_idx" ON "pages_blocks_testimonial" USING btree ("_locale");
  CREATE INDEX "pages_blocks_comparison_options_features_order_idx" ON "pages_blocks_comparison_options_features" USING btree ("_order");
  CREATE INDEX "pages_blocks_comparison_options_features_parent_id_idx" ON "pages_blocks_comparison_options_features" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_comparison_options_features_locale_idx" ON "pages_blocks_comparison_options_features" USING btree ("_locale");
  CREATE INDEX "pages_blocks_comparison_options_order_idx" ON "pages_blocks_comparison_options" USING btree ("_order");
  CREATE INDEX "pages_blocks_comparison_options_parent_id_idx" ON "pages_blocks_comparison_options" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_comparison_options_locale_idx" ON "pages_blocks_comparison_options" USING btree ("_locale");
  CREATE INDEX "pages_blocks_comparison_order_idx" ON "pages_blocks_comparison" USING btree ("_order");
  CREATE INDEX "pages_blocks_comparison_parent_id_idx" ON "pages_blocks_comparison" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_comparison_path_idx" ON "pages_blocks_comparison" USING btree ("_path");
  CREATE INDEX "pages_blocks_comparison_locale_idx" ON "pages_blocks_comparison" USING btree ("_locale");
  CREATE INDEX "_pages_v_blocks_pricing_table_items_features_order_idx" ON "_pages_v_blocks_pricing_table_items_features" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_pricing_table_items_features_parent_id_idx" ON "_pages_v_blocks_pricing_table_items_features" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_pricing_table_items_features_locale_idx" ON "_pages_v_blocks_pricing_table_items_features" USING btree ("_locale");
  CREATE INDEX "_pages_v_blocks_stats_items_order_idx" ON "_pages_v_blocks_stats_items" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_stats_items_parent_id_idx" ON "_pages_v_blocks_stats_items" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_stats_items_locale_idx" ON "_pages_v_blocks_stats_items" USING btree ("_locale");
  CREATE INDEX "_pages_v_blocks_stats_items_logo_idx" ON "_pages_v_blocks_stats_items" USING btree ("logo_id");
  CREATE INDEX "_pages_v_blocks_stats_order_idx" ON "_pages_v_blocks_stats" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_stats_parent_id_idx" ON "_pages_v_blocks_stats" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_stats_path_idx" ON "_pages_v_blocks_stats" USING btree ("_path");
  CREATE INDEX "_pages_v_blocks_stats_locale_idx" ON "_pages_v_blocks_stats" USING btree ("_locale");
  CREATE INDEX "_pages_v_blocks_testimonial_items_order_idx" ON "_pages_v_blocks_testimonial_items" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_testimonial_items_parent_id_idx" ON "_pages_v_blocks_testimonial_items" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_testimonial_items_locale_idx" ON "_pages_v_blocks_testimonial_items" USING btree ("_locale");
  CREATE INDEX "_pages_v_blocks_testimonial_items_avatar_idx" ON "_pages_v_blocks_testimonial_items" USING btree ("avatar_id");
  CREATE INDEX "_pages_v_blocks_testimonial_items_logo_idx" ON "_pages_v_blocks_testimonial_items" USING btree ("logo_id");
  CREATE INDEX "_pages_v_blocks_testimonial_order_idx" ON "_pages_v_blocks_testimonial" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_testimonial_parent_id_idx" ON "_pages_v_blocks_testimonial" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_testimonial_path_idx" ON "_pages_v_blocks_testimonial" USING btree ("_path");
  CREATE INDEX "_pages_v_blocks_testimonial_locale_idx" ON "_pages_v_blocks_testimonial" USING btree ("_locale");
  CREATE INDEX "_pages_v_blocks_comparison_options_features_order_idx" ON "_pages_v_blocks_comparison_options_features" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_comparison_options_features_parent_id_idx" ON "_pages_v_blocks_comparison_options_features" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_comparison_options_features_locale_idx" ON "_pages_v_blocks_comparison_options_features" USING btree ("_locale");
  CREATE INDEX "_pages_v_blocks_comparison_options_order_idx" ON "_pages_v_blocks_comparison_options" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_comparison_options_parent_id_idx" ON "_pages_v_blocks_comparison_options" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_comparison_options_locale_idx" ON "_pages_v_blocks_comparison_options" USING btree ("_locale");
  CREATE INDEX "_pages_v_blocks_comparison_order_idx" ON "_pages_v_blocks_comparison" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_comparison_parent_id_idx" ON "_pages_v_blocks_comparison" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_comparison_path_idx" ON "_pages_v_blocks_comparison" USING btree ("_path");
  CREATE INDEX "_pages_v_blocks_comparison_locale_idx" ON "_pages_v_blocks_comparison" USING btree ("_locale");
  ALTER TABLE "pages_rels" ADD CONSTRAINT "pages_rels_media_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_rels" ADD CONSTRAINT "_pages_v_rels_media_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "pages_layout_preset_key_idx" ON "pages" USING btree ("layout_preset_key");
  CREATE INDEX "pages_rels_media_id_idx" ON "pages_rels" USING btree ("media_id","locale");
  CREATE INDEX "_pages_v_version_version_layout_preset_key_idx" ON "_pages_v" USING btree ("version_layout_preset_key");
  CREATE INDEX "_pages_v_rels_media_id_idx" ON "_pages_v_rels" USING btree ("media_id","locale");`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "pages_blocks_pricing_table_items_features" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages_blocks_stats_items" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages_blocks_stats" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages_blocks_testimonial_items" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages_blocks_testimonial" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages_blocks_comparison_options_features" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages_blocks_comparison_options" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages_blocks_comparison" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_v_blocks_pricing_table_items_features" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_v_blocks_stats_items" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_v_blocks_stats" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_v_blocks_testimonial_items" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_v_blocks_testimonial" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_v_blocks_comparison_options_features" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_v_blocks_comparison_options" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_v_blocks_comparison" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "pages_blocks_pricing_table_items_features" CASCADE;
  DROP TABLE "pages_blocks_stats_items" CASCADE;
  DROP TABLE "pages_blocks_stats" CASCADE;
  DROP TABLE "pages_blocks_testimonial_items" CASCADE;
  DROP TABLE "pages_blocks_testimonial" CASCADE;
  DROP TABLE "pages_blocks_comparison_options_features" CASCADE;
  DROP TABLE "pages_blocks_comparison_options" CASCADE;
  DROP TABLE "pages_blocks_comparison" CASCADE;
  DROP TABLE "_pages_v_blocks_pricing_table_items_features" CASCADE;
  DROP TABLE "_pages_v_blocks_stats_items" CASCADE;
  DROP TABLE "_pages_v_blocks_stats" CASCADE;
  DROP TABLE "_pages_v_blocks_testimonial_items" CASCADE;
  DROP TABLE "_pages_v_blocks_testimonial" CASCADE;
  DROP TABLE "_pages_v_blocks_comparison_options_features" CASCADE;
  DROP TABLE "_pages_v_blocks_comparison_options" CASCADE;
  DROP TABLE "_pages_v_blocks_comparison" CASCADE;
  ALTER TABLE "pages_rels" DROP CONSTRAINT "pages_rels_media_fk";
  
  ALTER TABLE "_pages_v_rels" DROP CONSTRAINT "_pages_v_rels_media_fk";
  
  DROP INDEX "pages_layout_preset_key_idx";
  DROP INDEX "pages_rels_media_id_idx";
  DROP INDEX "_pages_v_version_version_layout_preset_key_idx";
  DROP INDEX "_pages_v_rels_media_id_idx";
  ALTER TABLE "pages_blocks_cta" DROP COLUMN "presentation";
  ALTER TABLE "pages_blocks_cta" DROP COLUMN "eyebrow";
  ALTER TABLE "pages_blocks_cta" DROP COLUMN "supporting_quote";
  ALTER TABLE "pages_blocks_content" DROP COLUMN "presentation";
  ALTER TABLE "pages_blocks_feature_grid" DROP COLUMN "presentation";
  ALTER TABLE "pages_blocks_pricing_table_items" DROP COLUMN "featured";
  ALTER TABLE "pages_blocks_pricing_table" DROP COLUMN "presentation";
  ALTER TABLE "pages_blocks_faq_items" DROP COLUMN "category";
  ALTER TABLE "pages_blocks_faq" DROP COLUMN "presentation";
  ALTER TABLE "pages_blocks_media_block" DROP COLUMN "presentation";
  ALTER TABLE "pages_blocks_archive" DROP COLUMN "presentation";
  ALTER TABLE "pages_blocks_form_block" DROP COLUMN "presentation";
  ALTER TABLE "pages" DROP COLUMN "layout_preset_key";
  ALTER TABLE "pages_rels" DROP COLUMN "media_id";
  ALTER TABLE "_pages_v_blocks_cta" DROP COLUMN "presentation";
  ALTER TABLE "_pages_v_blocks_cta" DROP COLUMN "eyebrow";
  ALTER TABLE "_pages_v_blocks_cta" DROP COLUMN "supporting_quote";
  ALTER TABLE "_pages_v_blocks_content" DROP COLUMN "presentation";
  ALTER TABLE "_pages_v_blocks_feature_grid" DROP COLUMN "presentation";
  ALTER TABLE "_pages_v_blocks_pricing_table_items" DROP COLUMN "featured";
  ALTER TABLE "_pages_v_blocks_pricing_table" DROP COLUMN "presentation";
  ALTER TABLE "_pages_v_blocks_faq_items" DROP COLUMN "category";
  ALTER TABLE "_pages_v_blocks_faq" DROP COLUMN "presentation";
  ALTER TABLE "_pages_v_blocks_media_block" DROP COLUMN "presentation";
  ALTER TABLE "_pages_v_blocks_archive" DROP COLUMN "presentation";
  ALTER TABLE "_pages_v_blocks_form_block" DROP COLUMN "presentation";
  ALTER TABLE "_pages_v" DROP COLUMN "version_layout_preset_key";
  ALTER TABLE "_pages_v_rels" DROP COLUMN "media_id";
  DROP TYPE "public"."enum_pages_blocks_cta_presentation";
  DROP TYPE "public"."enum_pages_blocks_content_presentation";
  DROP TYPE "public"."enum_pages_blocks_feature_grid_presentation";
  DROP TYPE "public"."enum_pages_blocks_pricing_table_presentation";
  DROP TYPE "public"."enum_pages_blocks_stats_presentation";
  DROP TYPE "public"."enum_pages_blocks_testimonial_presentation";
  DROP TYPE "public"."enum_pages_blocks_comparison_options_link_type";
  DROP TYPE "public"."enum_pages_blocks_comparison_presentation";
  DROP TYPE "public"."enum_pages_blocks_faq_presentation";
  DROP TYPE "public"."enum_pages_blocks_media_block_presentation";
  DROP TYPE "public"."enum_pages_blocks_archive_presentation";
  DROP TYPE "public"."enum_pages_blocks_form_block_presentation";
  DROP TYPE "public"."enum__pages_v_blocks_cta_presentation";
  DROP TYPE "public"."enum__pages_v_blocks_content_presentation";
  DROP TYPE "public"."enum__pages_v_blocks_feature_grid_presentation";
  DROP TYPE "public"."enum__pages_v_blocks_pricing_table_presentation";
  DROP TYPE "public"."enum__pages_v_blocks_stats_presentation";
  DROP TYPE "public"."enum__pages_v_blocks_testimonial_presentation";
  DROP TYPE "public"."enum__pages_v_blocks_comparison_options_link_type";
  DROP TYPE "public"."enum__pages_v_blocks_comparison_presentation";
  DROP TYPE "public"."enum__pages_v_blocks_faq_presentation";
  DROP TYPE "public"."enum__pages_v_blocks_media_block_presentation";
  DROP TYPE "public"."enum__pages_v_blocks_archive_presentation";
  DROP TYPE "public"."enum__pages_v_blocks_form_block_presentation";`)
}
