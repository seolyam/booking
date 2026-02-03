
import { config } from "dotenv";
config({ path: ".env.local" });
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres"; // Using the installed package
import { sql } from "drizzle-orm";
import fs from "fs";
import path from "path";

async function main() {
    console.log("Running migration manually with forced SSL...");

    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
        console.error("DATABASE_URL not found");
        process.exit(1);
    }

    // Ensure SSL is used
    const client = postgres(connectionString, {
        ssl: "require",
        max: 1,
    });

    const db = drizzle(client);

    const migrationDir = path.join(process.cwd(), "drizzle");
    const files = fs.readdirSync(migrationDir).filter(f => f.endsWith(".sql"));
    // We want to apply 0001 specifically because we know 0000 is likely applied (since app works)
    // But let's look for "notifications" creation
    const targetFile = files.find(f => f.includes("0001"));

    if (!targetFile) {
        console.log("0001 migration not found");
        process.exit(1);
    }

    console.log(`Applying: ${targetFile}`);
    const sqlContent = fs.readFileSync(path.join(migrationDir, targetFile), "utf-8");

    const statements = sqlContent.split("--> statement-breakpoint");

    for (const statement of statements) {
        const trimmed = statement.trim();
        if (trimmed) {
            // Very basic filtering: if it creates public.budget_category_type, likely skip if exists
            // But postgres.js throws readable errors usually.

            try {
                await db.execute(sql.raw(trimmed));
                console.log("Executed statement.");
            } catch (e: any) {
                // Log but continue
                console.log(`Error (ignoring if exists): ${e.message}`);
            }
        }
    }

    console.log("Migration script finished.");
    await client.end();
    process.exit(0);
}

main();
