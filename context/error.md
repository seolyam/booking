## Error Type

Runtime Error

## Error Message

Failed query: insert into "users" ("id", "email", "role", "department", "created_at") values ($1, $2, $3, $4, default) returning "id", "email", "role", "department", "created_at"
params: a5907823-e0e0-43dd-93f5-e9d5ef428202,lhiamlingco@gmail.com,requester,Finance

    at PostgresJsPreparedQuery.queryWithCache (node_modules\.pnpm\drizzle-orm@0.45.1_postgres@3.4.8\node_modules\src\pg-core\session.ts:73:11)
    at <anonymous> (node_modules\.pnpm\drizzle-orm@0.45.1_postgres@3.4.8\node_modules\src\postgres-js\session.ts:58:17)
    at  getOrCreateAppUserFromAuthUser (src\lib\appUser.ts:73:22)
    at  DashboardPage (src\app\dashboard\page.tsx:37:19)

## Code Frame

71 | return await query();
72 | } catch (e) {

> 73 | throw new DrizzleQueryError(queryString, params, e as Error);

     | 				      ^

74 | }
75 | }
76 |

Next.js version: 16.1.1 (Turbopack)
