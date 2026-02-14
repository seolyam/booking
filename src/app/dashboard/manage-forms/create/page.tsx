import { getAuthUser } from "@/lib/supabase/server";
import { getOrCreateAppUserFromAuthUser } from "@/lib/appUser";
import { redirect } from "next/navigation";
import { FormBuilder } from "../_components/FormBuilder";

export default async function CreateFormPage() {
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

    return <FormBuilder mode="create" />;
}
