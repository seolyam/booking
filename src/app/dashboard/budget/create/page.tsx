"use client";

import { useState, useRef } from "react";
import { Bell, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function CreateBudgetPage() {
  const timelineRef = useRef<HTMLDivElement>(null);
  const [budgetType, setBudgetType] = useState<"capex" | "opex" | "">("");
  const [projectTitle, setProjectTitle] = useState("");
  const [items, setItems] = useState([
    { category: "", description: "", quantity: 1, unitCost: 0 },
  ]);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [milestone, setMilestone] = useState("");
  const [milestones, setMilestones] = useState<string[]>([]);
  const [varianceExplanation, setVarianceExplanation] = useState("");

  // Generate unique Project ID
  const generateProjectId = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const random = Math.random().toString(36).substring(2, 7).toUpperCase();
    return `PROJ-${year}${month}-${random}`;
  };

  const projectId = generateProjectId();

  const addItem = () => {
    setItems([
      ...items,
      { category: "", description: "", quantity: 1, unitCost: 0 },
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

  const addMilestone = () => {
    if (milestone.trim()) {
      setMilestones([...milestones, milestone]);
      setMilestone("");
    }
  };

  const removeMilestone = (index: number) => {
    setMilestones(milestones.filter((_, i) => i !== index));
  };

  const totalBudget = items.reduce(
    (sum, item) => sum + item.quantity * item.unitCost,
    0
  );

  const scrollToTimeline = () => {
    timelineRef.current?.scrollIntoView({ behavior: "smooth" });
  };

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

  return (
    <div className="w-full">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-4xl font-bold text-gray-900">
            Create Budget Request
          </h1>
          <p className="text-gray-600 mt-2">
            Fill in the details below to create your budget request
          </p>
        </div>
        <Bell className="h-6 w-6 text-gray-400" />
      </div>
      {/* Project Information Section */}
      <section className="mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <span>📋</span> Project Information
        </h2>

        <div className="grid grid-cols-2 gap-6">
          <div>
            <Label
              htmlFor="projectTitle"
              className="text-gray-700 font-medium mb-2 block"
            >
              Project Title <span className="text-red-500">*</span>
            </Label>
            <Input
              id="projectTitle"
              placeholder="Enter project name"
              value={projectTitle}
              onChange={(e) => setProjectTitle(e.target.value)}
              className="mt-2 border-gray-300"
            />
          </div>

          <div>
            <Label className="text-gray-700 font-medium mb-2 block">
              Project ID
            </Label>
            <Input
              value={projectId}
              disabled
              className="mt-2 bg-gray-50 border-gray-300 text-gray-600"
            />
          </div>
        </div>

        {/* Budget Type */}
        <div className="mt-6">
          <Label className="text-gray-700 font-medium mb-3 block">
            Budget Type <span className="text-red-500">*</span>
          </Label>
          <div className="grid grid-cols-2 gap-4">
            {/* CapEx */}
            <button
              type="button"
              onClick={() => setBudgetType("capex")}
              className={`p-4 border-2 rounded-lg text-left transition-all ${
                budgetType === "capex"
                  ? "border-blue-400 bg-blue-50"
                  : "border-gray-200 bg-white hover:border-gray-300"
              }`}
            >
              <div
                className={`font-semibold ${
                  budgetType === "capex" ? "text-blue-700" : "text-gray-900"
                }`}
              >
                CapEx
              </div>
              <div
                className={`text-sm mt-1 ${
                  budgetType === "capex" ? "text-blue-600" : "text-gray-600"
                }`}
              >
                Capital Expenditure - Long term assets and infrastructure
              </div>
            </button>

            {/* OpEx */}
            <button
              type="button"
              onClick={() => setBudgetType("opex")}
              className={`p-4 border-2 rounded-lg text-left transition-all ${
                budgetType === "opex"
                  ? "border-purple-400 bg-purple-50"
                  : "border-gray-200 bg-white hover:border-gray-300"
              }`}
            >
              <div
                className={`font-semibold ${
                  budgetType === "opex" ? "text-purple-700" : "text-gray-900"
                }`}
              >
                OpEx
              </div>
              <div
                className={`text-sm mt-1 ${
                  budgetType === "opex" ? "text-purple-600" : "text-gray-600"
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

        {/* Cost Items Table */}
        <div className="border border-gray-200 rounded-lg overflow-hidden">
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
                {items.map((item, index) => (
                  <tr
                    key={index}
                    className="border-b border-gray-200 hover:bg-gray-50"
                  >
                    <td className="px-4 py-3">
                      <Select
                        value={item.category}
                        onValueChange={(val) =>
                          updateItem(index, "category", val)
                        }
                      >
                        <SelectTrigger className="border-gray-300">
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
                        className="border-gray-300"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <Input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) =>
                          updateItem(
                            index,
                            "quantity",
                            parseInt(e.target.value) || 1
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
                          updateItem(
                            index,
                            "unitCost",
                            parseFloat(e.target.value) || 0
                          )
                        }
                        className="border-gray-300 w-24"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <Input
                        value={`₱ ${(item.quantity * item.unitCost).toFixed(
                          2
                        )}`}
                        disabled
                        className="bg-gray-50 border-gray-300 text-gray-700 w-28"
                      />
                    </td>
                    <td className="px-4 py-3 text-center">
                      {items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeItem(index)}
                          className="text-red-500 hover:text-red-700 inline-flex"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
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
              ₱{totalBudget.toFixed(2)}
            </div>
          </div>
        </div>

        {/* Next Button */}
        <div className="flex justify-end mt-6">
          <Button
            type="button"
            onClick={scrollToTimeline}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            Next →
          </Button>
        </div>
      </section>
      {/* Timeline Section */}
      <section ref={timelineRef} className="mb-8 pt-8 scroll-mt-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <span>📅</span> Timeline
        </h2>

        <div className="grid grid-cols-2 gap-6 mb-6">
          <div>
            <Label
              htmlFor="startDate"
              className="text-gray-700 font-medium mb-2 block"
            >
              Start Date <span className="text-red-500">*</span>
            </Label>
            <Input
              id="startDate"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="border-gray-300"
            />
          </div>

          <div>
            <Label
              htmlFor="endDate"
              className="text-gray-700 font-medium mb-2 block"
            >
              End Date <span className="text-red-500">*</span>
            </Label>
            <Input
              id="endDate"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="border-gray-300"
            />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <Label className="text-gray-700 font-medium">Milestone</Label>
            <button
              type="button"
              onClick={addMilestone}
              className="text-blue-600 hover:text-blue-700 text-sm font-medium"
            >
              + Add milestone
            </button>
          </div>
          <Input
            placeholder="e.g., Equipment Procurement - Q1"
            value={milestone}
            onChange={(e) => setMilestone(e.target.value)}
            className="border-gray-300"
          />
          {milestones.length > 0 && (
            <div className="mt-3 space-y-2">
              {milestones.map((m, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between bg-gray-50 p-2 rounded border border-gray-200"
                >
                  <span className="text-gray-700">{m}</span>
                  <button
                    type="button"
                    onClick={() => removeMilestone(idx)}
                    className="text-red-500 hover:text-red-700"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
      {/* Variance Explanation Section */}
      <section className="mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <span>ⓘ</span> Variance Explanation
        </h2>

        <div>
          <Label className="text-gray-700 font-medium mb-2 block">
            Explain any variances from forecast or previous budgets{" "}
            <span className="text-red-500">*</span>
          </Label>
          <Textarea
            placeholder="Explain why this budget differs from forecasted amounts, previous similar projects, or standard costs..."
            value={varianceExplanation}
            onChange={(e) => setVarianceExplanation(e.target.value)}
            className="border-gray-300 min-h-[120px]"
          />
        </div>
      </section>
      {/* Actions */}
      <div className="flex items-center gap-4">
        <Button
          type="button"
          className="bg-orange-600 hover:bg-orange-700 text-white"
        >
          Cancel
        </Button>

        <Button
          type="button"
          variant="outline"
          className="border-gray-300 text-gray-700 hover:bg-gray-50"
        >
          📄 Save as draft
        </Button>

        <Button
          type="button"
          className="bg-green-600 hover:bg-green-700 text-white ml-auto"
        >
          ✓ Submit request
        </Button>
      </div>{" "}
    </div>
  );
}
