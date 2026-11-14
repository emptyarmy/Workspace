CREATE TABLE "assessment_score" (
	"assessment_id" uuid PRIMARY KEY NOT NULL,
	"company_id" uuid NOT NULL,
	"catalog_version" text NOT NULL,
	"released_at" timestamp with time zone NOT NULL,
	"overall_index" real,
	"ai_index" real,
	"areas" jsonb NOT NULL
);
--> statement-breakpoint
ALTER TABLE "assessment_score" ADD CONSTRAINT "assessment_score_assessment_id_assessment_id_fk" FOREIGN KEY ("assessment_id") REFERENCES "public"."assessment"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assessment_score" ADD CONSTRAINT "assessment_score_company_id_company_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."company"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "assessment_score_company_idx" ON "assessment_score" USING btree ("company_id","released_at");