"use client";

import { useState } from "react";

export type ChecklistItem = {
  key: string;
  label: string;
  defaultChecked: boolean;
};

interface ReviewChecklistProps {
  budgetId: string;
  items: ChecklistItem[];
  onChecklistChange?: (checkedItems: Record<string, boolean>) => void;
}

export default function ReviewChecklist({
  budgetId,
  items,
  onChecklistChange,
}: ReviewChecklistProps) {
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>(
    items.reduce(
      (acc, item) => {
        acc[item.key] = item.defaultChecked;
        return acc;
      },
      {} as Record<string, boolean>,
    ),
  );

  const handleToggle = (itemKey: string) => {
    const newCheckedItems = {
      ...checkedItems,
      [itemKey]: !checkedItems[itemKey],
    };
    setCheckedItems(newCheckedItems);

    // Notify parent of changes
    if (onChecklistChange) {
      onChecklistChange(newCheckedItems);
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-2">
        Review Checklist
      </h2>
      <p className="text-sm text-gray-500 mb-4">
        Check all items that have been reviewed and verified
      </p>

      <div className="space-y-3">
        {items.map((item) => (
          <label
            key={item.key}
            className="flex items-start gap-3 cursor-pointer hover:bg-gray-50 p-2 rounded -mx-2 transition-colors"
          >
            <input
              type="checkbox"
              checked={checkedItems[item.key] || false}
              onChange={() => handleToggle(item.key)}
              className="mt-1 h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-green-500 cursor-pointer"
            />
            <span className="text-sm text-gray-700 flex-1">{item.label}</span>
          </label>
        ))}
      </div>
    </div>
  );
}
