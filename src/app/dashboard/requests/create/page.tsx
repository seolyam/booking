import { getAllFormConfigs } from "@/actions/form-config";
import CreateRequestClient from "./_components/CreateRequestClient";
import { getAuthUser } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function CreateRequestPage() {
    const user = await getAuthUser();
    if (!user) redirect("/login");

    const configs = await getAllFormConfigs();

    return (
        <CreateRequestClient configs={configs} />
    );
}
