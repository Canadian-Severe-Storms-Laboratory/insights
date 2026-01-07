ALTER TABLE "captures" ADD COLUMN "status" "upload_status" DEFAULT 'pending' NOT NULL;--> statement-breakpoint
ALTER TABLE "path_segments" ADD COLUMN "panorama_status" boolean DEFAULT false NOT NULL;