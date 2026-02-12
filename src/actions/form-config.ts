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
        category_label?: string;
        description?: string;
        icon_key?: string;
        is_active: boolean;
        required_pdfs: string[];
        instructions?: string;
        fields?: any[];
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
                category_label: data.category_label,
                description: data.description,
                icon_key: data.icon_key,
                is_active: data.is_active,
                required_pdfs: data.required_pdfs,
                instructions: data.instructions,
                fields: data.fields ?? [],
                updated_at: new Date(),
                updated_by: admin.id,
            })
            .where(eq(formConfigs.category_key, categoryKey));
    } else {
        await db.insert(formConfigs).values({
            category_key: categoryKey,
            category_label: data.category_label,
            description: data.description,
            icon_key: data.icon_key,
            is_active: data.is_active,
            required_pdfs: data.required_pdfs,
            instructions: data.instructions,
            fields: data.fields ?? [],
            updated_by: admin.id,
        });
    }

    revalidatePath("/dashboard/manage-forms");
    revalidatePath(`/dashboard/manage-forms/${categoryKey}`);
    revalidatePath("/dashboard/requests/create");
    return { success: true };
}

export async function createFormConfig(data: {
    category_key: string;
    category_label: string;
    description: string;
    icon_key: string;
    is_active: boolean;
    required_pdfs: string[];
    instructions?: string;
    fields: any[];
}) {
    const admin = await requireAdmin();

    // Check availability
    const existing = await db.query.formConfigs.findFirst({
        where: eq(formConfigs.category_key, data.category_key),
    });

    if (existing) {
        throw new Error("Form with this ID already exists");
    }

    await db.insert(formConfigs).values({
        category_key: data.category_key,
        category_label: data.category_label,
        description: data.description,
        icon_key: data.icon_key,
        is_active: data.is_active,
        required_pdfs: data.required_pdfs,
        instructions: data.instructions,
        fields: data.fields,
        updated_by: admin.id,
    });

    revalidatePath("/dashboard/manage-forms");
    revalidatePath("/dashboard/requests/create");
    return { success: true };
}
