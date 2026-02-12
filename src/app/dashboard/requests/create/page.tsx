import { getAllFormConfigs } from "@/actions/form-config";
import { CATEGORIES, type CategoryMeta, type FormConfig } from "@/db/schema";
import { CreateRequestClient } from "./_components/CreateRequestClient";

export default async function CreateRequestPage() {
  const configs = await getAllFormConfigs();
  const configMap = new Map(configs.map(c => [c.category_key, c]));

  // Convert array to Record for the client component
  const configRecord: Record<string, FormConfig> = {};
  configs.forEach(c => {
    configRecord[c.category_key] = c;
  });

  const availableCategories: CategoryMeta[] = [];

  // 1. Process hardcoded categories
  CATEGORIES.forEach(cat => {
    const conf = configMap.get(cat.key);
    // If explicit config exists and is inactive, skip
    if (conf && !conf.is_active) return;

    // Use config label/desc if available
    availableCategories.push({
      key: cat.key,
      label: conf?.category_label || cat.label,
      description: conf?.description || cat.description,
      icon: (conf?.icon_key as string) || cat.icon,
      code: cat.code
    });
  });

  // 2. Add purely dynamic categories (not in hardcoded list)
  configs.forEach(conf => {
    if (!conf.is_active) return;
    if (!CATEGORIES.find(c => c.key === conf.category_key)) {
      availableCategories.push({
        key: conf.category_key,
        label: conf.category_label || conf.category_key,
        description: conf.description || "",
        icon: (conf.icon_key as string) || "FileText",
        code: (conf.category_label || conf.category_key).substring(0, 3).toUpperCase()
      });
    }
  });

  return (
    <CreateRequestClient
      categories={availableCategories}
      formConfigs={configRecord}
    />
  );
}
