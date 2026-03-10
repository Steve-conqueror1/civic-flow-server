CREATE TYPE "public"."contact_message_status" AS ENUM('new', 'read', 'replied', 'archived');--> statement-breakpoint
CREATE TABLE "contact_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"subject" text NOT NULL,
	"message" text NOT NULL,
	"ip_address" text,
	"status" text DEFAULT 'new',
	"created_at" timestamp DEFAULT now() NOT NULL
);
