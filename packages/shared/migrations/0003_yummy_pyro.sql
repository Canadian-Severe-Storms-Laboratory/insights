CREATE TYPE "public"."service_status" AS ENUM('pending', 'uploading', 'processing', 'complete', 'failed');--> statement-breakpoint
CREATE TYPE "public"."status_enum" AS ENUM('pending', 'in_progress', 'complete', 'failed');--> statement-breakpoint
ALTER TABLE "captures" ALTER COLUMN "status" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "captures" ALTER COLUMN "status" SET DATA TYPE "public"."service_status" USING "status"::text::"public"."service_status";--> statement-breakpoint
ALTER TABLE "captures" ALTER COLUMN "status" SET DEFAULT 'pending';--> statement-breakpoint
ALTER TABLE "hailpad" ALTER COLUMN "status" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "hailpad" ALTER COLUMN "status" SET DATA TYPE "public"."status_enum" USING "status"::text::"public"."status_enum";--> statement-breakpoint
ALTER TABLE "hailpad" ALTER COLUMN "status" SET DEFAULT 'pending';--> statement-breakpoint
ALTER TABLE "path_segments" ALTER COLUMN "panorama_status" SET DEFAULT 'pending'::"public"."status_enum";--> statement-breakpoint
ALTER TABLE "path_segments" ALTER COLUMN "panorama_status" SET DATA TYPE "public"."status_enum" USING "panorama_status"::"public"."status_enum";--> statement-breakpoint
ALTER TABLE "paths" ALTER COLUMN "status" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "paths" ALTER COLUMN "status" SET DATA TYPE "public"."status_enum" USING "status"::text::"public"."status_enum";--> statement-breakpoint
ALTER TABLE "paths" ALTER COLUMN "status" SET DEFAULT 'pending';--> statement-breakpoint
ALTER TABLE "scans" ALTER COLUMN "status" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "scans" ALTER COLUMN "status" SET DATA TYPE "public"."status_enum" USING "status"::text::"public"."status_enum";--> statement-breakpoint
ALTER TABLE "scans" ALTER COLUMN "status" SET DEFAULT 'pending';--> statement-breakpoint
DROP TYPE "public"."upload_status";