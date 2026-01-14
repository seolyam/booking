require("dotenv").config({ path: ".env.local" });
const postgres = require("postgres");

console.log("db-inspect starting...");
console.log("DATABASE_URL present:", Boolean(process.env.DATABASE_URL));

const sql = postgres(process.env.DATABASE_URL, { prepare: false });

(async () => {
  try {
    const dept = await sql.unsafe(
      "select unnest(enum_range(null::department)) as v"
    );
    const role = await sql.unsafe(
      "select unnest(enum_range(null::user_role)) as v"
    );
    console.log(
      "department enum:",
      dept.map((r) => r.v)
    );
    console.log(
      "user_role enum:",
      role.map((r) => r.v)
    );

    const cols = await sql.unsafe(
      "select column_name, data_type, udt_name from information_schema.columns where table_schema='public' and table_name='users' order by ordinal_position"
    );
    console.log("public.users columns:", cols);

    const users = await sql.unsafe(
      "select id, email, role, department, created_at from public.users order by created_at desc limit 10"
    );
    console.log("public.users sample:", users);
  } finally {
    await sql.end({ timeout: 5 });
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
