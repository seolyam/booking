"use server";

import { getAuthUser } from "@/lib/supabase/server";
import { getOrCreateAppUserFromAuthUser } from "@/lib/appUser";
import { getRequestById } from "@/actions/request";
import { CATEGORY_MAP, type Request, type CategoryMeta, type Attachment } from "@/db/schema";
import { notFound, redirect } from "next/navigation";
import EditRequestClient from "./_components/EditRequestClient";

export async function generateMetadata({ params }: { params: { id: string } }) {
    const { id } = await params;
    return {
        title: `Edit Request ${id} | Dashboard`,
    };
}

export default async function EditRequestPage({ params }: { params: { id: string } }) {
    const { id } = await params;
    const authUser = await getAuthUser();
    if (!authUser) redirect("/login");

    const appUser = await getOrCreateAppUserFromAuthUser({
        id: authUser.id,
        email: authUser.email ?? null,
        user_metadata: (authUser.user_metadata ?? null) as Record<string, unknown> | null,
    });

    const request = await getRequestById(id);
    if (!request) notFound();

    const isRequester = appUser.role === "requester" && request.requester_id === appUser.id;
    const isAdmin = appUser.role === "admin" || appUser.role === "superadmin";

    if (!isRequester && !isAdmin) {
        redirect("/dashboard/requests"); // Not authorized
    }

    // Requester validation: can only edit draft or needs_revision
    if (isRequester && !["draft", "needs_revision"].includes(request.status)) {
        redirect(`/dashboard/requests/${id}`); // Cannot edit
    }

    // Admin validation: admins can generally edit, but maybe restricted if closed?
    // Let's allow editing unless closed for now, or just allow all as "Manage Form" implies fix power.

    const category = CATEGORY_MAP[request.category];
    if (!category) notFound(); // Should not happen

    return (
        <EditRequestClient
            request={request as Request & { form_data: Record<string, unknown> }}
            category={category as CategoryMeta}
            existingAttachments={request.attachments as Attachment[]}
        />
    );
}
