ALTER TABLE "dent" DROP CONSTRAINT "dent_hailpad_id_hailpad_id_fk";
--> statement-breakpoint
ALTER TABLE "path_segments" DROP CONSTRAINT "path_segments_path_id_paths_id_fk";
--> statement-breakpoint
ALTER TABLE "path_segments" DROP CONSTRAINT "path_segments_capture_id_captures_id_fk";
--> statement-breakpoint
ALTER TABLE "path_segments" DROP CONSTRAINT "path_segments_street_view_id_captures_id_fk";
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "dent" ADD CONSTRAINT "dent_hailpad_id_hailpad_id_fk" FOREIGN KEY ("hailpad_id") REFERENCES "public"."hailpad"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "path_segments" ADD CONSTRAINT "path_segments_path_id_paths_id_fk" FOREIGN KEY ("path_id") REFERENCES "public"."paths"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "path_segments" ADD CONSTRAINT "path_segments_capture_id_captures_id_fk" FOREIGN KEY ("capture_id") REFERENCES "public"."captures"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "path_segments" ADD CONSTRAINT "path_segments_street_view_id_captures_id_fk" FOREIGN KEY ("street_view_id") REFERENCES "public"."captures"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
