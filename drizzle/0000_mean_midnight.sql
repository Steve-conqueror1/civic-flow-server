CREATE TYPE "public"."user_role" AS ENUM('citizen', 'government_employee', 'department_head', 'ministry_official', 'admin');
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(255) NOT NULL,
	"password_hash" text NOT NULL,
	"first_name" varchar(100) NOT NULL,
	"last_name" varchar(100) NOT NULL,
	"phone_number" varchar(20),
	"role" "user_role" DEFAULT 'citizen' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"is_email_verified" boolean DEFAULT false NOT NULL,
	"mfa_enabled" boolean DEFAULT false NOT NULL,
	"department_id" uuid,
	"ministry" varchar(255),
	"job_title" varchar(255),
	"employee_id" varchar(100),
	"preferred_language" varchar(5) DEFAULT 'en' NOT NULL,
	"timezone" varchar(100) DEFAULT 'UTC' NOT NULL,
	"notification_preferences" jsonb DEFAULT '{"email":true,"sms":false,"inApp":true}'::jsonb NOT NULL,
	"failed_login_attempts" integer DEFAULT 0 NOT NULL,
	"last_login_at" timestamp with time zone,
	"last_login_ip" varchar(100),
	"password_changed_at" timestamp with time zone,
	"account_locked_until" timestamp with time zone,
	"ai_usage_stats" jsonb DEFAULT '{"totalRequestsAnalyzed":0}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);

CREATE INDEX "users_email_idx" ON "users" USING btree ("email");
CREATE INDEX "users_role_idx" ON "users" USING btree ("role");
CREATE INDEX "users_department_idx" ON "users" USING btree ("department_id");