
import { config } from "dotenv";
config({ path: ".env.local" });
// db import moved to main()

import { sql } from "drizzle-orm";
import fs from "fs";
import path from "path";

async function main() {
    console.log("Running migration manually...");
    
    // Dynamic import to ensure env vars are loaded first
    const { db } = await import("@/db");

    // Find the migration file
    const migrationDir = path.join(process.cwd(), "drizzle");
    const files = fs.readdirSync(migrationDir).filter(f => f.endsWith(".sql"));
    const latestMigration = files.sort().pop();

    if (!latestMigration) {
        console.log("No migration files found.");
        return;
    }

    console.log(`Applying: ${latestMigration}`);
    const sqlContent = fs.readFileSync(path.join(migrationDir, latestMigration), "utf-8");

    // Split statements
    const statements = sqlContent.split("--> statement-breakpoint");

    for (const statement of statements) {
        const trimmed = statement.trim();
        if (trimmed) {
            try {
                await db.execute(sql.raw(trimmed));
                console.log("Executed statement.");
            } catch (e: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
                console.error("Error executing statement:", e);
                if (e.cause) console.error("Cause:", e.cause);
                // Ignore "already exists" errors if we are re-running or if partial state exists
                if (e.code === "42710" || e.code === "42P07") { // duplicate_object or duplicate_table
                    console.log("Skipping duplicate object/table");
                } else {
                    console.error("Error executing statement:", e.message);
                }
            }
        }
    }

    console.log("Migration completed.");
    process.exit(0);
}

main();
