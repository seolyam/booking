"use client";

import { updateReviewChecklist } from "@/actions/budget";
import { useState } from "react";

export type ChecklistItem = {
  key: string;
  label: string;
  defaultChecked: boolean;
};

interface ReviewChecklistProps {
  budgetId: string;
  items: ChecklistItem[];
}

export default function ReviewChecklist({
  budgetId,
  items,
}: ReviewChecklistProps) {
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>(
    items.reduce(
      (acc, item) => {
        acc[item.key] = item.defaultChecked;
        return acc;
      },
      {} as Record<string, boolean>
    )
  );
  const [isSaving, setIsSaving] = useState(false);

  const handleToggle = async (itemKey: string, itemLabel: string) => {
    const newValue = !checkedItems[itemKey];
    setCheckedItems((prev) => ({
      ...prev,
      [itemKey]: newValue,
    }));

    // Save to database
    setIsSaving(true);
    try {
      const formData = new FormData();
      formData.append("budgetId", budgetId);
      formData.append("itemKey", itemKey);
      formData.append("itemLabel", itemLabel);
      formData.append("isChecked", String(newValue));

      await updateReviewChecklist(formData);
    } catch (error) {
      console.error("Failed to update checklist:", error);
      // Revert on error
      setCheckedItems((prev) => ({
        ...prev,
        [itemKey]: !newValue,
      }));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">
        Review Checklist
      </h2>
      <div className="space-y-3">
        {items.map((item) => (
          <label
            key={item.key}
            className="flex items-start gap-3 cursor-pointer hover:bg-gray-50 p-2 rounded -mx-2 transition-colors"
          >
            <input
              type="checkbox"
              checked={checkedItems[item.key] || false}
              onChange={() => handleToggle(item.key, item.label)}
              disabled={isSaving}
              className="mt-1 rounded cursor-pointer"
            />
            <span className="text-sm text-gray-700">{item.label}</span>
          </label>
        ))}
      </div>
    </div>
  );
}
