require("dotenv").config({ path: ".env.local" });
const postgres = require("postgres");
const crypto = require("crypto");

const sql = postgres(process.env.DATABASE_URL, { prepare: false });

(async () => {
  const id = crypto.randomUUID();
  try {
    await sql.unsafe(
      "insert into public.users (id,email,role,department) values ($1,$2,$3,$4)",
      [id, `tmp_${id}@example.com`, "requester", "Finance"]
    );
    console.log("insert ok", id);
  } catch (e) {
    console.error("insert failed", e);
  } finally {
    await sql.end({ timeout: 5 });
  }
})();
