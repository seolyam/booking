import { CATEGORY_MAP, REQUIRED_PDFS } from "@/db/schema";
import { getFormConfig } from "@/actions/form-config";
import { FormBuilder } from "../_components/FormBuilder";
import { notFound, redirect } from "next/navigation";
import { getAuthUser } from "@/lib/supabase/server";
import { getOrCreateAppUserFromAuthUser } from "@/lib/appUser";

export default async function ManageFormCategoryPage({
    params,
}: {
    params: Promise<{ category: string }>;
}) {
    const { category: categoryKey } = await params;
    const user = await getAuthUser();
    if (!user) redirect("/login");

    const appUser = await getOrCreateAppUserFromAuthUser({
        id: user.id,
        email: user.email ?? null,
        user_metadata: (user.user_metadata ?? null) as Record<string, unknown> | null,
    });

    if (appUser.role !== "admin" && appUser.role !== "superadmin") {
        redirect("/dashboard");
    }

    const config = await getFormConfig(categoryKey);

    // If no config found in DB, check if it's a hardcoded category
    const hardcodedCategory = CATEGORY_MAP[categoryKey];

    if (!config && !hardcodedCategory) {
        return notFound();
    }

    // Merge hardcoded defaults if config is missing some fields
    const initialData = config || {
        category_key: categoryKey,
        category_label: hardcodedCategory?.label || categoryKey,
        description: hardcodedCategory?.description || "",
        icon_key: hardcodedCategory?.icon || "FileText",
        is_active: true,
        required_pdfs: REQUIRED_PDFS[categoryKey] ?? [],
        instructions: "",
        fields: [],
    };

    return (
        <FormBuilder
            initialData={initialData}
            mode="edit"
        />
    );
}
