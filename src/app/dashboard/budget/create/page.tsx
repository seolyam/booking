"use client";

import { useState } from "react";
import { Bell, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function CreateBudgetPage() {
  const [budgetType, setBudgetType] = useState<"capex" | "opex" | "">("");
  const [items, setItems] = useState([
    { category: "", description: "", quantity: 1, unitCost: 0 },
  ]);

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

  const totalBudget = items.reduce(
    (sum, item) => sum + item.quantity * item.unitCost,
    0
  );

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
              className="mt-2 border-gray-300"
            />
          </div>

          <div>
            <Label className="text-gray-700 font-medium mb-2 block">
              Project ID
            </Label>
            <Input
              value="PROJ-2026-OW232"
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
                          <SelectItem value="equipment">Equipment</SelectItem>
                          <SelectItem value="software">Software</SelectItem>
                          <SelectItem value="services">Services</SelectItem>
                          <SelectItem value="supplies">Supplies</SelectItem>
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
      </section>
    </div>
  );
}
