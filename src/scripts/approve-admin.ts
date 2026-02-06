import { approveUser } from "@/actions/admin";
import "dotenv/config";
import { users, notifications } from "@/db/schema";
import { eq, desc, and, or } from "drizzle-orm";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";

async function main() {
    const targetEmail = "superadmin@gmail.com";

    const connectionString = process.env.DIRECT_URL;
    if (!connectionString) {
        console.error("DIRECT_URL not found in environment variables.");
        process.exit(1);
    }

    console.log("Connecting via DIRECT_URL for administrative task...");
    const client = postgres(connectionString, { prepare: false, ssl: "require" });
    const scriptDb = drizzle(client, { schema: { users, notifications } });

    // 1. Try to find the specific Superadmin account that is pending
    const adminUser = await scriptDb.query.users.findFirst({
        where: and(
            eq(users.email, targetEmail),
            eq(users.approval_status, "pending")
        ),
        orderBy: [desc(users.created_at)],
        columns: { id: true, email: true }
    });

    if (!adminUser) {
        console.log(`No pending user found for ${targetEmail}. Searching for any pending admin role.`);
        // Fallback: find any pending user requested as admin/superadmin
        const fallbackUser = await scriptDb.query.users.findFirst({
            where: and(
                eq(users.approval_status, "pending"),
                or(
                    eq(users.requested_role, "superadmin"),
                    eq(users.requested_role, "admin")
                )
            ),
            orderBy: [desc(users.created_at)],
            columns: { id: true, email: true }
        });

        if (!fallbackUser) {
            console.log("No pending users found with requested roles 'admin' or 'superadmin'.");
            await client.end();
            process.exit(0);
        }

        console.log(`Approving fallback user: ${fallbackUser.email} (ID: ${fallbackUser.id})...`);
        await approveUser(fallbackUser.id);
        console.log(`Fallback user ${fallbackUser.email} approved.`);
        await client.end();
        process.exit(0);
    }

    console.log(`Approving ${targetEmail} (ID: ${adminUser.id})...`);

    try {
        // Note: approveUser handles the DB update and notification insert
        await approveUser(adminUser.id);
        console.log(`Successfully approved Superadmin user ${targetEmail}.`);

    } catch (e) {
        console.error("Failed to approve user:", e);
        process.exit(1);
    } finally {
        await client.end();
    }

    process.exit(0);
}

main();
