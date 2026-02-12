import { CATEGORY_MAP, REQUIRED_PDFS, type CategoryMeta } from "@/db/schema";
import { getFormConfig } from "@/actions/form-config";
import { ConfigForm } from "./_components/ConfigForm";
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

    const category = CATEGORY_MAP[categoryKey];
    if (!category) return notFound();

    const config = await getFormConfig(categoryKey);
    const defaultPdfs = REQUIRED_PDFS[categoryKey] ?? [];

    return (
        <ConfigForm
            category={category}
            initialData={config}
            defaultPdfs={defaultPdfs}
        />
    );
}
