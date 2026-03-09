ALTER TABLE "users" ADD COLUMN "status" "user_status" DEFAULT 'active';--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "is_active";