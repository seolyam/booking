"use client";

import { useState } from "react";
import {
  createBudgetDraft,
  addBudgetItem,
  submitBudget,
} from "@/actions/budget";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from "./ui/card";
import { Label } from "./ui/label";
import { Plus, Check } from "lucide-react";

// Simplified UI components for the sake of the example if files don't exist
// In a real project, these would be in /components/ui/...

const steps = ["Details", "Line Items", "Variance", "Review"];

export default function CreateBudgetWizard() {
  const [currentStep, setCurrentStep] = useState(0);
  const [budgetId, setBudgetId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Form States
  const [budgetType, setBudgetType] = useState<"capex" | "opex">("opex");
  const [fiscalYear, setFiscalYear] = useState(new Date().getFullYear() + 1);
  type LocalItem = {
    description: string;
    quantity: number;
    unitCost: number;
    quarter: "Q1" | "Q2" | "Q3" | "Q4";
  };
  const [items, setItems] = useState<LocalItem[]>([]); // Local state for items
  const [varianceExplanation, setVarianceExplanation] = useState("");

  // Item Input State
  const [newItem, setNewItem] = useState<LocalItem>({
    description: "",
    quantity: 1,
    unitCost: 0,
    quarter: "Q1",
  });

  const handleCreateDraft = async () => {
    setLoading(true);
    const formData = new FormData();
    formData.append("budgetType", budgetType);
    formData.append("fiscalYear", fiscalYear.toString());

    const result = await createBudgetDraft(null, formData);
    setLoading(false);

    if (result.budgetId) {
      setBudgetId(result.budgetId);
      setCurrentStep(1);
    } else {
      alert("Failed to create draft: " + result.message);
    }
  };

  const handleAddItem = async () => {
    if (!budgetId) return;
    // In a real app, you might optimistically add to list, then sync.
    // Or call server action directly.
    const formData = new FormData();
    formData.append("budgetId", budgetId);
    formData.append("description", newItem.description);
    formData.append("quantity", newItem.quantity.toString());
    formData.append("unitCost", newItem.unitCost.toString());
    formData.append("quarter", newItem.quarter);

    await addBudgetItem(null, formData);

    setItems([...items, { ...newItem }]);
    setNewItem({ description: "", quantity: 1, unitCost: 0, quarter: "Q1" });
  };

  const calculateTotal = () =>
    items.reduce((acc, item) => acc + item.quantity * item.unitCost, 0);

  const handleSubmit = async () => {
    if (!budgetId) return;
    setLoading(true);
    const result = await submitBudget(budgetId, varianceExplanation);
    setLoading(false);
    if (result.message?.includes("submitted")) {
      // Success
      alert("Budget Submitted!");
      // Redirect technically likely handled by action or here
      window.location.href = "/dashboard/budget";
    } else {
      alert(result.message);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-8 flex justify-between items-center">
        {steps.map((step, index) => (
          <div
            key={step}
            className={`flex items-center ${
              index <= currentStep
                ? "text-[#2F5E3D] font-bold"
                : "text-gray-400"
            }`}
          >
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center border-2 mr-2 ${
                index <= currentStep
                  ? "border-[#2F5E3D] bg-[#2F5E3D] text-white"
                  : "border-gray-300"
              }`}
            >
              {index + 1}
            </div>
            {step}
            {index < steps.length - 1 && (
              <div className="h-1 w-12 bg-gray-200 mx-4" />
            )}
          </div>
        ))}
      </div>

      <Card className="bg-white shadow-md rounded-lg">
        <CardHeader>
          <CardTitle>{steps[currentStep]}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* STEP 1: Details */}
          {currentStep === 0 && (
            <div className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="budgetType">Budget Type</Label>
                <select
                  id="budgetType"
                  className="w-full border rounded p-2"
                  value={budgetType}
                  onChange={(e) =>
                    setBudgetType(e.target.value as "capex" | "opex")
                  }
                >
                  <option value="opex">OpEx</option>
                  <option value="capex">CapEx</option>
                </select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="fiscalYear">Fiscal Year</Label>
                <input
                  type="number"
                  id="fiscalYear"
                  className="w-full border rounded p-2"
                  value={fiscalYear}
                  onChange={(e) => setFiscalYear(parseInt(e.target.value))}
                />
              </div>
            </div>
          )}

          {/* STEP 2: Items */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <div className="grid grid-cols-5 gap-2 items-end border p-4 rounded bg-gray-50">
                <div className="col-span-2">
                  <Label className="text-xs">Description</Label>
                  <input
                    className="w-full border p-1 rounded"
                    value={newItem.description}
                    onChange={(e) =>
                      setNewItem({ ...newItem, description: e.target.value })
                    }
                  />
                </div>
                <div>
                  <Label className="text-xs">Qty</Label>
                  <input
                    type="number"
                    className="w-full border p-1 rounded"
                    value={newItem.quantity}
                    onChange={(e) =>
                      setNewItem({
                        ...newItem,
                        quantity: parseInt(e.target.value),
                      })
                    }
                  />
                </div>
                <div>
                  <Label className="text-xs">Unit Cost</Label>
                  <input
                    type="number"
                    className="w-full border p-1 rounded"
                    value={newItem.unitCost}
                    onChange={(e) =>
                      setNewItem({
                        ...newItem,
                        unitCost: parseFloat(e.target.value),
                      })
                    }
                  />
                </div>
                <button
                  onClick={handleAddItem}
                  className="bg-[#2F5E3D] text-white p-2 rounded hover:bg-green-800"
                >
                  <Plus size={16} />
                </button>
              </div>

              <div className="border rounded">
                <table className="w-full text-sm text-left">
                  <thead className="bg-[#2F5E3D] text-white">
                    <tr>
                      <th className="p-2">Desc</th>
                      <th className="p-2">Qty</th>
                      <th className="p-2">Cost</th>
                      <th className="p-2">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, i) => (
                      <tr key={i} className="border-b">
                        <td className="p-2">{item.description}</td>
                        <td className="p-2">{item.quantity}</td>
                        <td className="p-2">{item.unitCost}</td>
                        <td className="p-2">
                          {(item.quantity * item.unitCost).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {items.length === 0 && (
                  <p className="p-4 text-center text-gray-500">
                    No items added.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* STEP 3: Variance */}
          {currentStep === 2 && (
            <div className="space-y-4">
              <p className="font-semibold">
                Total Amount: {calculateTotal().toLocaleString()}
              </p>
              {calculateTotal() > 50000 && (
                <div className="bg-yellow-50 p-4 border border-yellow-200 rounded">
                  <p className="text-yellow-700 font-bold mb-2">
                    High Variance Warning
                  </p>
                  <p className="text-sm mb-2">
                    Total exceeds threshold. Please explain.
                  </p>
                  <textarea
                    className="w-full border p-2 rounded"
                    placeholder="Explain variance..."
                    value={varianceExplanation}
                    onChange={(e) => setVarianceExplanation(e.target.value)}
                  />
                </div>
              )}
              {calculateTotal() <= 50000 && (
                <p className="text-green-600">
                  Budget within normal variance limits.
                </p>
              )}
            </div>
          )}

          {/* STEP 4: Summary */}
          {currentStep === 3 && (
            <div className="space-y-4">
              <h3 className="font-bold text-lg">Review Submission</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <strong>Type:</strong> {budgetType}
                </div>
                <div>
                  <strong>Year:</strong> {fiscalYear}
                </div>
                <div>
                  <strong>Total:</strong> {calculateTotal().toLocaleString()}
                </div>
              </div>
              {varianceExplanation && (
                <div className="text-sm bg-gray-100 p-2 rounded">
                  <strong>Variance Note:</strong> {varianceExplanation}
                </div>
              )}
              <p className="text-gray-500 text-sm">
                Ready to submit to Reviewer?
              </p>
            </div>
          )}
        </CardContent>
        <CardFooter className="flex justify-between">
          <button
            disabled={currentStep === 0}
            onClick={() => setCurrentStep((prev) => prev - 1)}
            className="px-4 py-2 border rounded disabled:opacity-50"
          >
            Back
          </button>

          {currentStep === 0 ? (
            <button
              onClick={handleCreateDraft}
              disabled={loading}
              className="px-4 py-2 bg-[#2F5E3D] text-white rounded"
            >
              {loading ? "Creating Draft..." : "Start Draft"}
            </button>
          ) : currentStep < 3 ? (
            <button
              onClick={() => setCurrentStep((prev) => prev + 1)}
              className="px-4 py-2 bg-[#2F5E3D] text-white rounded"
            >
              Next
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="px-4 py-2 bg-[#2F5E3D] text-white rounded flex items-center gap-2"
            >
              {loading ? (
                "Submitting..."
              ) : (
                <>
                  Submit Budget <Check size={16} />
                </>
              )}
            </button>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}
