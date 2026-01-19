const postgres = require("postgres");

const sql = postgres(process.env.DATABASE_URL, { ssl: "require" });

(async () => {
  try {
    console.log("Creating review_checklists table...");
    
    await sql`CREATE TABLE IF NOT EXISTS review_checklists (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      budget_id uuid NOT NULL REFERENCES budgets(id) ON DELETE CASCADE,
      reviewer_id uuid NOT NULL REFERENCES users(id),
      item_key text NOT NULL,
      item_label text NOT NULL,
      is_checked boolean NOT NULL DEFAULT false,
      created_at timestamp with time zone DEFAULT now() NOT NULL,
      updated_at timestamp with time zone DEFAULT now() NOT NULL
    )`;
    
    console.log("✓ Table created");
    
    console.log("Creating indexes...");
    
    await sql`CREATE INDEX IF NOT EXISTS idx_review_checklists_budget_reviewer 
      ON review_checklists(budget_id, reviewer_id)`;
    
    await sql`CREATE INDEX IF NOT EXISTS idx_review_checklists_budget_id 
      ON review_checklists(budget_id)`;
    
    console.log("✓ Indexes created");
    console.log("✓ Migration completed successfully!");
    
    await sql.end();
  } catch (error) {
    console.error("✗ Error:", error.message);
    process.exit(1);
  }
})();
