
import { config } from "dotenv";
config({ path: ".env.local" });
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres"; // Using the installed package
import { sql } from "drizzle-orm";

async function check() {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
        console.error("DATABASE_URL not found");
        process.exit(1);
    }

    const client = postgres(connectionString, {
        ssl: "require",
    });
    const db = drizzle(client);

    try {
        const result = await db.execute(sql`SELECT count(*) FROM notifications`);
        console.log("Notifications table access successful. Count:", result);
    } catch (e) {
        console.error("Notifications table check failed:", e);
    }

    await client.end();
    process.exit(0);
}

check();
