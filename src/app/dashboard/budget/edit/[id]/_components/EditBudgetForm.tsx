"use client";

import { useState } from "react";
import { Trash2, MessageSquare } from "lucide-react";
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
    <div className="-m-8 p-6 md:p-8 w-full max-w-[1400px] mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl md:text-4xl font-black text-gray-900">
            Edit Budget Request
          </h1>
          <p className="text-gray-500 mt-2 font-medium text-lg">
            Make changes and resubmit your budget request
          </p>
          <div className="mt-2 inline-flex items-center rounded-md bg-orange-50 px-2.5 py-1 text-xs font-bold text-orange-700 ring-1 ring-inset ring-orange-600/20">
            BUD-{budget.budget_number}
          </div>
        </div>
      </div>

      {/* Reviewer Comment Box */}
      {reviewerComment && (
        <div className="rounded-2xl border border-orange-100 bg-orange-50/50 p-6 md:p-8">
          <div className="flex items-start gap-5">
            <div className="shrink-0">
              <div className="w-12 h-12 rounded-xl bg-orange-100 flex items-center justify-center shadow-sm">
                <MessageSquare className="w-6 h-6 text-orange-600" />
              </div>
            </div>
            <div className="flex-1 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-gray-900">
                  Revision Requested
                </h3>
                <span className="text-xs font-bold text-orange-600 uppercase tracking-wide bg-orange-100 px-2 py-1 rounded-md">
                  {new Date(reviewerComment.date).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </span>
              </div>

              <div className="text-gray-600 text-sm leading-relaxed">
                <span className="font-bold text-gray-900">
                  {reviewerComment.reviewerName}
                </span>{" "}
                requested changes:
              </div>

              <div className="bg-white rounded-xl border border-orange-100 p-5 shadow-sm">
                <p className="text-gray-700 whitespace-pre-wrap text-sm leading-relaxed">
                  {reviewerComment.comment}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="rounded-2xl md:rounded-4xl bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] ring-1 ring-gray-100 overflow-hidden">
        <div className="p-6 md:p-10 space-y-10">
          {error && (
            <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600 font-medium">
              {error}
            </div>
          )}

          {/* Budget Info */}
          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
              Budget Information
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">
                  Budget Type
                </Label>
                <div className="p-4 rounded-xl border border-gray-200 bg-gray-50/50">
                  <div className="font-bold text-gray-900">
                    {budget.budget_type === "capex" ? "CapEx" : "OpEx"}
                  </div>
                  <div className="text-xs text-gray-500 mt-1 font-medium">
                    {budget.budget_type === "capex"
                      ? "Capital Expenditure"
                      : "Operating Expenditure"}
                  </div>
                </div>
              </div>
            </div>
          </section>

          <div className="h-px bg-gray-100" />

          {/* Cost Items Section */}
          <section>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-gray-900">
                Cost Breakdown
              </h2>
              <Button
                type="button"
                onClick={addNewItem}
                className="bg-[#358334] hover:bg-[#2F5E3D] text-white rounded-lg px-4 py-2 font-semibold text-sm shadow-sm transition-all"
              >
                Add Item +
              </Button>
            </div>

            {/* Cost Items Table */}
            <div className="border border-gray-100 rounded-xl overflow-hidden ring-1 ring-gray-50">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[800px]">
                  <thead>
                    <tr className="bg-gray-50/50 border-b border-gray-100 text-[11px] uppercase tracking-wider text-gray-400 font-bold">
                      <th className="px-6 py-4 text-left w-[200px]">
                        Category
                      </th>
                      <th className="px-6 py-4 text-left w-[300px]">
                        Description
                      </th>
                      <th className="px-6 py-4 text-left w-[100px]">Qty</th>
                      <th className="px-6 py-4 text-left w-[140px]">
                        Unit Cost
                      </th>
                      <th className="px-6 py-4 text-left w-[140px]">Total</th>
                      <th className="px-6 py-4 text-center w-[60px]">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {/* Existing items */}
                    {existingItems.map((item, index) => (
                      <tr
                        key={`existing-${item.id}`}
                        className="group hover:bg-gray-50/30 transition-colors"
                      >
                        <td className="px-6 py-4 align-top">
                          <Select
                            value={item.category}
                            onValueChange={(val) =>
                              updateExistingItem(index, "category", val)
                            }
                          >
                            <SelectTrigger className="border-gray-200 bg-white rounded-lg h-10 text-sm focus:ring-2 focus:ring-[#358334]/20 focus:border-[#358334]">
                              <SelectValue placeholder="Select" />
                            </SelectTrigger>
                            <SelectContent>
                              {categories.map((cat) => (
                                <SelectItem key={cat} value={cat}>
                                  {cat}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="px-6 py-4 align-top">
                          <Input
                            placeholder="Description"
                            value={item.description}
                            onChange={(e) =>
                              updateExistingItem(
                                index,
                                "description",
                                e.target.value,
                              )
                            }
                            className="border-gray-200 bg-white rounded-lg h-10 text-sm focus:ring-2 focus:ring-[#358334]/20 focus:border-[#358334]"
                          />
                        </td>
                        <td className="px-6 py-4 align-top">
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
                            className="border-gray-200 bg-white rounded-lg h-10 text-sm focus:ring-2 focus:ring-[#358334]/20 focus:border-[#358334]"
                          />
                        </td>
                        <td className="px-6 py-4 align-top">
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">
                              ₱
                            </span>
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              value={item.unitCost}
                              onChange={(e) =>
                                updateExistingItem(
                                  index,
                                  "unitCost",
                                  e.target.value,
                                )
                              }
                              className="pl-7 border-gray-200 bg-white rounded-lg h-10 text-sm focus:ring-2 focus:ring-[#358334]/20 focus:border-[#358334]"
                            />
                          </div>
                        </td>
                        <td className="px-6 py-4 align-top">
                          <div className="h-10 flex items-center text-sm font-semibold text-gray-900">
                            ₱
                            {(
                              item.quantity *
                              (parseFloat(item.unitCost as string) || 0)
                            ).toLocaleString("en-US", {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </div>
                        </td>
                        <td className="px-6 py-4 align-top text-center">
                          <button
                            type="button"
                            onClick={() => removeExistingItem(index)}
                            className="h-10 w-10 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-all"
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
                        className="group bg-blue-50/10 hover:bg-blue-50/20 transition-colors"
                      >
                        <td className="px-6 py-4 align-top">
                          <Select
                            value={item.category}
                            onValueChange={(val) =>
                              updateNewItem(index, "category", val)
                            }
                          >
                            <SelectTrigger className="border-blue-100 bg-white rounded-lg h-10 text-sm focus:ring-2 focus:ring-[#358334]/20 focus:border-[#358334]">
                              <SelectValue placeholder="Select" />
                            </SelectTrigger>
                            <SelectContent>
                              {categories.map((cat) => (
                                <SelectItem key={cat} value={cat}>
                                  {cat}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="px-6 py-4 align-top">
                          <Input
                            placeholder="Description"
                            value={item.description}
                            onChange={(e) =>
                              updateNewItem(
                                index,
                                "description",
                                e.target.value,
                              )
                            }
                            className="border-blue-100 bg-white rounded-lg h-10 text-sm focus:ring-2 focus:ring-[#358334]/20 focus:border-[#358334]"
                          />
                        </td>
                        <td className="px-6 py-4 align-top">
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
                            className="border-blue-100 bg-white rounded-lg h-10 text-sm focus:ring-2 focus:ring-[#358334]/20 focus:border-[#358334]"
                          />
                        </td>
                        <td className="px-6 py-4 align-top">
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">
                              ₱
                            </span>
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              value={item.unitCost}
                              onChange={(e) =>
                                updateNewItem(index, "unitCost", e.target.value)
                              }
                              className="pl-7 border-blue-100 bg-white rounded-lg h-10 text-sm focus:ring-2 focus:ring-[#358334]/20 focus:border-[#358334]"
                            />
                          </div>
                        </td>
                        <td className="px-6 py-4 align-top">
                          <div className="h-10 flex items-center text-sm font-semibold text-gray-900">
                            ₱
                            {(
                              item.quantity *
                              (parseFloat(item.unitCost as string) || 0)
                            ).toLocaleString("en-US", {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </div>
                        </td>
                        <td className="px-6 py-4 align-top text-center">
                          <button
                            type="button"
                            onClick={() => removeNewItem(index)}
                            className="h-10 w-10 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-all"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {/* Total Footer inside table container to look integrated */}
              <div className="bg-gray-50/50 border-t border-gray-100 px-6 py-4 flex justify-end items-center gap-4">
                <span className="text-sm font-bold text-gray-500 uppercase tracking-wide">
                  Total Estimated Cost
                </span>
                <span className="text-xl font-black text-gray-900">
                  ₱
                  {totalBudget.toLocaleString("en-US", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </span>
              </div>
            </div>
          </section>

          <div className="h-px bg-gray-100" />

          {/* Variance Explanation Section */}
          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-2">
              Variance Explanation
            </h2>
            <p className="text-sm text-gray-500 mb-4">
              Please provide a detailed explanation for the changes made to this
              budget request.
            </p>

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
        </div>

        {/* Footer Actions */}
        <div className="bg-gray-50 px-6 md:px-10 py-6 border-t border-gray-100 flex items-center justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            className="border-gray-200 text-gray-700 hover:bg-white hover:text-gray-900 font-semibold"
            onClick={() => router.push("/dashboard/requests")}
            disabled={isSaving}
          >
            Cancel
          </Button>

          <Button
            type="button"
            className="bg-[#358334] hover:bg-[#2F5E3D] text-white font-semibold px-6 shadow-sm shadow-green-900/10"
            onClick={handleSubmit}
            disabled={isSaving}
          >
            {isSaving ? "Resubmitting..." : "Resubmit Request"}
          </Button>
        </div>
      </div>
    </div>
  );
}
