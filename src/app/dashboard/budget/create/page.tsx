"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { Bell, Trash2, FolderPlus, Building2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useRouter } from "next/navigation";
import {
  addBudgetItem,
  addBudgetMilestone,
  createBudgetDraft,
  submitBudget,
} from "@/actions/budget";
import {
  createProject,
  generateProjectCode,
  getActiveProjects,
  getBudgetCategories,
  getNextBudgetIdPreview,
} from "@/actions/project";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Project = {
  id: string;
  project_code: string;
  name: string;
  department: string;
  description: string | null;
};

type BudgetCategory = {
  id: string;
  name: string;
  description: string | null;
  allowed_type: "CAPEX" | "OPEX" | "BOTH";
};

export default function CreateBudgetPage() {
  const router = useRouter();

  // Project State
  const [projectMode, setProjectMode] = useState<"new" | "existing" | null>(
    null,
  );
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectCode, setNewProjectCode] = useState("");
  const [newProjectDescription, setNewProjectDescription] = useState("");
  const [isLoadingProjects, setIsLoadingProjects] = useState(false);

  // Budget Type State
  const [budgetType, setBudgetType] = useState<"capex" | "opex" | "">("");
  const [budgetIdPreview, setBudgetIdPreview] = useState<string>("");

  // Categories State
  const [categories, setCategories] = useState<BudgetCategory[]>([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(false);

  // Form State
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [items, setItems] = useState([
    { category: "", description: "", quantity: "", unitCost: "" },
  ]);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [milestone, setMilestone] = useState("");
  const [milestones, setMilestones] = useState<string[]>([]);
  const [varianceExplanation, setVarianceExplanation] = useState("");
  const MAX_MILESTONES = 6;

  // Load projects on mount
  useEffect(() => {
    async function loadProjects() {
      setIsLoadingProjects(true);
      try {
        const result = await getActiveProjects();
        if (result.success && result.projects) {
          setProjects(result.projects as Project[]);
        }
      } catch (e) {
        console.error("Error loading projects:", e);
      } finally {
        setIsLoadingProjects(false);
      }
    }
    loadProjects();
  }, []);

  // Generate project code when new project mode is selected
  useEffect(() => {
    async function loadProjectCode() {
      if (projectMode === "new" && !newProjectCode) {
        try {
          const code = await generateProjectCode();
          setNewProjectCode(code);
        } catch (e) {
          console.error("Error generating project code:", e);
        }
      }
    }
    loadProjectCode();
  }, [projectMode, newProjectCode]);

  // Load categories when budget type changes
  useEffect(() => {
    async function loadCategories() {
      if (!budgetType) {
        setCategories([]);
        return;
      }

      setIsLoadingCategories(true);
      try {
        const result = await getBudgetCategories(budgetType);
        if (result.success && result.categories) {
          setCategories(result.categories as BudgetCategory[]);
        }
      } catch (e) {
        console.error("Error loading categories:", e);
      } finally {
        setIsLoadingCategories(false);
      }
    }
    loadCategories();
  }, [budgetType]);

  // Get budget ID preview when type changes
  useEffect(() => {
    async function loadBudgetIdPreview() {
      if (!budgetType) {
        setBudgetIdPreview("");
        return;
      }

      try {
        const result = await getNextBudgetIdPreview(budgetType);
        if (result.success && result.previewId) {
          setBudgetIdPreview(result.previewId);
        }
      } catch (e) {
        console.error("Error loading budget ID preview:", e);
      }
    }
    loadBudgetIdPreview();
  }, [budgetType]);

  // Clear item categories when budget type changes (since categories are filtered)
  useEffect(() => {
    setItems((prevItems) =>
      prevItems.map((item) => ({ ...item, category: "" })),
    );
  }, [budgetType]);

  const selectedProject = useMemo(() => {
    return projects.find((p) => p.id === selectedProjectId);
  }, [projects, selectedProjectId]);

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

  const addMilestone = () => {
    if (milestones.length >= MAX_MILESTONES) {
      setError(`You can add up to ${MAX_MILESTONES} milestones.`);
      return;
    }
    if (milestone.trim()) {
      setMilestones([...milestones, milestone]);
      setMilestone("");
      setError(null);
    }
  };

  const removeMilestone = (index: number) => {
    setMilestones(milestones.filter((_, i) => i !== index));
  };

  // Sanitize integer-only input (allows empty string while typing)
  const sanitizeInteger = (val: string) => {
    const cleaned = val.replace(/\D/g, "");
    return cleaned;
  };

  // Sanitize currency/decimal input with up to 2 decimals (allows empty string)
  const sanitizeCurrency = (val: string) => {
    // Remove invalid chars, keep digits and first dot
    let cleaned = val.replace(/[^\d.]/g, "");
    const firstDot = cleaned.indexOf(".");
    if (firstDot !== -1) {
      // Keep only first dot
      cleaned =
        cleaned.slice(0, firstDot + 1) +
        cleaned.slice(firstDot + 1).replace(/\./g, "");
      // Limit to 2 decimal places
      const [intPart, decPart] = cleaned.split(".");
      cleaned = intPart + "." + (decPart ?? "").slice(0, 2);
      // Handle leading zeros like ".5" -> "0.5"
      if (cleaned.startsWith(".")) cleaned = "0" + cleaned;
    }
    return cleaned;
  };

  const preventNonNumericKeys: React.KeyboardEventHandler<HTMLInputElement> = (
    e,
  ) => {
    if (["e", "E", "+", "-"].includes(e.key)) {
      e.preventDefault();
    }
  };

  const totalBudget = items.reduce(
    (sum, item) =>
      sum +
      (parseInt(item.quantity as string) || 0) *
        (parseFloat(item.unitCost as string) || 0),
    0,
  );

  const handleProjectModeChange = useCallback((mode: "new" | "existing") => {
    setProjectMode(mode);
    setSelectedProjectId("");
    setNewProjectName("");
    setNewProjectDescription("");
    setError(null);
  }, []);

  const persistBudget = async (mode: "draft" | "submit") => {
    setError(null);

    // Validate project selection
    if (!projectMode) {
      setError("Please select whether this is for a new or existing project.");
      return;
    }

    if (projectMode === "existing" && !selectedProjectId) {
      setError("Please select an existing project.");
      return;
    }

    if (projectMode === "new" && !newProjectName.trim()) {
      setError("Please enter a project name.");
      return;
    }

    // Validate budget type
    if (!budgetType) {
      setError("Please select a Budget Type (CapEx or OpEx).");
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
      let projectId: string | null = null;

      // Create new project if needed
      if (projectMode === "new") {
        const projectFd = new FormData();
        projectFd.set("name", newProjectName.trim());
        projectFd.set("projectCode", newProjectCode);
        if (newProjectDescription.trim()) {
          projectFd.set("description", newProjectDescription.trim());
        }

        const projectRes = await createProject(projectFd);
        if (!projectRes.success || !projectRes.project) {
          setError(projectRes.message ?? "Failed to create project.");
          return;
        }
        projectId = projectRes.project.id;
      } else {
        projectId = selectedProjectId;
      }

      // Create budget draft
      const draftFd = new FormData();
      draftFd.set("budgetType", budgetType);
      draftFd.set("fiscalYear", String(new Date().getFullYear()));
      if (projectId) draftFd.set("projectId", projectId);
      if (startDate) draftFd.set("startDate", startDate);
      if (endDate) draftFd.set("endDate", endDate);

      const draftRes = await createBudgetDraft(null, draftFd);
      if (!draftRes?.budgetId) {
        setError(draftRes?.message ?? "Failed to create budget draft.");
        return;
      }

      const budgetId = draftRes.budgetId;

      // Add budget items
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
        itemFd.set("quarter", "Q1");

        const itemRes = await addBudgetItem(null, itemFd);
        if (itemRes?.message && itemRes.message !== "Item added") {
          setError(itemRes.message);
          return;
        }
      }

      // Save milestones
      for (const milestoneDesc of milestones) {
        const milestoneFd = new FormData();
        milestoneFd.set("budgetId", budgetId);
        milestoneFd.set("description", milestoneDesc.trim());
        milestoneFd.set("targetQuarter", "Q1");

        const milestoneRes = await addBudgetMilestone(null, milestoneFd);
        if (
          milestoneRes?.message &&
          milestoneRes.message !== "Milestone added"
        ) {
          console.error("Failed to add milestone:", milestoneRes.message);
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
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto">
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

      {error && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Phase 1: Project Scope */}
      <section className="mb-8 bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Building2 className="h-5 w-5" /> Project Scope
        </h2>

        <p className="text-gray-600 mb-4">
          Is this budget for a new project or an existing one?
        </p>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <button
            type="button"
            onClick={() => handleProjectModeChange("new")}
            className={`p-4 border-2 rounded-lg text-left transition-all flex items-center gap-3 ${
              projectMode === "new"
                ? "border-green-400 bg-green-50"
                : "border-gray-200 bg-white hover:border-gray-300"
            }`}
          >
            <FolderPlus
              className={`h-6 w-6 ${projectMode === "new" ? "text-green-600" : "text-gray-400"}`}
            />
            <div>
              <div
                className={`font-semibold ${projectMode === "new" ? "text-green-700" : "text-gray-900"}`}
              >
                New Project
              </div>
              <div
                className={`text-sm ${projectMode === "new" ? "text-green-600" : "text-gray-600"}`}
              >
                Create a new project for this budget
              </div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => handleProjectModeChange("existing")}
            className={`p-4 border-2 rounded-lg text-left transition-all flex items-center gap-3 ${
              projectMode === "existing"
                ? "border-blue-400 bg-blue-50"
                : "border-gray-200 bg-white hover:border-gray-300"
            }`}
          >
            <Building2
              className={`h-6 w-6 ${projectMode === "existing" ? "text-blue-600" : "text-gray-400"}`}
            />
            <div>
              <div
                className={`font-semibold ${projectMode === "existing" ? "text-blue-700" : "text-gray-900"}`}
              >
                Existing Project
              </div>
              <div
                className={`text-sm ${projectMode === "existing" ? "text-blue-600" : "text-gray-600"}`}
              >
                Add to an existing project
              </div>
            </div>
          </button>
        </div>

        {/* New Project Form */}
        {projectMode === "new" && (
          <div className="space-y-4 pt-4 border-t border-gray-100">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-gray-700 font-medium mb-2 block">
                  Project Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  placeholder="e.g., Bacolod Substation Rehab"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  className="border-gray-300"
                />
              </div>
              <div>
                <Label className="text-gray-700 font-medium mb-2 block">
                  Project Code
                </Label>
                <Input
                  value={newProjectCode}
                  onChange={(e) => setNewProjectCode(e.target.value)}
                  className="bg-gray-50 border-gray-300"
                  placeholder="Auto-generated"
                />
              </div>
            </div>
            <div>
              <Label className="text-gray-700 font-medium mb-2 block">
                Project Description
              </Label>
              <Textarea
                placeholder="Brief description of the project..."
                value={newProjectDescription}
                onChange={(e) => setNewProjectDescription(e.target.value)}
                className="border-gray-300"
              />
            </div>
          </div>
        )}

        {/* Existing Project Selection */}
        {projectMode === "existing" && (
          <div className="pt-4 border-t border-gray-100">
            <Label className="text-gray-700 font-medium mb-2 block">
              Select Project <span className="text-red-500">*</span>
            </Label>
            <Select
              value={selectedProjectId}
              onValueChange={setSelectedProjectId}
              disabled={isLoadingProjects}
            >
              <SelectTrigger className="border-gray-300">
                <SelectValue
                  placeholder={
                    isLoadingProjects
                      ? "Loading projects..."
                      : "Select a project"
                  }
                />
              </SelectTrigger>
              <SelectContent position="popper" sideOffset={5}>
                {projects.length === 0 ? (
                  <SelectItem value="none" disabled>
                    No projects available
                  </SelectItem>
                ) : (
                  projects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-gray-500">
                          {project.project_code}
                        </span>
                        <span>{project.name}</span>
                      </div>
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>

            {selectedProject && (
              <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-100">
                <div className="text-sm">
                  <span className="font-medium text-blue-800">Selected:</span>{" "}
                  <span className="text-blue-700">{selectedProject.name}</span>
                </div>
                {selectedProject.description && (
                  <p className="text-xs text-blue-600 mt-1">
                    {selectedProject.description}
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </section>

      {/* Phase 2: Budget Type Selection */}
      <section className="mb-8 bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <span>📋</span> Budget Type & Classification
        </h2>

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
            <div className="flex items-center justify-between">
              <div
                className={`font-semibold text-lg ${
                  budgetType === "capex" ? "text-blue-700" : "text-gray-900"
                }`}
              >
                CapEx
              </div>
              {budgetType === "capex" && budgetIdPreview && (
                <span className="text-xs font-mono bg-blue-100 text-blue-700 px-2 py-1 rounded">
                  {budgetIdPreview}
                </span>
              )}
            </div>
            <div
              className={`text-sm mt-1 ${
                budgetType === "capex" ? "text-blue-600" : "text-gray-600"
              }`}
            >
              Capital Expenditure - Long term assets and infrastructure
            </div>
            <div
              className={`text-xs mt-2 ${
                budgetType === "capex" ? "text-blue-500" : "text-gray-400"
              }`}
            >
              Examples: Heavy Machinery, Vehicles, Buildings
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
            <div className="flex items-center justify-between">
              <div
                className={`font-semibold text-lg ${
                  budgetType === "opex" ? "text-purple-700" : "text-gray-900"
                }`}
              >
                OpEx
              </div>
              {budgetType === "opex" && budgetIdPreview && (
                <span className="text-xs font-mono bg-purple-100 text-purple-700 px-2 py-1 rounded">
                  {budgetIdPreview}
                </span>
              )}
            </div>
            <div
              className={`text-sm mt-1 ${
                budgetType === "opex" ? "text-purple-600" : "text-gray-600"
              }`}
            >
              Operating Expenditure - Day-to-day operational costs
            </div>
            <div
              className={`text-xs mt-2 ${
                budgetType === "opex" ? "text-purple-500" : "text-gray-400"
              }`}
            >
              Examples: Office Supplies, Utilities, Subscriptions
            </div>
          </button>
        </div>

        {budgetType && budgetIdPreview && (
          <div className="mt-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Generated ID:</span>
              <span
                className={`font-mono font-semibold ${budgetType === "capex" ? "text-blue-600" : "text-purple-600"}`}
              >
                {budgetIdPreview}
              </span>
            </div>
          </div>
        )}
      </section>

      {/* Cost Items Section */}
      <section className="mb-8 bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
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

        {!budgetType && (
          <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-700">
            Please select a Budget Type above to see available categories.
          </div>
        )}

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
                        disabled={!budgetType || isLoadingCategories}
                      >
                        <SelectTrigger className="border-gray-300 min-w-45">
                          <SelectValue
                            placeholder={
                              isLoadingCategories
                                ? "Loading..."
                                : "Select Category"
                            }
                          />
                        </SelectTrigger>
                        <SelectContent position="popper" sideOffset={5}>
                          {categories.map((cat) => (
                            <SelectItem key={cat.id} value={cat.name}>
                              <div className="flex items-center gap-2">
                                <span>{cat.name}</span>
                                {cat.allowed_type !== "BOTH" && (
                                  <span
                                    className={`text-[10px] px-1.5 py-0.5 rounded ${
                                      cat.allowed_type === "CAPEX"
                                        ? "bg-blue-100 text-blue-700"
                                        : "bg-purple-100 text-purple-700"
                                    }`}
                                  >
                                    {cat.allowed_type}
                                  </span>
                                )}
                              </div>
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
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        min={1}
                        placeholder="0"
                        value={item.quantity}
                        onKeyDown={preventNonNumericKeys}
                        onChange={(e) => {
                          const v = sanitizeInteger(e.target.value);
                          updateItem(index, "quantity", v);
                        }}
                        className="border-gray-300 w-20"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <Input
                        type="text"
                        inputMode="decimal"
                        pattern="^\\d*\\.?\\d{0,2}$"
                        min={0}
                        step="0.01"
                        value={item.unitCost}
                        onKeyDown={preventNonNumericKeys}
                        onChange={(e) => {
                          const v = sanitizeCurrency(e.target.value);
                          updateItem(index, "unitCost", v);
                        }}
                        className="border-gray-300 w-28"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <Input
                        value={`₱ ${(
                          (parseInt(item.quantity as string) || 0) *
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
              ₱
              {totalBudget.toLocaleString("en-US", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Timeline Section */}
      <section className="mb-8 bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <span>📅</span> Timeline
        </h2>

        <div className="grid grid-cols-2 gap-6 mb-6">
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label htmlFor="startDate" className="text-gray-700 font-medium">
                Start Date <span className="text-red-500">*</span>
              </Label>
              <button
                type="button"
                onClick={() => {
                  const today = new Date().toISOString().split("T")[0];
                  setStartDate(today);
                }}
                className="text-xs text-green-600 hover:text-green-700 font-medium hover:underline"
              >
                Set day today
              </button>
            </div>
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
              disabled={milestones.length >= MAX_MILESTONES}
              className={`text-sm font-medium ${
                milestones.length >= MAX_MILESTONES
                  ? "text-gray-400 cursor-not-allowed"
                  : "text-blue-600 hover:text-blue-700"
              }`}
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
          <p className="text-xs text-gray-500 mt-2">
            {milestones.length}/{MAX_MILESTONES} milestones
          </p>
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
      <section className="mb-8 bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
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
            className="border-gray-300 min-h-30"
          />
        </div>
      </section>

      {/* Actions */}
      <div className="flex items-center gap-4 pb-8">
        <Button
          type="button"
          className="bg-orange-600 hover:bg-orange-700 text-white"
          onClick={() => router.push("/dashboard/requests")}
          disabled={isSaving}
        >
          Cancel
        </Button>

        <Button
          type="button"
          variant="outline"
          className="border-gray-300 text-gray-700 hover:bg-gray-50"
          onClick={() => persistBudget("draft")}
          disabled={isSaving}
        >
          📄 Save as draft
        </Button>

        <Button
          type="button"
          className="bg-green-600 hover:bg-green-700 text-white ml-auto"
          onClick={() => persistBudget("submit")}
          disabled={isSaving}
        >
          {isSaving ? "Submitting…" : "✓ Submit request"}
        </Button>
      </div>
    </div>
  );
}
