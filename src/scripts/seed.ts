import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import dotenv from "dotenv";
import * as schema from "@/db/schema";

// Load env vars
dotenv.config({ path: ".env.local" });

async function main() {
  const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("No database connection string found");
  }

  console.log("Seeding database...");
  const client = postgres(connectionString, { prepare: false, ssl: "require" });
  const db = drizzle(client, { schema });

  const branchData = [
    { name: "Main Office", code: "MAIN", address: "123 Corporate Blvd" },
    { name: "North Branch", code: "NTH", address: "456 North St" },
    { name: "South Branch", code: "STH", address: "789 South Ave" },
    { name: "East Branch", code: "EST", address: "321 East Rd" },
    { name: "West Branch", code: "WST", address: "654 West Ln" },
  ];

  console.log("Inserting branches...");
  await db.insert(schema.branches).values(branchData).onConflictDoNothing();

  console.log("Seeding complete.");
  await client.end();
  process.exit(0);
}

main().catch((err) => {
  console.error("Error seeding database:", err);
  process.exit(1);
});
