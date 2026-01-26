async function main() {
  const { default: dotenv } = await import("dotenv");
  dotenv.config({ path: ".env.local" });

  const { default: postgres } = await import("postgres");
  const sql = postgres(process.env.DATABASE_URL, { ssl: "require" });

  try {
    console.log("Applying specific schema updates...");

    // 1. Add columns to budgets
    console.log("Adding start_date and end_date to budgets...");
    try {
      await sql`ALTER TABLE budgets ADD COLUMN IF NOT EXISTS start_date timestamp`;
      await sql`ALTER TABLE budgets ADD COLUMN IF NOT EXISTS end_date timestamp`;
    } catch (e) {
      console.log("Columns might already exist or error:", e?.message ?? e);
    }

    // 2. Create budget_milestones table
    console.log("Creating budget_milestones table...");
    await sql`CREATE TABLE IF NOT EXISTS budget_milestones (
            id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
            budget_id uuid NOT NULL REFERENCES budgets(id) ON DELETE CASCADE,
            description text NOT NULL,
            target_quarter text,
            created_at timestamp DEFAULT now() NOT NULL
        )`;

    console.log("✓ Migration updates completed successfully!");
  } finally {
    await sql.end();
  }
}

main().catch((error) => {
  console.error("✗ Error:", error?.message ?? error);
  process.exit(1);
});
