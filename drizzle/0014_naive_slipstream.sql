CREATE TABLE "user_status_audit" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"changed_by" uuid NOT NULL,
	"old_status" "user_status" NOT NULL,
	"new_status" "user_status" NOT NULL,
	"reason" text,
	"ip_address" text,
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "user_status_audit" ADD CONSTRAINT "user_status_audit_user_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_status_audit" ADD CONSTRAINT "user_status_audit_changed_by_fk" FOREIGN KEY ("changed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;