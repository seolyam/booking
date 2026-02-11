"use server";

import { db } from "@/db";
import { formConfigs, CATEGORIES, type CategoryMeta } from "@/db/schema";
import { getAuthUser } from "@/lib/supabase/server";
import { getOrCreateAppUserFromAuthUser } from "@/lib/appUser";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

async function requireAdmin() {
    const authUser = await getAuthUser();
    if (!authUser) throw new Error("Not authenticated");
    const appUser = await getOrCreateAppUserFromAuthUser({
        id: authUser.id,
        email: authUser.email ?? null,
        user_metadata: authUser.user_metadata ?? null,
    });

    if (appUser.role !== "admin" && appUser.role !== "superadmin") {
        throw new Error("Insufficient permissions");
    }
    return appUser;
}

export async function getFormConfig(categoryKey: string) {
    const config = await db.query.formConfigs.findFirst({
        where: eq(formConfigs.category_key, categoryKey),
    });
    return config || null;
}

export async function getAllFormConfigs() {
    const configs = await db.select().from(formConfigs);
    return configs;
}

export async function updateFormConfig(
    categoryKey: string,
    data: {
        is_active: boolean;
        required_pdfs: string[];
        instructions?: string;
    }
) {
    const admin = await requireAdmin();

    const existing = await db.query.formConfigs.findFirst({
        where: eq(formConfigs.category_key, categoryKey),
    });

    if (existing) {
        await db
            .update(formConfigs)
            .set({
                is_active: data.is_active,
                required_pdfs: data.required_pdfs,
                instructions: data.instructions,
                updated_at: new Date(),
                updated_by: admin.id,
            })
            .where(eq(formConfigs.category_key, categoryKey));
    } else {
        await db.insert(formConfigs).values({
            category_key: categoryKey,
            is_active: data.is_active,
            required_pdfs: data.required_pdfs,
            instructions: data.instructions,
            updated_by: admin.id,
        });
    }

    revalidatePath("/dashboard/manage-forms");
    revalidatePath(`/dashboard/manage-forms/${categoryKey}`);
    // Also revalidate creation page as it might use this config
    revalidatePath("/dashboard/requests/create");
    return { success: true };
}
