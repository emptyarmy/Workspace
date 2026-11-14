CREATE TYPE "public"."answer_value" AS ENUM('yes', 'partial', 'no', 'na');--> statement-breakpoint
CREATE TYPE "public"."assessment_status" AS ENUM('collecting', 'consolidating', 'released');--> statement-breakpoint
CREATE TYPE "public"."method_model" AS ENUM('classic', 'agile');--> statement-breakpoint
CREATE TABLE "assessment_member" (
	"assessment_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	CONSTRAINT "assessment_member_assessment_id_user_id_pk" PRIMARY KEY("assessment_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "assessment" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"project" text NOT NULL,
	"assessor_name" text NOT NULL,
	"domain" text DEFAULT '' NOT NULL,
	"organization_unit" text DEFAULT '' NOT NULL,
	"main_stakeholder" text DEFAULT '' NOT NULL,
	"contact" text DEFAULT '' NOT NULL,
	"assessment_type" text DEFAULT '' NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date,
	"interview_count" integer,
	"scope" text DEFAULT '' NOT NULL,
	"method_model" "method_model" DEFAULT 'agile' NOT NULL,
	"include_ai" boolean DEFAULT true NOT NULL,
	"catalog_version" text NOT NULL,
	"status" "assessment_status" DEFAULT 'collecting' NOT NULL,
	"released_at" timestamp with time zone,
	"created_by_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "change_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"assessment_id" uuid,
	"assessment_name" text,
	"entity_type" text NOT NULL,
	"entity_id" text,
	"key_area_id" text,
	"checkpoint_id" text,
	"action" text NOT NULL,
	"old_value" text,
	"new_value" text,
	"rationale" text,
	"user_id" uuid,
	"user_name_snapshot" text NOT NULL,
	"user_role_snapshot" text NOT NULL,
	"department_id" uuid,
	"department_snapshot" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "comment" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"assessment_id" uuid NOT NULL,
	"checkpoint_id" text NOT NULL,
	"department_id" uuid,
	"author_user_id" uuid NOT NULL,
	"source_id" uuid,
	"text" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "consolidated_answer" (
	"assessment_id" uuid NOT NULL,
	"checkpoint_id" text NOT NULL,
	"value" "answer_value" NOT NULL,
	"suggested_value" text NOT NULL,
	"rationale" text,
	"version" integer DEFAULT 1 NOT NULL,
	"consolidated_by_user_id" uuid,
	"consolidated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "consolidated_answer_assessment_id_checkpoint_id_pk" PRIMARY KEY("assessment_id","checkpoint_id")
);
--> statement-breakpoint
CREATE TABLE "department_answer" (
	"assessment_id" uuid NOT NULL,
	"department_id" uuid NOT NULL,
	"checkpoint_id" text NOT NULL,
	"value" "answer_value" NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"updated_by_user_id" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "department_answer_assessment_id_department_id_checkpoint_id_pk" PRIMARY KEY("assessment_id","department_id","checkpoint_id")
);
--> statement-breakpoint
CREATE TABLE "department_submission" (
	"assessment_id" uuid NOT NULL,
	"department_id" uuid NOT NULL,
	"submitted_by_user_id" uuid,
	"submitted_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "department_submission_assessment_id_department_id_pk" PRIMARY KEY("assessment_id","department_id")
);
--> statement-breakpoint
CREATE TABLE "key_area_assignment" (
	"assessment_id" uuid NOT NULL,
	"key_area_id" text NOT NULL,
	"department_id" uuid NOT NULL,
	CONSTRAINT "key_area_assignment_assessment_id_key_area_id_department_id_pk" PRIMARY KEY("assessment_id","key_area_id","department_id")
);
--> statement-breakpoint
CREATE TABLE "source" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"assessment_id" uuid NOT NULL,
	"name" text NOT NULL,
	"role" text DEFAULT '' NOT NULL,
	"unit" text DEFAULT '' NOT NULL,
	"type" text DEFAULT 'person' NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "assessment_member" ADD CONSTRAINT "assessment_member_assessment_id_assessment_id_fk" FOREIGN KEY ("assessment_id") REFERENCES "public"."assessment"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assessment_member" ADD CONSTRAINT "assessment_member_user_id_app_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."app_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assessment" ADD CONSTRAINT "assessment_company_id_company_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."company"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assessment" ADD CONSTRAINT "assessment_created_by_user_id_app_user_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."app_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comment" ADD CONSTRAINT "comment_assessment_id_assessment_id_fk" FOREIGN KEY ("assessment_id") REFERENCES "public"."assessment"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comment" ADD CONSTRAINT "comment_department_id_department_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."department"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comment" ADD CONSTRAINT "comment_author_user_id_app_user_id_fk" FOREIGN KEY ("author_user_id") REFERENCES "public"."app_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comment" ADD CONSTRAINT "comment_source_id_source_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."source"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consolidated_answer" ADD CONSTRAINT "consolidated_answer_assessment_id_assessment_id_fk" FOREIGN KEY ("assessment_id") REFERENCES "public"."assessment"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consolidated_answer" ADD CONSTRAINT "consolidated_answer_consolidated_by_user_id_app_user_id_fk" FOREIGN KEY ("consolidated_by_user_id") REFERENCES "public"."app_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "department_answer" ADD CONSTRAINT "department_answer_assessment_id_assessment_id_fk" FOREIGN KEY ("assessment_id") REFERENCES "public"."assessment"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "department_answer" ADD CONSTRAINT "department_answer_department_id_department_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."department"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "department_answer" ADD CONSTRAINT "department_answer_updated_by_user_id_app_user_id_fk" FOREIGN KEY ("updated_by_user_id") REFERENCES "public"."app_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "department_submission" ADD CONSTRAINT "department_submission_assessment_id_assessment_id_fk" FOREIGN KEY ("assessment_id") REFERENCES "public"."assessment"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "department_submission" ADD CONSTRAINT "department_submission_department_id_department_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."department"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "department_submission" ADD CONSTRAINT "department_submission_submitted_by_user_id_app_user_id_fk" FOREIGN KEY ("submitted_by_user_id") REFERENCES "public"."app_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "key_area_assignment" ADD CONSTRAINT "key_area_assignment_assessment_id_assessment_id_fk" FOREIGN KEY ("assessment_id") REFERENCES "public"."assessment"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "key_area_assignment" ADD CONSTRAINT "key_area_assignment_department_id_department_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."department"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "source" ADD CONSTRAINT "source_assessment_id_assessment_id_fk" FOREIGN KEY ("assessment_id") REFERENCES "public"."assessment"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "assessment_company_idx" ON "assessment" USING btree ("company_id","created_at");--> statement-breakpoint
CREATE INDEX "change_history_company_idx" ON "change_history" USING btree ("company_id","created_at");--> statement-breakpoint
CREATE INDEX "change_history_assessment_idx" ON "change_history" USING btree ("assessment_id","checkpoint_id","created_at");--> statement-breakpoint
CREATE INDEX "comment_assessment_cp_idx" ON "comment" USING btree ("assessment_id","checkpoint_id");--> statement-breakpoint
CREATE UNIQUE INDEX "source_assessment_name_role_uq" ON "source" USING btree ("assessment_id",lower("name"),lower("role"));--> statement-breakpoint
-- Änderungshistorie ist append-only (N-03, TC-HIST-004): UPDATE und DELETE werden in der Datenbank abgewiesen.
CREATE FUNCTION "change_history_append_only"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'change_history is append-only' USING ERRCODE = 'P0001';
END;
$$;
--> statement-breakpoint
CREATE TRIGGER "change_history_no_update_delete" BEFORE UPDATE OR DELETE ON "change_history"
  FOR EACH ROW EXECUTE FUNCTION "change_history_append_only"();
