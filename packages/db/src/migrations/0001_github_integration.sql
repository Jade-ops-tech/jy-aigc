CREATE TABLE "github_integration" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"label" text,
	"token_encrypted" text NOT NULL,
	"token_iv" text NOT NULL,
	"token_auth_tag" text NOT NULL,
	"token_key_version" text NOT NULL,
	"github_user_id" text,
	"login" text,
	"name" text,
	"avatar_url" text,
	"profile_url" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "github_integration" ADD CONSTRAINT "github_integration_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "github_integration_userId_idx" ON "github_integration" USING btree ("user_id");
