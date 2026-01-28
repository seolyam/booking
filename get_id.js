async function main() {
  const { default: dotenv } = await import("dotenv");
  dotenv.config({ path: ".env.local" });

  const { default: postgres } = await import("postgres");
  const sql = postgres(process.env.DATABASE_URL, { ssl: "require" });

  try {
    const budgets = await sql`SELECT id FROM budgets LIMIT 1`;
    console.log("BUDGET_ID:", budgets[0]?.id);
  } finally {
    await sql.end();
  }
}

main().catch((error) => {
  console.error("✗ Error:", error?.message ?? error);
  process.exit(1);
});
