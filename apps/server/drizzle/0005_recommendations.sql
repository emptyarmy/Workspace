CREATE TYPE "public"."rec_horizon" AS ENUM('short', 'long');--> statement-breakpoint
CREATE TYPE "public"."rec_origin" AS ENUM('rule', 'ai');--> statement-breakpoint
CREATE TYPE "public"."rec_status" AS ENUM('proposed', 'accepted', 'in_progress', 'done', 'rejected');--> statement-breakpoint
CREATE TABLE "recommendation" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"assessment_id" uuid NOT NULL,
	"key_area_id" text NOT NULL,
	"checkpoint_ids" text[] NOT NULL,
	"horizon" "rec_horizon" NOT NULL,
	"part" text DEFAULT 'whole' NOT NULL,
	"effort" text NOT NULL,
	"priority" integer NOT NULL,
	"title" text NOT NULL,
	"text" text NOT NULL,
	"rule_text" text NOT NULL,
	"next_step" text,
	"benefit" text,
	"metric" text,
	"owner_role" text,
	"origin" "rec_origin" NOT NULL,
	"ai_module_id" uuid,
	"ai_module_name" text,
	"ai_provider" text,
	"ai_model" text,
	"benchmark_gap" real,
	"lang" text NOT NULL,
	"status" "rec_status" DEFAULT 'proposed' NOT NULL,
	"owner_user_id" uuid,
	"due_date" date,
	"edited" boolean DEFAULT false NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_by_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "recommendation" ADD CONSTRAINT "recommendation_assessment_id_assessment_id_fk" FOREIGN KEY ("assessment_id") REFERENCES "public"."assessment"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recommendation" ADD CONSTRAINT "recommendation_ai_module_id_ai_module_id_fk" FOREIGN KEY ("ai_module_id") REFERENCES "public"."ai_module"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recommendation" ADD CONSTRAINT "recommendation_owner_user_id_app_user_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."app_user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recommendation" ADD CONSTRAINT "recommendation_created_by_user_id_app_user_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."app_user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "recommendation_assessment_idx" ON "recommendation" USING btree ("assessment_id","horizon","priority");