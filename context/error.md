## Error Type

Console TypeError

## Error Message

cookieStore.getAll is not a function

    at Object.getAll (src\lib\supabase\server.ts:13:28)
    at getAll (node_modules\.pnpm\@supabase+ssr@0.8.0_@supabase+supabase-js@2.90.1\node_modules\@supabase\ssr\src\cookies.ts:115:42)
    at Object.getItem (node_modules\.pnpm\@supabase+ssr@0.8.0_@supabase+supabase-js@2.90.1\node_modules\@supabase\ssr\src\cookies.ts:326:34)
    at getItemAsync (node_modules\.pnpm\@supabase+auth-js@2.90.1\node_modules\@supabase\auth-js\src\lib\helpers.ts:133:31)
    at SupabaseAuthClient._recoverAndRefresh (node_modules\.pnpm\@supabase+auth-js@2.90.1\node_modules\@supabase\auth-js\src\GoTrueClient.ts:2563:49)
    at SupabaseAuthClient._initialize (node_modules\.pnpm\@supabase+auth-js@2.90.1\node_modules\@supabase\auth-js\src\GoTrueClient.ts:532:18)
    at <anonymous> (node_modules\.pnpm\@supabase+auth-js@2.90.1\node_modules\@supabase\auth-js\src\GoTrueClient.ts:454:27)
    at <anonymous> (node_modules\.pnpm\@supabase+auth-js@2.90.1\node_modules\@supabase\auth-js\src\GoTrueClient.ts:1520:26)
    at SupabaseAuthClient.lockNoOp [as lock] (node_modules\.pnpm\@supabase+auth-js@2.90.1\node_modules\@supabase\auth-js\src\GoTrueClient.ts:181:16)
    at SupabaseAuthClient._acquireLock (node_modules\.pnpm\@supabase+auth-js@2.90.1\node_modules\@supabase\auth-js\src\GoTrueClient.ts:1514:25)
    at <anonymous> (node_modules\.pnpm\@supabase+auth-js@2.90.1\node_modules\@supabase\auth-js\src\GoTrueClient.ts:453:25)
    at SupabaseAuthClient.initialize (node_modules\.pnpm\@supabase+auth-js@2.90.1\node_modules\@supabase\auth-js\src\GoTrueClient.ts:456:7)
    at new GoTrueClient (node_modules\.pnpm\@supabase+auth-js@2.90.1\node_modules\@supabase\auth-js\src\GoTrueClient.ts:405:10)
    at new SupabaseAuthClient (node_modules\.pnpm\@supabase+supabase-js@2.90.1\node_modules\@supabase\supabase-js\src\lib\SupabaseAuthClient.ts:6:5)
    at SupabaseClient._initSupabaseAuthClient (node_modules\.pnpm\@supabase+supabase-js@2.90.1\node_modules\@supabase\supabase-js\src\SupabaseClient.ts:366:12)
    at new SupabaseClient (node_modules\.pnpm\@supabase+supabase-js@2.90.1\node_modules\@supabase\supabase-js\src\SupabaseClient.ts:141:24)
    at createClient (node_modules\.pnpm\@supabase+supabase-js@2.90.1\node_modules\@supabase\supabase-js\src\index.ts:60:10)
    at createServerClient (node_modules\.pnpm\@supabase+ssr@0.8.0_@supabase+supabase-js@2.90.1\node_modules\@supabase\ssr\src\createServerClient.ts:154:30)
    at createSupabaseServerClient (src\lib\supabase\server.ts:10:28)
    at RootPage (src\app\page.tsx:6:46)
    at RootPage (<anonymous>:null:null)

## Code Frame

11 | cookies: {
12 | getAll() {

> 13 | return cookieStore.getAll();

     |                            ^

14 | },
15 | setAll(cookiesToSet) {
16 | for (const { name, value, options } of cookiesToSet) {

Next.js version: 16.1.1 (Turbopack)

## Error Type

Console TypeError

## Error Message

cookieStore.getAll is not a function

    at Object.getAll (src\lib\supabase\server.ts:13:28)
    at getAll (node_modules\.pnpm\@supabase+ssr@0.8.0_@supabase+supabase-js@2.90.1\node_modules\@supabase\ssr\src\cookies.ts:115:42)
    at Object.getItem (node_modules\.pnpm\@supabase+ssr@0.8.0_@supabase+supabase-js@2.90.1\node_modules\@supabase\ssr\src\cookies.ts:326:34)
    at getItemAsync (node_modules\.pnpm\@supabase+auth-js@2.90.1\node_modules\@supabase\auth-js\src\lib\helpers.ts:133:31)
    at SupabaseAuthClient.__loadSession (node_modules\.pnpm\@supabase+auth-js@2.90.1\node_modules\@supabase\auth-js\src\GoTrueClient.ts:1630:46)
    at SupabaseAuthClient._useSession (node_modules\.pnpm\@supabase+auth-js@2.90.1\node_modules\@supabase\auth-js\src\GoTrueClient.ts:1588:33)
    at SupabaseAuthClient._emitInitialSession (node_modules\.pnpm\@supabase+auth-js@2.90.1\node_modules\@supabase\auth-js\src\GoTrueClient.ts:2237:23)
    at <anonymous> (node_modules\.pnpm\@supabase+auth-js@2.90.1\node_modules\@supabase\auth-js\src\GoTrueClient.ts:2229:14)
    at <anonymous> (node_modules\.pnpm\@supabase+auth-js@2.90.1\node_modules\@supabase\auth-js\src\GoTrueClient.ts:1520:26)
    at SupabaseAuthClient.lockNoOp [as lock] (node_modules\.pnpm\@supabase+auth-js@2.90.1\node_modules\@supabase\auth-js\src\GoTrueClient.ts:181:16)
    at SupabaseAuthClient._acquireLock (node_modules\.pnpm\@supabase+auth-js@2.90.1\node_modules\@supabase\auth-js\src\GoTrueClient.ts:1514:25)
    at <anonymous> (node_modules\.pnpm\@supabase+auth-js@2.90.1\node_modules\@supabase\auth-js\src\GoTrueClient.ts:2228:18)
    at RootPage (<anonymous>:null:null)

## Code Frame

11 | cookies: {
12 | getAll() {

> 13 | return cookieStore.getAll();

     |                            ^

14 | },
15 | setAll(cookiesToSet) {
16 | for (const { name, value, options } of cookiesToSet) {

Next.js version: 16.1.1 (Turbopack)

## Error Type

Console Error

## Error Message

[31m[1m⨯[22m[39m "unhandledRejection:" TypeError: cookieStore.getAll is not a function

    at RootPage (<anonymous>:null:null)

Next.js version: 16.1.1 (Turbopack)

## Error Type

Console Error

## Error Message

[31m[1m⨯[22m[39m "unhandledRejection: " TypeError: cookieStore.getAll is not a function

    at RootPage (<anonymous>:null:null)

Next.js version: 16.1.1 (Turbopack)

## Error Type

Console TypeError

## Error Message

cookieStore.getAll is not a function

    at Object.getAll (src\lib\supabase\server.ts:13:28)
    at getAll (node_modules\.pnpm\@supabase+ssr@0.8.0_@supabase+supabase-js@2.90.1\node_modules\@supabase\ssr\src\cookies.ts:115:42)
    at Object.getItem (node_modules\.pnpm\@supabase+ssr@0.8.0_@supabase+supabase-js@2.90.1\node_modules\@supabase\ssr\src\cookies.ts:326:34)
    at getItemAsync (node_modules\.pnpm\@supabase+auth-js@2.90.1\node_modules\@supabase\auth-js\src\lib\helpers.ts:133:31)
    at SupabaseAuthClient.__loadSession (node_modules\.pnpm\@supabase+auth-js@2.90.1\node_modules\@supabase\auth-js\src\GoTrueClient.ts:1630:46)
    at SupabaseAuthClient._useSession (node_modules\.pnpm\@supabase+auth-js@2.90.1\node_modules\@supabase\auth-js\src\GoTrueClient.ts:1588:33)
    at SupabaseAuthClient._emitInitialSession (node_modules\.pnpm\@supabase+auth-js@2.90.1\node_modules\@supabase\auth-js\src\GoTrueClient.ts:2237:23)
    at <anonymous> (node_modules\.pnpm\@supabase+auth-js@2.90.1\node_modules\@supabase\auth-js\src\GoTrueClient.ts:2229:14)
    at <anonymous> (node_modules\.pnpm\@supabase+auth-js@2.90.1\node_modules\@supabase\auth-js\src\GoTrueClient.ts:1498:24)
    at RootPage (<anonymous>:null:null)

## Code Frame

11 | cookies: {
12 | getAll() {

> 13 | return cookieStore.getAll();

     |                            ^

14 | },
15 | setAll(cookiesToSet) {
16 | for (const { name, value, options } of cookiesToSet) {

Next.js version: 16.1.1 (Turbopack)

## Error Type

Runtime TypeError

## Error Message

cookieStore.getAll is not a function

    at Object.getAll (src\lib\supabase\server.ts:13:28)
    at getAll (node_modules\.pnpm\@supabase+ssr@0.8.0_@supabase+supabase-js@2.90.1\node_modules\@supabase\ssr\src\cookies.ts:115:42)
    at Object.getItem (node_modules\.pnpm\@supabase+ssr@0.8.0_@supabase+supabase-js@2.90.1\node_modules\@supabase\ssr\src\cookies.ts:326:34)
    at getItemAsync (node_modules\.pnpm\@supabase+auth-js@2.90.1\node_modules\@supabase\auth-js\src\lib\helpers.ts:133:31)
    at SupabaseAuthClient.__loadSession (node_modules\.pnpm\@supabase+auth-js@2.90.1\node_modules\@supabase\auth-js\src\GoTrueClient.ts:1630:46)
    at SupabaseAuthClient._useSession (node_modules\.pnpm\@supabase+auth-js@2.90.1\node_modules\@supabase\auth-js\src\GoTrueClient.ts:1588:33)
    at SupabaseAuthClient._getUser (node_modules\.pnpm\@supabase+auth-js@2.90.1\node_modules\@supabase\auth-js\src\GoTrueClient.ts:1742:25)
    at <anonymous> (node_modules\.pnpm\@supabase+auth-js@2.90.1\node_modules\@supabase\auth-js\src\GoTrueClient.ts:1722:25)
    at <anonymous> (node_modules\.pnpm\@supabase+auth-js@2.90.1\node_modules\@supabase\auth-js\src\GoTrueClient.ts:1498:24)

## Code Frame

11 | cookies: {
12 | getAll() {

> 13 | return cookieStore.getAll();

     |                            ^

14 | },
15 | setAll(cookiesToSet) {
16 | for (const { name, value, options } of cookiesToSet) {

Next.js version: 16.1.1 (Turbopack)
