"use client";

import { useState } from "react";
import ReviewChecklist from "@/components/ReviewChecklist";
import ReviewDecisionModal from "@/components/ReviewDecisionModal";

interface ReviewPageClientProps {
  budgetId: string;
  budgetStatus: string;
  checklistDefaults: Record<string, boolean>;
}

export default function ReviewPageClient({
  budgetId,
  budgetStatus,
  checklistDefaults,
}: ReviewPageClientProps) {
  const [checklistState, setChecklistState] =
    useState<Record<string, boolean>>(checklistDefaults);

  const checklistItems = [
    { key: "documented_costs", label: "All costs are documented" },
    { key: "reasonable_costs", label: "Unit Costs are reasonable" },
    { key: "realistic_timeline", label: "Timeline is realistic" },
    { key: "variance_clear", label: "Variance explanation is clear" },
    { key: "departmental_goals", label: "Aligns with departmental goals" },
    { key: "budget_policies", label: "Complies with budget policies" },
  ];

  return (
    <div className="sticky top-6 space-y-6">
      {/* Review Checklist */}
      <ReviewChecklist
        budgetId={budgetId}
        items={checklistItems.map((item) => ({
          ...item,
          defaultChecked: checklistState[item.key] || false,
        }))}
        onChecklistChange={setChecklistState}
      />

      {/* Review Decision Modal */}
      <ReviewDecisionModal
        budgetId={budgetId}
        budgetStatus={budgetStatus}
        checklistState={checklistState}
        checklistItems={checklistItems}
      />
    </div>
  );
}
