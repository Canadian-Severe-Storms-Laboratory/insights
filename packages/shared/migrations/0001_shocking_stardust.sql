CREATE TYPE "public"."image_source" AS ENUM('cssl', 'google', 'unknown');--> statement-breakpoint
CREATE TYPE "public"."upload_status" AS ENUM('pending', 'uploading', 'processing', 'complete', 'failed');--> statement-breakpoint
CREATE TABLE "captures" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"file_name" text NOT NULL,
	"source" "image_source" DEFAULT 'unknown' NOT NULL,
	"size" bigint NOT NULL,
	"taken_at" timestamp NOT NULL,
	"uploaded_at" timestamp DEFAULT now() NOT NULL,
	"lng" numeric NOT NULL,
	"lat" numeric NOT NULL,
	"altitude" numeric,
	"heading" numeric,
	"pitch" numeric,
	"roll" numeric
);
--> statement-breakpoint
CREATE TABLE "dent" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"hailpad_id" uuid NOT NULL,
	"angle" numeric,
	"major_axis" numeric NOT NULL,
	"minor_axis" numeric NOT NULL,
	"max_depth" numeric NOT NULL,
	"centroid_x" numeric NOT NULL,
	"centroid_y" numeric NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hailpad" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"folder_name" text NOT NULL,
	"boxfit" numeric NOT NULL,
	"max_depth" numeric NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"status" "upload_status" DEFAULT 'pending' NOT NULL,
	"hidden" boolean DEFAULT false NOT NULL,
	CONSTRAINT "hailpad_name_unique" UNIQUE("name"),
	CONSTRAINT "hailpad_folder_name_unique" UNIQUE("folder_name")
);
--> statement-breakpoint
CREATE TABLE "panoramas" (
	"id" text PRIMARY KEY NOT NULL,
	"lat" numeric NOT NULL,
	"lon" numeric NOT NULL,
	"heading" numeric NOT NULL,
	"pitch" numeric,
	"roll" numeric,
	"date" timestamp NOT NULL,
	"elevation" numeric
);
--> statement-breakpoint
CREATE TABLE "path_segments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"index" integer NOT NULL,
	"path_id" uuid NOT NULL,
	"capture_id" uuid NOT NULL,
	"street_view_capture_id" uuid,
	"panorama_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"hidden" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "paths" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"folder_name" text NOT NULL,
	"event_date" timestamp NOT NULL,
	"capture_date" timestamp NOT NULL,
	"status" "upload_status" DEFAULT 'pending' NOT NULL,
	"size" bigint,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"hidden" boolean DEFAULT false NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	CONSTRAINT "paths_name_unique" UNIQUE("name"),
	CONSTRAINT "paths_folder_name_unique" UNIQUE("folder_name")
);
--> statement-breakpoint
CREATE TABLE "scans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"size" bigint,
	"folder_name" text NOT NULL,
	"event_date" timestamp NOT NULL,
	"capture_date" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"status" "upload_status" DEFAULT 'pending' NOT NULL,
	"hidden" boolean DEFAULT false NOT NULL,
	"viewer_settings" jsonb,
	CONSTRAINT "scans_name_unique" UNIQUE("name"),
	CONSTRAINT "scans_folder_name_unique" UNIQUE("folder_name")
);
--> statement-breakpoint
ALTER TABLE "dent" ADD CONSTRAINT "dent_hailpad_id_hailpad_id_fk" FOREIGN KEY ("hailpad_id") REFERENCES "public"."hailpad"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hailpad" ADD CONSTRAINT "hailpad_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hailpad" ADD CONSTRAINT "hailpad_updated_by_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "path_segments" ADD CONSTRAINT "path_segments_path_id_paths_id_fk" FOREIGN KEY ("path_id") REFERENCES "public"."paths"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "path_segments" ADD CONSTRAINT "path_segments_capture_id_captures_id_fk" FOREIGN KEY ("capture_id") REFERENCES "public"."captures"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "path_segments" ADD CONSTRAINT "path_segments_street_view_capture_id_captures_id_fk" FOREIGN KEY ("street_view_capture_id") REFERENCES "public"."captures"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "path_segments" ADD CONSTRAINT "path_segments_panorama_id_panoramas_id_fk" FOREIGN KEY ("panorama_id") REFERENCES "public"."panoramas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "paths" ADD CONSTRAINT "paths_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "paths" ADD CONSTRAINT "paths_updated_by_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scans" ADD CONSTRAINT "scans_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scans" ADD CONSTRAINT "scans_updated_by_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;