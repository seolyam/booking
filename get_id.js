const postgres = require("postgres");
require("dotenv").config({ path: ".env.local" });

const sql = postgres(process.env.DATABASE_URL, { ssl: "require" });

(async () => {
    try {
        const budgets = await sql`SELECT id FROM budgets LIMIT 1`;
        console.log("BUDGET_ID:", budgets[0]?.id);
        await sql.end();
    } catch (error) {
        console.error("✗ Error:", error.message);
        process.exit(1);
    }
})();
