CREATE TYPE "public"."ai_mode" AS ENUM('rules', 'local', 'cloud');--> statement-breakpoint
CREATE TYPE "public"."mail_transport" AS ENUM('system', 'smtp');--> statement-breakpoint
CREATE TABLE "ai_module" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"name" text NOT NULL,
	"mode" "ai_mode" NOT NULL,
	"provider" text NOT NULL,
	"base_url" text,
	"model" text,
	"api_key_enc" text,
	"temperature" real DEFAULT 0.2 NOT NULL,
	"max_tokens" integer DEFAULT 2000 NOT NULL,
	"timeout_sec" integer DEFAULT 60 NOT NULL,
	"send_comments" boolean DEFAULT false NOT NULL,
	"pseudonymize" boolean DEFAULT true NOT NULL,
	"prompt_template" text,
	"is_default" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "company_mail_config" (
	"company_id" uuid PRIMARY KEY NOT NULL,
	"transport" "mail_transport" DEFAULT 'system' NOT NULL,
	"host" text,
	"port" integer,
	"secure" boolean DEFAULT false NOT NULL,
	"username" text,
	"password_enc" text,
	"from_address" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ai_module" ADD CONSTRAINT "ai_module_company_id_company_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."company"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_mail_config" ADD CONSTRAINT "company_mail_config_company_id_company_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."company"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "ai_module_company_name_uq" ON "ai_module" USING btree ("company_id",lower("name"));--> statement-breakpoint
CREATE INDEX "audit_log_company_idx" ON "audit_log" USING btree ("company_id","created_at");--> statement-breakpoint
CREATE INDEX "audit_log_target_company_idx" ON "audit_log" USING btree ("target_company_id","created_at");--> statement-breakpoint
CREATE INDEX "audit_log_user_action_idx" ON "audit_log" USING btree ("user_id","action","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "department_company_name_uq" ON "department" USING btree ("company_id",lower("name"));