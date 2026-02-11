import { getAuthUser } from "@/lib/supabase/server";
import { getOrCreateAppUserFromAuthUser } from "@/lib/appUser";
import { redirect } from "next/navigation";
import { CATEGORIES, type CategoryMeta } from "@/db/schema";
import { getAllFormConfigs } from "@/actions/form-config";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Check, X } from "lucide-react";

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

    const configs = await getAllFormConfigs();
    const configMap = new Map(configs.map(c => [c.category_key, c]));

    return (
        <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Manage Forms</h1>
                <p className="text-sm text-gray-600 mt-1">
                    Configure availability and requirements for request forms
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {CATEGORIES.map((cat) => {
                    const config = configMap.get(cat.key);
                    const isActive = config?.is_active ?? true; // Default active if no config

                    return (
                        <div key={cat.key} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow relative overflow-hidden group">
                            <div className="flex justify-between items-start mb-4">
                                <div className="h-10 w-10 bg-gray-50 rounded-lg flex items-center justify-center text-gray-500 group-hover:text-blue-600 transition-colors">
                                    {/* Just use first letter for icon or maybe cat.icon if I had lucide dynamic import, but let's keep it simple */}
                                    <span className="font-bold text-lg">{cat.code[0]}</span>
                                </div>
                                <div className={cn(
                                    "px-2.5 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 border",
                                    isActive
                                        ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                                        : "bg-gray-50 text-gray-600 border-gray-200"
                                )}>
                                    {isActive ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                                    {isActive ? "Active" : "Inactive"}
                                </div>
                            </div>

                            <h3 className="font-bold text-gray-900 mb-1">{cat.label}</h3>
                            <p className="text-xs text-gray-600 mb-4 line-clamp-2 min-h-[2.5em]">{cat.description}</p>

                            <div className="flex items-center justify-between pt-4 border-t border-gray-50">
                                <span className="text-xs text-gray-500 font-mono">{cat.code}</span>
                                <Link
                                    href={`/dashboard/manage-forms/${cat.key}`}
                                    className="text-sm font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1 group-hover:underline"
                                >
                                    Edit Configuration →
                                </Link>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
