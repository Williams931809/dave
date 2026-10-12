CREATE TABLE "admin_account" (
	"id" integer PRIMARY KEY DEFAULT 1,
	"user_id" text NOT NULL,
	"email" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "admin_account_single_row" CHECK ("id" = 1)
);
