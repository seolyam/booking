"use client";

import { useId, useMemo, useState } from "react";
import {
  Bell,
  Calendar,
  ChevronLeft,
  FileText,
  Info,
  Trash2,
  Save,
  Send,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useRouter } from "next/navigation";
import {
  addBudgetItem,
  createBudgetDraft,
  submitBudget,
} from "@/actions/budget";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function CreateBudgetPage() {
  const router = useRouter();
  const reactId = useId();
  const [budgetType, setBudgetType] = useState<"capex" | "opex" | "">("");
  const [projectTitle, setProjectTitle] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [items, setItems] = useState([
    { category: "", description: "", quantity: "", unitCost: "" },
  ]);
  const [varianceExplanation, setVarianceExplanation] = useState("");

  const projectId = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const suffix = reactId.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
    const short = (suffix.slice(-5) || "00000").padStart(5, "0");
    return `PROJ-${year}${month}-${short}`;
  }, [reactId]);

  const addItem = () => {
    setItems([
      ...items,
      { category: "", description: "", quantity: "", unitCost: "" },
    ]);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: string, value: string | number) => {
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: value };
    setItems(updated);
  };



  const totalBudget = items.reduce(
    (sum, item) =>
      sum +
      (parseInt(item.quantity as string) || 0) *
      (parseFloat(item.unitCost as string) || 0),
    0,
  );

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

  const persistBudget = async (mode: "draft" | "submit") => {
    setError(null);

    const selectedType = budgetType || "";
    if (!selectedType) {
      setError("Please select a Budget Type.");
      return;
    }

    const hasAnyValidItem = items.some(
      (it) =>
        it.description.trim() &&
        Number(it.quantity) > 0 &&
        parseFloat(String(it.unitCost)) > 0,
    );
    if (!hasAnyValidItem) {
      setError(
        "Please add at least one cost item with quantity and unit cost.",
      );
      return;
    }

    setIsSaving(true);
    try {
      const draftFd = new FormData();
      draftFd.set("budgetType", selectedType);
      draftFd.set("fiscalYear", String(new Date().getFullYear()));
      if (startDate) draftFd.set("startDate", startDate);
      if (endDate) draftFd.set("endDate", endDate);

      const draftRes = await createBudgetDraft(null, draftFd);
      if (!draftRes?.budgetId) {
        setError(draftRes?.message ?? "Failed to create budget draft.");
        return;
      }

      const budgetId = draftRes.budgetId;

      // Save Items
      for (const item of items) {
        const desc = item.description.trim();
        if (
          !desc ||
          Number(item.quantity) <= 0 ||
          parseFloat(String(item.unitCost)) <= 0
        )
          continue;

        const itemFd = new FormData();
        itemFd.set("budgetId", budgetId);
        itemFd.set(
          "description",
          item.category ? `${item.category} - ${desc}` : desc,
        );
        itemFd.set("quantity", String(item.quantity));
        itemFd.set("unitCost", String(item.unitCost));
        itemFd.set("quarter", "Q1"); // Defaulting to Q1 as per current logic

        const itemRes = await addBudgetItem(null, itemFd);
        if (itemRes?.message && itemRes.message !== "Item added") {
          setError(itemRes.message);
          return;
        }
      }



      if (mode === "submit") {
        const submitRes = await submitBudget(
          budgetId,
          varianceExplanation.trim() ? varianceExplanation.trim() : undefined,
        );
        if (submitRes?.message !== "Budget submitted successfully") {
          setError(submitRes?.message ?? "Failed to submit budget.");
          return;
        }
      }

      router.push("/dashboard/requests");
    } catch (e) {
      console.error(e);
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto p-6 space-y-6">
      {/* Top Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Create Budget Request
          </h1>
          <p className="text-gray-500 mt-1">
            Fill in the details below to create your budget request
          </p>
        </div>
        <Bell className="h-6 w-6 text-gray-400" />
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <Card className="border-none shadow-sm bg-white">
        <CardContent className="p-8 space-y-8">
          {/* Project Information Section */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Project Information
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-2">
                <Label
                  htmlFor="projectTitle"
                  className="text-gray-700 font-medium"
                >
                  Project Title <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="projectTitle"
                  placeholder="Enter project name"
                  value={projectTitle}
                  onChange={(e) => setProjectTitle(e.target.value)}
                  className="h-11"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-gray-700 font-medium">Project ID</Label>
                <Input
                  value={projectId}
                  disabled
                  className="h-11 bg-gray-50 text-gray-500 font-medium"
                />
              </div>
            </div>

            {/* Budget Type */}
            <div className="mt-6">
              <Label className="text-gray-700 font-medium mb-3 block">
                Budget Type <span className="text-red-500">*</span>
              </Label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* CapEx */}
                <button
                  type="button"
                  onClick={() => setBudgetType("capex")}
                  className={`p-6 border rounded-xl text-left transition-all ${budgetType === "capex"
                      ? "border-blue-200 bg-blue-100 ring-1 ring-blue-300"
                      : "border-gray-300 bg-white hover:border-gray-400"
                    }`}
                >
                  <div
                    className={`font-bold text-lg mb-1 ${budgetType === "capex" ? "text-blue-700" : "text-gray-900"
                      }`}
                  >
                    CapEx
                  </div>
                  <div
                    className={`text-sm ${budgetType === "capex" ? "text-blue-600" : "text-gray-500"
                      }`}
                  >
                    Capital Expenditure - Long term assets and infrastructure
                  </div>
                </button>

                {/* OpEx */}
                <button
                  type="button"
                  onClick={() => setBudgetType("opex")}
                  className={`p-6 border rounded-xl text-left transition-all ${budgetType === "opex"
                    ? "border-purple-600 bg-purple-50 ring-1 ring-purple-600"
                    : "border-gray-300 bg-white hover:border-gray-400"
                    }`}
                >
                  <div
                    className={`font-bold text-lg mb-1 ${budgetType === "opex" ? "text-purple-700" : "text-gray-900"
                      }`}
                  >
                    OpEx
                  </div>
                  <div
                    className={`text-sm ${budgetType === "opex" ? "text-purple-600" : "text-gray-500"
                      }`}
                  >
                    Operating Expenditure - Day-to-day operational costs
                  </div>
                </button>
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
                onClick={addItem}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                Add item +
              </Button>
            </div>

            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-white border-b border-gray-200">
                      <th className="px-4 py-4 text-left text-sm font-medium text-gray-900 w-[20%]">
                        Category
                      </th>
                      <th className="px-4 py-4 text-left text-sm font-medium text-gray-900 w-[30%]">
                        Description
                      </th>
                      <th className="px-4 py-4 text-left text-sm font-medium text-gray-900 w-[10%]">
                        Quantity
                      </th>
                      <th className="px-4 py-4 text-left text-sm font-medium text-gray-900 w-[15%]">
                        Unit Cost
                      </th>
                      <th className="px-4 py-4 text-left text-sm font-medium text-gray-900 w-[15%]">
                        Total Cost
                      </th>
                      <th className="px-4 py-4 text-center text-sm font-medium text-gray-900 w-[10%]">
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {items.map((item, index) => (
                      <tr key={index} className="bg-white hover:bg-gray-50/50">
                        <td className="px-4 py-3">
                          <Select
                            value={item.category}
                            onValueChange={(val) =>
                              updateItem(index, "category", val)
                            }
                          >
                            <SelectTrigger className="border-gray-300 h-10">
                              <SelectValue placeholder="Select Category" />
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
                        <td className="px-4 py-3">
                          <Input
                            placeholder="Item Description"
                            value={item.description}
                            onChange={(e) =>
                              updateItem(index, "description", e.target.value)
                            }
                            className="border-gray-300 h-10"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <div className="relative">
                            <Input
                              type="number"
                              min="1"
                              placeholder="0"
                              value={item.quantity}
                              onChange={(e) =>
                                updateItem(index, "quantity", e.target.value)
                              }
                              className="border-gray-300 h-10 pr-8"
                            />
                            <div className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                              <span className="text-xs">↕</span>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            placeholder="0.00"
                            value={item.unitCost}
                            onChange={(e) =>
                              updateItem(index, "unitCost", e.target.value)
                            }
                            className="border-gray-300 h-10"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <Input
                            value={`₱ ${(
                              (parseInt(item.quantity as string) || 0) *
                              (parseFloat(item.unitCost as string) || 0)
                            ).toLocaleString("en-US", {
                              minimumFractionDigits: 0,
                              maximumFractionDigits: 2,
                            })}`}
                            disabled
                            className="bg-gray-50 border-gray-300 text-gray-700 h-10 font-medium"
                          />
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            type="button"
                            onClick={() => removeItem(index)}
                            className="text-orange-500 hover:text-orange-700 inline-flex items-center justify-center h-10 w-10 hover:bg-orange-50 rounded-lg transition-colors"
                          >
                            <Trash2 className="h-5 w-5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex justify-end mt-6 items-baseline gap-4">
              <span className="text-gray-700 font-semibold">Total Budget:</span>
              <span className="text-3xl font-bold text-gray-900">
                ₱{totalBudget.toLocaleString("en-US", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </span>
            </div>
          </section>

          {/* Timeline Section */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Timeline
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-6">
              <div className="space-y-2">
                <Label className="text-gray-700 font-medium">
                  Start Date <span className="text-red-500">*</span>
                </Label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="h-11 border-gray-300"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-gray-700 font-medium">
                  End Date <span className="text-red-500">*</span>
                </Label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="h-11 border-gray-300"
                />
              </div>
            </div>


          </section>

          {/* Variance Explanation Section */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center gap-2">
              <Info className="h-5 w-5" />
              Variance Explanation
            </h2>

            <div className="space-y-2">
              <Label className="text-gray-700 font-medium">
                Explain any variances from forecast or previous budgets{" "}
                <span className="text-red-500">*</span>
              </Label>
              <Textarea
                placeholder="Explain why this budget differs from forecasted amounts, previous similar projects, or standard costs..."
                value={varianceExplanation}
                onChange={(e) => setVarianceExplanation(e.target.value)}
                className="min-h-[120px] border-gray-300 resize-none p-4"
              />
            </div>
          </section>

          {/* Actions */}
          <div className="flex items-center justify-between pt-4">
            <Button
              type="button"
              className="bg-orange-600 hover:bg-orange-700 text-white h-11 px-6 text-base font-medium"
              onClick={() => router.push("/dashboard/requests")}
              disabled={isSaving}
            >
              Cancel
            </Button>

            <div className="flex items-center gap-4">
              <Button
                type="button"
                variant="outline"
                className="h-11 px-6 text-base font-medium border-gray-300 text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                onClick={() => persistBudget("draft")}
                disabled={isSaving}
              >
                <Save className="h-5 w-5" /> Save as draft
              </Button>

              <Button
                type="button"
                className="bg-green-600 hover:bg-green-700 text-white h-11 px-6 text-base font-medium flex items-center gap-2"
                onClick={() => persistBudget("submit")}
                disabled={isSaving}
              >
                <Send className="h-5 w-5" />{" "}
                {isSaving ? "Submitting…" : "Submit request"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
