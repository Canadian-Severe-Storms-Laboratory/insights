CREATE TABLE "dents" (
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
CREATE TABLE "hailpads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"folder_name" text NOT NULL,
	"boxfit" numeric NOT NULL,
	"max_depth" numeric NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"status" "status_enum" DEFAULT 'pending' NOT NULL,
	"depth_map_status" "service_status" DEFAULT 'pending' NOT NULL,
	"analysis_status" "service_status" DEFAULT 'pending' NOT NULL,
	"hidden" boolean DEFAULT false NOT NULL,
	CONSTRAINT "hailpads_name_unique" UNIQUE("name"),
	CONSTRAINT "hailpads_folder_name_unique" UNIQUE("folder_name")
);
--> statement-breakpoint
DROP TABLE "dent" CASCADE;--> statement-breakpoint
DROP TABLE "hailpad" CASCADE;--> statement-breakpoint
ALTER TABLE "dents" ADD CONSTRAINT "dents_hailpad_id_hailpads_id_fk" FOREIGN KEY ("hailpad_id") REFERENCES "public"."hailpads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hailpads" ADD CONSTRAINT "hailpads_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hailpads" ADD CONSTRAINT "hailpads_updated_by_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;