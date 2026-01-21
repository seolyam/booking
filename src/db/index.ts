import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL!;

// Singleton pattern: reuse the same client across requests in development
// In production, serverless functions handle their own lifecycle
const globalForDb = globalThis as unknown as {
  pgClient: ReturnType<typeof postgres> | undefined;
};

const client =
  globalForDb.pgClient ??
  postgres(connectionString, {
    prepare: false, // Required for "Transaction" pool mode
    max: 10, // Limit connection pool size
    idle_timeout: 20, // Close idle connections after 20 seconds
    connect_timeout: 10, // Timeout after 10 seconds if can't connect
  });

if (process.env.NODE_ENV !== "production") {
  globalForDb.pgClient = client;
}

export const db = drizzle(client, { schema });
