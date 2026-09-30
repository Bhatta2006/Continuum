CREATE TYPE "public"."task_status" AS ENUM('open', 'paused', 'closed');--> statement-breakpoint
CREATE TABLE "task_capsules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"title" text NOT NULL,
	"state" text NOT NULL,
	"status" "task_status" DEFAULT 'open' NOT NULL,
	"assignee_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "task_capsules" ADD CONSTRAINT "task_capsules_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_capsules" ADD CONSTRAINT "task_capsules_assignee_id_identities_id_fk" FOREIGN KEY ("assignee_id") REFERENCES "public"."identities"("id") ON DELETE no action ON UPDATE no action;