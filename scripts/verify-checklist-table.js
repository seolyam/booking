/**
 * Script to verify and create the review_checklists table if it doesn't exist
 */

import postgres from "postgres";
import * as dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env.local
dotenv.config({ path: join(__dirname, "..", ".env.local") });

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error("DATABASE_URL not found in environment variables");
  process.exit(1);
}

const sql = postgres(DATABASE_URL);

async function verifyAndCreateTable() {
  try {
    console.log("Checking if review_checklists table exists...");

    const tableExists = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'review_checklists'
      );
    `;

    if (tableExists[0].exists) {
      console.log("✅ review_checklists table already exists");
    } else {
      console.log("❌ review_checklists table does not exist");
      console.log("Creating review_checklists table...");

      await sql`
        CREATE TABLE review_checklists (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          budget_id uuid NOT NULL REFERENCES budgets(id) ON DELETE CASCADE,
          reviewer_id uuid NOT NULL REFERENCES users(id),
          item_key text NOT NULL,
          item_label text NOT NULL,
          is_checked boolean NOT NULL DEFAULT false,
          created_at timestamp with time zone DEFAULT now() NOT NULL,
          updated_at timestamp with time zone DEFAULT now() NOT NULL
        );
      `;

      console.log("Creating indexes...");

      await sql`
        CREATE INDEX idx_review_checklists_budget_reviewer 
        ON review_checklists(budget_id, reviewer_id);
      `;

      await sql`
        CREATE INDEX idx_review_checklists_budget_id 
        ON review_checklists(budget_id);
      `;

      console.log("✅ review_checklists table created successfully");
    }

    // Verify the table structure
    const columns = await sql`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_schema = 'public' 
      AND table_name = 'review_checklists'
      ORDER BY ordinal_position;
    `;

    console.log("\nTable structure:");
    console.table(columns);
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

verifyAndCreateTable();
