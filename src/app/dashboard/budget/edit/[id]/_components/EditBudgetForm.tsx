"use client";

import { useState } from "react";
import { Bell, Trash2, MessageSquare } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useRouter } from "next/navigation";
import {
  addBudgetItem,
  deleteBudgetItem,
  updateBudgetItem,
  resubmitBudget,
} from "@/actions/budget";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Budget = {
  id: string;
  budget_type: "capex" | "opex";
  start_date: Date | null;
  end_date: Date | null;
  budget_number: number;
};

type BudgetItem = {
  id: string;
  description: string;
  quantity: number;
  unit_cost: string;
};

type ReviewerComment = {
  comment: string;
  reviewerName: string;
  date: Date;
} | null;

type Props = {
  budget: Budget;
  items: BudgetItem[];
  reviewerComment?: ReviewerComment;
};

export default function EditBudgetForm({
  budget,
  items: initialItems,
  reviewerComment,
}: Props) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Existing items from database
  const [existingItems, setExistingItems] = useState(
    initialItems.map((item) => {
      const parts = item.description.split(" - ");
      const category = parts.length > 1 ? parts[0] : "";
      const description =
        parts.length > 1 ? parts.slice(1).join(" - ") : item.description;

      return {
        id: item.id,
        category,
        description,
        quantity: item.quantity,
        unitCost: item.unit_cost,
      };
    }),
  );

  // New items to be added
  const [newItems, setNewItems] = useState<
    Array<{
      category: string;
      description: string;
      quantity: number;
      unitCost: string;
    }>
  >([]);

  const [varianceExplanation, setVarianceExplanation] = useState("");

  const categories = [
    "Equipment",
    "Labor",
    "Materials",
    "Services",
    "Software",
    "Maintenance",
    "Parts",
    "Testing",
    "Installation",
  ];

  const addNewItem = () => {
    setNewItems([
      ...newItems,
      { category: "", description: "", quantity: 1, unitCost: "" },
    ]);
  };

  const removeNewItem = (index: number) => {
    setNewItems(newItems.filter((_, i) => i !== index));
  };

  const updateNewItem = (
    index: number,
    field: string,
    value: string | number,
  ) => {
    const updated = [...newItems];
    updated[index] = { ...updated[index], [field]: value };
    setNewItems(updated);
  };

  const updateExistingItem = (
    index: number,
    field: string,
    value: string | number,
  ) => {
    const updated = [...existingItems];
    updated[index] = { ...updated[index], [field]: value };
    setExistingItems(updated);
  };

  const removeExistingItem = async (index: number) => {
    const item = existingItems[index];
    if (!item) return;

    try {
      const formData = new FormData();
      formData.set("itemId", item.id);

      await deleteBudgetItem(formData);
      setExistingItems(existingItems.filter((_, i) => i !== index));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete item");
    }
  };

  const allItems = [...existingItems, ...newItems];
  const totalBudget = allItems.reduce(
    (sum, item) =>
      sum + item.quantity * (parseFloat(item.unitCost as string) || 0),
    0,
  );

  const handleSubmit = async () => {
    setError(null);

    const hasAnyValidItem = allItems.some(
      (it) =>
        it.description.trim() &&
        it.quantity > 0 &&
        parseFloat(it.unitCost as string) > 0,
    );

    if (!hasAnyValidItem) {
      setError(
        "Please have at least one cost item with quantity and unit cost.",
      );
      return;
    }

    setIsSaving(true);
    try {
      // Update existing items
      for (const item of existingItems) {
        const desc = item.description.trim();
        if (
          !desc ||
          item.quantity <= 0 ||
          parseFloat(item.unitCost as string) <= 0
        ) {
          continue;
        }

        const itemFd = new FormData();
        itemFd.set("itemId", item.id);
        itemFd.set(
          "description",
          item.category ? `${item.category} - ${desc}` : desc,
        );
        itemFd.set("quantity", String(item.quantity));
        itemFd.set("unitCost", String(item.unitCost));

        const itemRes = await updateBudgetItem(itemFd);
        if (itemRes?.message && !itemRes.message.includes("updated")) {
          setError(itemRes.message);
          return;
        }
      }

      // Add new items
      for (const item of newItems) {
        const desc = item.description.trim();
        if (
          !desc ||
          item.quantity <= 0 ||
          parseFloat(item.unitCost as string) <= 0
        ) {
          continue;
        }

        const itemFd = new FormData();
        itemFd.set("budgetId", budget.id);
        itemFd.set(
          "description",
          item.category ? `${item.category} - ${desc}` : desc,
        );
        itemFd.set("quantity", String(item.quantity));
        itemFd.set("unitCost", String(item.unitCost));
        itemFd.set("quarter", "Q1");

        const itemRes = await addBudgetItem(null, itemFd);
        if (itemRes?.message && itemRes.message !== "Item added") {
          setError(itemRes.message);
          return;
        }
      }

      // Resubmit the budget
      const submitRes = await resubmitBudget(
        budget.id,
        varianceExplanation.trim() ? varianceExplanation.trim() : undefined,
      );

      if (submitRes?.message !== "Budget resubmitted successfully") {
        setError(submitRes?.message ?? "Failed to resubmit budget.");
        return;
      }

      router.push("/dashboard/requests");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="w-full">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-4xl font-bold text-gray-900">
            Edit Budget Request
          </h1>
          <p className="text-gray-600 mt-2">
            Make changes and resubmit your budget request
          </p>
          <p className="text-sm text-orange-600 mt-1">
            Budget ID: BUD-{budget.budget_number}
          </p>
        </div>
        <Bell className="h-6 w-6 text-gray-400" />
      </div>

      {/* Reviewer Comment Box */}
      {reviewerComment && (
        <div className="mb-8 rounded-xl border-2 border-orange-200 bg-orange-50 p-6">
          <div className="flex items-start gap-4">
            <div className="shrink-0">
              <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center">
                <MessageSquare className="w-5 h-5 text-orange-600" />
              </div>
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-semibold text-orange-800">
                  Revision Requested by Reviewer
                </h3>
                <span className="text-xs text-orange-600 font-medium">
                  {new Date(reviewerComment.date).toLocaleDateString("en-US", {
                    month: "short",
                    day: "2-digit",
                    year: "numeric",
                  })}
                </span>
              </div>
              <p className="text-sm text-orange-700 mb-3">
                <span className="font-medium">
                  {reviewerComment.reviewerName}
                </span>{" "}
                has requested changes to your budget request:
              </p>
              <div className="bg-white rounded-lg border border-orange-200 p-4">
                <p className="text-gray-800 whitespace-pre-wrap">
                  {reviewerComment.comment}
                </p>
              </div>
              <p className="text-xs text-orange-600 mt-3 italic">
                Please address the above feedback and resubmit your budget
                request.
              </p>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Budget Type (Read-only) */}
      <section className="mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <span>📋</span> Budget Information
        </h2>

        <div>
          <Label className="text-gray-700 font-medium mb-2 block">
            Budget Type
          </Label>
          <div className="p-4 border-2 rounded-lg bg-gray-50">
            <div className="font-semibold text-gray-900">
              {budget.budget_type === "capex" ? "CapEx" : "OpEx"}
            </div>
            <div className="text-sm text-gray-600 mt-1">
              {budget.budget_type === "capex"
                ? "Capital Expenditure - Long term assets and infrastructure"
                : "Operating Expenditure - Day-to-day operational costs"}
            </div>
          </div>
        </div>
      </section>

      {/* Cost Items Section */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <span>₱</span> Cost Items <span className="text-red-500">*</span>
          </h2>
          <Button
            type="button"
            onClick={addNewItem}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            Add item +
          </Button>
        </div>

        {/* Cost Items Table */}
        <div className="border border-gray-200 rounded-lg">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">
                    Category
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">
                    Description
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">
                    Quantity
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">
                    Unit Cost
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">
                    Total Cost
                  </th>
                  <th className="px-4 py-3 text-center text-sm font-semibold text-gray-900">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody>
                {/* Existing items */}
                {existingItems.map((item, index) => (
                  <tr
                    key={`existing-${item.id}`}
                    className="border-b border-gray-200 hover:bg-gray-50"
                  >
                    <td className="px-4 py-3">
                      <Select
                        value={item.category}
                        onValueChange={(val) =>
                          updateExistingItem(index, "category", val)
                        }
                      >
                        <SelectTrigger className="border-gray-300">
                          <SelectValue placeholder="Select Category" />
                        </SelectTrigger>
                        <SelectContent position="popper" sideOffset={5}>
                          {categories.map((cat) => (
                            <SelectItem key={cat} value={cat}>
                              {cat}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="px-4 py-3">
                      <Input
                        placeholder="Item Description"
                        value={item.description}
                        onChange={(e) =>
                          updateExistingItem(
                            index,
                            "description",
                            e.target.value,
                          )
                        }
                        className="border-gray-300"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <Input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) =>
                          updateExistingItem(
                            index,
                            "quantity",
                            parseInt(e.target.value) || 1,
                          )
                        }
                        className="border-gray-300 w-20"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.unitCost}
                        onChange={(e) =>
                          updateExistingItem(index, "unitCost", e.target.value)
                        }
                        className="border-gray-300 w-24"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <Input
                        value={`₱ ${(
                          item.quantity *
                          (parseFloat(item.unitCost as string) || 0)
                        ).toLocaleString("en-US", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}`}
                        disabled
                        className="bg-gray-50 border-gray-300 text-gray-700 w-40"
                      />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        type="button"
                        onClick={() => removeExistingItem(index)}
                        className="text-red-500 hover:text-red-700 inline-flex"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}

                {/* New items */}
                {newItems.map((item, index) => (
                  <tr
                    key={`new-${index}`}
                    className="border-b border-gray-200 hover:bg-blue-50/30"
                  >
                    <td className="px-4 py-3">
                      <Select
                        value={item.category}
                        onValueChange={(val) =>
                          updateNewItem(index, "category", val)
                        }
                      >
                        <SelectTrigger className="border-gray-300">
                          <SelectValue placeholder="Select Category" />
                        </SelectTrigger>
                        <SelectContent position="popper" sideOffset={5}>
                          {categories.map((cat) => (
                            <SelectItem key={cat} value={cat}>
                              {cat}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="px-4 py-3">
                      <Input
                        placeholder="Item Description"
                        value={item.description}
                        onChange={(e) =>
                          updateNewItem(index, "description", e.target.value)
                        }
                        className="border-gray-300"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <Input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) =>
                          updateNewItem(
                            index,
                            "quantity",
                            parseInt(e.target.value) || 1,
                          )
                        }
                        className="border-gray-300 w-20"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.unitCost}
                        onChange={(e) =>
                          updateNewItem(index, "unitCost", e.target.value)
                        }
                        className="border-gray-300 w-24"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <Input
                        value={`₱ ${(
                          item.quantity *
                          (parseFloat(item.unitCost as string) || 0)
                        ).toLocaleString("en-US", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}`}
                        disabled
                        className="bg-gray-50 border-gray-300 text-gray-700 w-40"
                      />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        type="button"
                        onClick={() => removeNewItem(index)}
                        className="text-red-500 hover:text-red-700 inline-flex"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Total Budget */}
        <div className="flex justify-end mt-4">
          <div className="text-right">
            <div className="text-sm text-gray-600">Total Budget:</div>
            <div className="text-2xl font-bold text-gray-900">
              ₱
              {totalBudget.toLocaleString("en-US", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Variance Explanation Section */}
      <section className="mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <span>ⓘ</span> Variance Explanation
        </h2>

        <div>
          <Label className="text-gray-700 font-medium mb-2 block">
            Explain the changes made to this budget request
          </Label>
          <Textarea
            placeholder="Explain what changes you've made and why..."
            value={varianceExplanation}
            onChange={(e) => setVarianceExplanation(e.target.value)}
            className="border-gray-300 min-h-30"
          />
        </div>
      </section>

      {/* Actions */}
      <div className="flex items-center gap-4">
        <Button
          type="button"
          className="bg-gray-600 hover:bg-gray-700 text-white"
          onClick={() => router.push("/dashboard/requests")}
          disabled={isSaving}
        >
          Cancel
        </Button>

        <Button
          type="button"
          className="bg-orange-600 hover:bg-orange-700 text-white ml-auto"
          onClick={handleSubmit}
          disabled={isSaving}
        >
          {isSaving ? "Resubmitting…" : "🔄 Resubmit request"}
        </Button>
      </div>
    </div>
  );
}
