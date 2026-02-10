import { getAuthUser } from "@/lib/supabase/server";
import { getOrCreateAppUserFromAuthUser } from "@/lib/appUser";
import { redirect } from "next/navigation";

export default async function ManageFormsPage() {
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

    return (
        <div className="p-8">
            <h1 className="text-2xl font-bold mb-4">Manage Forms</h1>
            <p className="text-gray-600 mb-8">
                Configure and edit form templates for different request types.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Placeholder Cards for Forms */}
                {["Flight Booking", "Hotel Accommodation", "Travel Authority", "Cash Advance", "Liquidation", "Reimbursement"].map((form) => (
                    <div key={form} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow cursor-pointer">
                        <h3 className="font-semibold text-lg mb-2">{form}</h3>
                        <p className="text-sm text-gray-500 mb-4">Edit fields and validation rules.</p>
                        <button className="text-sm font-medium text-blue-600 hover:text-blue-800">
                            Edit Configuration →
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
}
