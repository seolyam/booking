import { getAuthUser } from "@/lib/supabase/server";
import { getOrCreateAppUserFromAuthUser } from "@/lib/appUser";
import { redirect } from "next/navigation";
import { CATEGORIES, type CategoryMeta } from "@/db/schema";
import { getAllFormConfigs } from "@/actions/form-config";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Check, X, Plus } from "lucide-react";

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

    // Merge DB configs with hardcoded categories
    const allCategories = [...CATEGORIES];

    // Add dynamic forms that are not in hardcoded list
    configs.forEach(conf => {
        if (!allCategories.find(c => c.key === conf.category_key)) {
            allCategories.push({
                key: conf.category_key,
                label: conf.category_label || conf.category_key,
                code: (conf.category_label || conf.category_key).substring(0, 3).toUpperCase(),
                description: conf.description || "Custom Form",
                icon: conf.icon_key || "FileText",
            });
        }
    });

    return (
        <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Manage Forms</h1>
                    <p className="text-sm text-gray-600 mt-1">
                        Configure availability and requirements for request forms
                    </p>
                </div>
                <Link
                    href="/dashboard/manage-forms/create"
                    className="inline-flex items-center gap-2 bg-[#358334] hover:bg-[#2F5E3D] text-white px-4 py-2.5 rounded-lg font-semibold transition-colors text-sm shadow-sm"
                >
                    <Plus className="h-4 w-4" />
                    Add Form
                </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {allCategories.map((cat) => {
                    const config = configMap.get(cat.key);
                    // Use DB values if present, else fallback to cat (which might be hardcoded or derived from DB)
                    const displayLabel = config?.category_label || cat.label;
                    const displayDesc = config?.description || cat.description;
                    const isActive = config?.is_active ?? true;
                    const displayCode = cat.code || displayLabel.substring(0, 3).toUpperCase();

                    return (
                        <div key={cat.key} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow relative overflow-hidden group">
                            <div className="flex justify-between items-start mb-4">
                                <div className="h-10 w-10 bg-gray-50 rounded-lg flex items-center justify-center text-gray-500 group-hover:text-blue-600 transition-colors">
                                    <span className="font-bold text-lg">{displayCode[0]}</span>
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

                            <h3 className="font-bold text-gray-900 mb-1">{displayLabel}</h3>
                            <p className="text-xs text-gray-600 mb-4 line-clamp-2 min-h-[2.5em]">{displayDesc}</p>

                            <div className="flex items-center justify-between pt-4 border-t border-gray-50">
                                <span className="text-xs text-gray-500 font-mono">{displayCode}</span>
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
