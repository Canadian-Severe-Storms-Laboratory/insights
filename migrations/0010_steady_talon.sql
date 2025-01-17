DO $$ BEGIN
 CREATE TYPE "public"."hailpad_initialization_status" AS ENUM('uploading', 'processing', 'complete', 'failed');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
ALTER TABLE "captures" ALTER COLUMN "size" SET DATA TYPE bigint;--> statement-breakpoint
ALTER TABLE "paths" ALTER COLUMN "size" SET DATA TYPE bigint;--> statement-breakpoint
ALTER TABLE "scans" ALTER COLUMN "size" SET DATA TYPE bigint;--> statement-breakpoint
ALTER TABLE "dent" ADD COLUMN "max_depth" numeric NOT NULL;--> statement-breakpoint
ALTER TABLE "hailpad" ADD COLUMN "status" "hailpad_initialization_status" DEFAULT 'uploading' NOT NULL;