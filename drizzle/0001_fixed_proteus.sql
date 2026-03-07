CREATE TABLE "user_mfa" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"totp_secret" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_mfa_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "timezone" SET DEFAULT 'America/Edmonton';--> statement-breakpoint
ALTER TABLE "user_mfa" ADD CONSTRAINT "user_mfa_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;