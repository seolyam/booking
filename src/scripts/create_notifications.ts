
import { config } from "dotenv";
config({ path: ".env.local" });
import { db } from "@/db";
import { sql } from "drizzle-orm";

async function main() {
    console.log("Creating notifications table...");
    try {
        await db.execute(sql`
      CREATE TABLE IF NOT EXISTS notifications (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        title text NOT NULL,
        message text NOT NULL,
        type text NOT NULL DEFAULT 'info',
        is_read boolean NOT NULL DEFAULT false,
        link text,
        resource_id uuid,
        resource_type text,
        created_at timestamp DEFAULT now() NOT NULL
      );
    `);
        console.log("Notifications table created successfully.");
    } catch (error) {
        console.error("Error creating table:", error);
    }
    process.exit(0);
}

main();
