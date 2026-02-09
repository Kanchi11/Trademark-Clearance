CREATE TYPE "public"."risk_level" AS ENUM('low', 'medium', 'high');--> statement-breakpoint
CREATE TYPE "public"."search_status" AS ENUM('pending', 'processing', 'completed', 'failed');--> statement-breakpoint
CREATE TYPE "public"."status" AS ENUM('live', 'dead', 'pending', 'abandoned');--> statement-breakpoint
CREATE TABLE "search_results" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"search_id" uuid NOT NULL,
	"serial_number" text NOT NULL,
	"mark_text" text NOT NULL,
	"owner_name" text,
	"status" "status" NOT NULL,
	"filing_date" date,
	"nice_classes" integer[],
	"similarity_score" integer NOT NULL,
	"risk_level" "risk_level" NOT NULL,
	"uspto_url" text,
	"screenshot_url" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "searches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"mark_text" text NOT NULL,
	"mark_text_normalized" text NOT NULL,
	"logo_url" text,
	"nice_classes" integer[] NOT NULL,
	"goods_services" text,
	"total_results" integer,
	"high_risk_count" integer,
	"medium_risk_count" integer,
	"low_risk_count" integer,
	"overall_risk_score" integer,
	"overall_risk_level" "risk_level",
	"status" "search_status" DEFAULT 'pending' NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"completed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "uspto_trademarks" (
	"id" serial PRIMARY KEY NOT NULL,
	"serial_number" text NOT NULL,
	"mark_text" text NOT NULL,
	"mark_text_normalized" text NOT NULL,
	"mark_soundex" text,
	"status" "status" NOT NULL,
	"filing_date" date,
	"registration_date" date,
	"owner_name" text,
	"nice_classes" integer[] NOT NULL,
	"goods_services" text,
	"uspto_url" text,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "uspto_trademarks_serial_number_unique" UNIQUE("serial_number")
);
