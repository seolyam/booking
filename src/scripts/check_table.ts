
import { config } from "dotenv";
config({ path: ".env.local" });
import { db } from "@/db";
import { sql } from "drizzle-orm";

const url = process.env.DATABASE_URL;
console.log("Using DATABASE_URL:", url ? url.replace(/:[^:]*@/, ":***@") : "undefined");
async function check() {
    try {
        const result = await db.execute(sql`SELECT count(*) FROM notifications`);
        console.log("Notifications table access successful. Count:", result);
    } catch (e) {
        console.error("Notifications table check failed:", e);
    }
    process.exit(0);
}

check();
