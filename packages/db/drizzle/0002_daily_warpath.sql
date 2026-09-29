CREATE TYPE "public"."memory_edge_type" AS ENUM('supersedes', 'refines');--> statement-breakpoint
CREATE TYPE "public"."memory_status" AS ENUM('active', 'superseded', 'quarantined', 'rejected');--> statement-breakpoint
CREATE TABLE "memory_edges" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_id" uuid NOT NULL,
	"target_id" uuid NOT NULL,
	"type" "memory_edge_type" NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "memory_items" ADD COLUMN "status" "memory_status" DEFAULT 'active' NOT NULL;--> statement-breakpoint
ALTER TABLE "memory_items" ADD COLUMN "provenance" text;--> statement-breakpoint
ALTER TABLE "memory_items" ADD COLUMN "confidence" text;--> statement-breakpoint
ALTER TABLE "memory_items" ADD COLUMN "last_seen_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "memory_edges" ADD CONSTRAINT "memory_edges_source_id_memory_items_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."memory_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memory_edges" ADD CONSTRAINT "memory_edges_target_id_memory_items_id_fk" FOREIGN KEY ("target_id") REFERENCES "public"."memory_items"("id") ON DELETE cascade ON UPDATE no action;