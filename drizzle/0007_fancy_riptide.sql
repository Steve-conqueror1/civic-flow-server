ALTER TABLE "departments" ADD COLUMN "slug" varchar(255) NOT NULL;--> statement-breakpoint
ALTER TABLE "departments" ADD CONSTRAINT "departments_slug_unique" UNIQUE("slug");