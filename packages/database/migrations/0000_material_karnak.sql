CREATE TABLE "ai_providers" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"provider_type" varchar(20) NOT NULL,
	"name" varchar(255) NOT NULL,
	"api_base_url" varchar(500) NOT NULL,
	"api_key" varchar(500) NOT NULL,
	"model_id" varchar(255) NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "embeddings" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"reference_id" varchar(255) NOT NULL,
	"collection" varchar(50) NOT NULL,
	"document" text NOT NULL,
	"embedding" jsonb NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "embeddings_reference_id_collection_unique" UNIQUE("reference_id","collection")
);
--> statement-breakpoint
CREATE TABLE "files" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"original_name" varchar(500) NOT NULL,
	"storage_url" varchar(1000) NOT NULL,
	"file_type" varchar(100) NOT NULL,
	"folder" varchar(255),
	"size_bytes" bigint NOT NULL,
	"uploaded_at" timestamp with time zone DEFAULT now() NOT NULL,
	"extracted_text" text
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"platform" varchar(50) NOT NULL,
	"sender_id" varchar(255) NOT NULL,
	"sender_name" varchar(255),
	"content" varchar(10000),
	"message_type" varchar(20) DEFAULT 'text' NOT NULL,
	"file_id" integer,
	"platform_message_id" varchar(255),
	"is_outgoing" boolean DEFAULT false NOT NULL,
	"timestamp" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "platform_connections" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"platform" varchar(50) NOT NULL,
	"credentials_encrypted" text,
	"platform_user_id" varchar(255),
	"is_active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "system_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"key" varchar(255) NOT NULL,
	"value" text,
	"is_active" boolean DEFAULT true NOT NULL,
	CONSTRAINT "system_settings_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" varchar(255) NOT NULL,
	"password_hash" varchar(255) NOT NULL,
	"name" varchar(255) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "ai_providers" ADD CONSTRAINT "ai_providers_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "files" ADD CONSTRAINT "files_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_file_id_files_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."files"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "platform_connections" ADD CONSTRAINT "platform_connections_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;