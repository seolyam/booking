import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { sql } from "drizzle-orm";
import dotenv from "dotenv";

// Load env vars
dotenv.config({ path: ".env.local" });

async function main() {
  const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("No database connection string found (DIRECT_URL or DATABASE_URL)");
  }

  console.log("Connecting to database...");
  const client = postgres(connectionString, { prepare: false, ssl: "require" });
  const db = drizzle(client);

  console.log("Dropping all tables in public schema...");

  // Try to set replication role, ignore if fails (pooler might reject it)
  try {
    await db.execute(sql`SET session_replication_role = 'replica';`);
  } catch (e) {
    console.warn("Could not set session_replication_role (ignoring):", e);
  }

  const tables = await db.execute(sql`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE';
  `);

  for (const row of tables) {
    const tableName = row.table_name;
    console.log(`Dropping table: ${tableName}`);
    await db.execute(sql.raw(`DROP TABLE IF EXISTS "public"."${tableName}" CASCADE;`));
  }

  const types = await db.execute(sql`
    SELECT typname
    FROM pg_type
    JOIN pg_namespace ON pg_namespace.oid = pg_type.typnamespace
    WHERE nspname = 'public' AND typtype = 'e';
  `);

  for (const row of types) {
     const typeName = row.typname;
     console.log(`Dropping type: ${typeName}`);
     await db.execute(sql.raw(`DROP TYPE IF EXISTS "public"."${typeName}" CASCADE;`));
  }

  try {
    await db.execute(sql`SET session_replication_role = 'origin';`);
  } catch {}

  console.log("All tables and types dropped.");

  await client.end();
  process.exit(0);
}

main().catch((err) => {
  console.error("Error dropping tables:", err);
  process.exit(1);
});
