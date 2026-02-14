"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { type FormConfig } from "@/db/schema";
import { updateFormConfig, createFormConfig } from "@/actions/form-config";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ArrowLeft, Plus, Trash2, Save, GripVertical } from "lucide-react";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

export type FieldDefinition = {
    id: string;
    label: string;
    type: "text" | "number" | "textarea" | "date" | "select" | "email" | "checkbox" | "time";
    required: boolean;
    enabled: boolean;
    options?: string[]; // comma separated for simple editing
    placeholder?: string;
    description?: string;
};

export function FormBuilder({
    initialData,
    mode = "create",
}: {
    initialData?: Partial<FormConfig>;
    mode?: "create" | "edit";
}) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();

    // Basic Info
    const [categoryKey, setCategoryKey] = useState(initialData?.category_key ?? "");
    const [categoryLabel, setCategoryLabel] = useState(initialData?.category_label ?? "");
    const [description, setDescription] = useState(initialData?.description ?? "");
    const [iconKey, setIconKey] = useState(initialData?.icon_key ?? "FileText");

    // Config
    const [isActive, setIsActive] = useState(initialData?.is_active ?? true);
    const [instructions, setInstructions] = useState(initialData?.instructions ?? "");
    const [requiredPdfs, setRequiredPdfs] = useState<string[]>(initialData?.required_pdfs ?? []);

    // Initialize fields converting from DB format (name, options obj) to UI format (id, options string[])
    const [fields, setFields] = useState<FieldDefinition[]>(() => {
        const rawFields = (initialData?.fields as any[]) ?? [];
        return rawFields.map((f: any) => ({
            id: f.name || f.id || `field_${Math.random().toString(36).substr(2, 9)}`,
            label: f.label,
            type: f.type,
            required: f.required,
            enabled: f.enabled !== false, // default true
            options: Array.isArray(f.options) && typeof f.options[0] === 'object'
                ? f.options.map((o: any) => o.value)
                : (f.options ?? []),
            placeholder: f.placeholder,
            description: f.description
        }));
    });

    // Helper states
    const [newPdf, setNewPdf] = useState("");

    // PDFs Handlers
    const handleAddPdf = () => {
        if (newPdf.trim()) {
            setRequiredPdfs([...requiredPdfs, newPdf.trim()]);
            setNewPdf("");
        }
    };
    const handleRemovePdf = (index: number) => {
        setRequiredPdfs(requiredPdfs.filter((_, i) => i !== index));
    };

    // Fields Handlers
    const handleAddField = () => {
        const newField: FieldDefinition = {
            id: `field_${Date.now()}`,
            label: "New Field",
            type: "text",
            required: false,
            enabled: true,
        };
        setFields([...fields, newField]);
    };

    const handleUpdateField = (index: number, updates: Partial<FieldDefinition>) => {
        const newFields = [...fields];
        newFields[index] = { ...newFields[index], ...updates };
        setFields(newFields);
    };

    const handleRemoveField = (index: number) => {
        setFields(fields.filter((_, i) => i !== index));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!categoryKey.trim()) {
            alert("Category Key is required");
            return;
        }

        startTransition(async () => {
            // Transform fields for DB: id -> name, options string[] -> object[]
            const fieldsToSave = fields.map(f => ({
                name: f.id,
                label: f.label,
                type: f.type,
                required: f.required,
                enabled: f.enabled,
                placeholder: f.placeholder,
                description: f.description,
                options: f.options ? f.options.map(o => ({ label: o, value: o })) : undefined
            }));

            try {
                const data = {
                    category_label: categoryLabel,
                    description,
                    icon_key: iconKey,
                    is_active: isActive,
                    required_pdfs: requiredPdfs,
                    instructions,
                    fields: fieldsToSave,
                };

                if (mode === "create") {
                    await createFormConfig({
                        category_key: categoryKey.toLowerCase().replace(/\s+/g, "_"),
                        ...data,
                    });
                } else {
                    await updateFormConfig(categoryKey, data);
                }

                router.refresh();
                router.push("/dashboard/manage-forms");
            } catch (error) {
                console.error(error);
                alert("Failed to save configuration");
            }
        });
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6 p-4">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={() => router.back()}>
                    <ArrowLeft className="h-4 w-4" />
                </Button>
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">
                        {mode === "create" ? "Create New Form" : `Edit ${categoryLabel || categoryKey}`}
                    </h1>
                    <p className="text-sm text-gray-600">Configure form fields and requirements</p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Basic Info - Only editable on create or specific fields */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-gray-900 font-bold">General Information</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="text-gray-900 font-medium">Form ID (Key)</Label>
                                <Input
                                    value={categoryKey}
                                    onChange={(e) => setCategoryKey(e.target.value)}
                                    disabled={mode === "edit"}
                                    placeholder="e.g. travel_request"
                                    className="font-mono text-sm border-gray-300"
                                />
                                <p className="text-xs text-gray-500">Unique identifier used in database (snake_case).</p>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-gray-900 font-medium">Form Name</Label>
                                <Input
                                    value={categoryLabel}
                                    onChange={(e) => setCategoryLabel(e.target.value)}
                                    placeholder="e.g. Travel Request"
                                    className="border-gray-300"
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-gray-900 font-medium">Description</Label>
                            <Textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="Brief description of this form..."
                                className="border-gray-300"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-gray-900 font-medium">Icon Key (Lucide)</Label>
                            <Input
                                value={iconKey}
                                onChange={(e) => setIconKey(e.target.value)}
                                placeholder="e.g. FileText"
                                className="border-gray-300 font-mono text-sm"
                            />
                            <p className="text-xs text-gray-500">Component name from Lucide React icons.</p>
                        </div>
                        <div className="flex items-center justify-between rounded-lg border p-4 bg-gray-50/50">
                            <div className="space-y-0.5">
                                <Label className="text-base text-gray-900 font-semibold">Active Status</Label>
                                <div className="text-sm text-gray-600">
                                    Enable or disable this form for new requests
                                </div>
                            </div>
                            <Switch checked={isActive} onCheckedChange={setIsActive} />
                        </div>
                    </CardContent>
                </Card>

                {/* Field Editor */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                            <CardTitle className="text-gray-900 font-bold">Form Fields</CardTitle>
                            <CardDescription>Define what data requesters need to provide.</CardDescription>
                        </div>
                        <Button type="button" onClick={handleAddField} size="sm" className="bg-blue-600 text-white hover:bg-blue-700">
                            <Plus className="h-4 w-4 mr-2" /> Add Field
                        </Button>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {fields.length === 0 ? (
                            <div className="text-center py-8 text-gray-500 border-2 border-dashed rounded-lg">
                                No fields added yet. Click "Add Field" to start.
                            </div>
                        ) : (
                            fields.map((field, index) => (
                                <div key={index} className={cn("border rounded-lg p-4 space-y-4 bg-white", !field.enabled && "opacity-60 bg-gray-50")}>
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="grid grid-cols-12 gap-4 w-full">
                                            {/* Drag Handle (Visual only for now) */}
                                            <div className="col-span-1 flex items-center justify-center pt-3 cursor-move text-gray-400">
                                                <GripVertical className="h-5 w-5" />
                                            </div>

                                            <div className="col-span-11 grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div className="space-y-2">
                                                    <Label className="text-xs text-gray-500">Label</Label>
                                                    <Input
                                                        value={field.label}
                                                        onChange={(e) => handleUpdateField(index, { label: e.target.value })}
                                                        placeholder="Field Label"
                                                        className="h-9 border-gray-300"
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label className="text-xs text-gray-500">Field ID (Name)</Label>
                                                    <Input
                                                        value={field.id}
                                                        onChange={(e) => handleUpdateField(index, { id: e.target.value })}
                                                        placeholder="field_id"
                                                        className="h-9 font-mono text-xs border-gray-300"
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label className="text-xs text-gray-500">Type</Label>
                                                    <Select
                                                        value={field.type}
                                                        onValueChange={(val: any) => handleUpdateField(index, { type: val })}
                                                    >
                                                        <SelectTrigger className="h-9 border-gray-300">
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="text">Text Input</SelectItem>
                                                            <SelectItem value="number">Number</SelectItem>
                                                            <SelectItem value="textarea">Text Area</SelectItem>
                                                            <SelectItem value="date">Date Picker</SelectItem>
                                                            <SelectItem value="select">Dropdown Select</SelectItem>
                                                            <SelectItem value="time">Time Picker</SelectItem>
                                                            <SelectItem value="email">Email</SelectItem>
                                                            <SelectItem value="checkbox">Checkbox</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </div>

                                                {/* Options for Select */}
                                                {field.type === "select" && (
                                                    <div className="space-y-2">
                                                        <Label className="text-xs text-gray-500">Options (comma separated)</Label>
                                                        <Input
                                                            value={field.options?.join(",") || ""}
                                                            onChange={(e) => handleUpdateField(index, { options: e.target.value.split(",").map(s => s.trim()) })}
                                                            placeholder="Option A, Option B"
                                                            className="h-9 border-gray-300"
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex flex-col gap-2">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                                                onClick={() => handleRemoveField(index)}
                                                type="button"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-6 pl-12 pt-2 border-t border-gray-100">
                                        <div className="flex items-center gap-2">
                                            <Switch
                                                checked={field.required}
                                                onCheckedChange={(c) => handleUpdateField(index, { required: c })}
                                                id={`req-${index}`}
                                            />
                                            <Label htmlFor={`req-${index}`} className="text-sm font-medium text-gray-700">Required</Label>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Switch
                                                checked={field.enabled}
                                                onCheckedChange={(c) => handleUpdateField(index, { enabled: c })}
                                                id={`en-${index}`}
                                            />
                                            <Label htmlFor={`en-${index}`} className="text-sm font-medium text-gray-700">Include in Form</Label>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </CardContent>
                </Card>

                {/* Instructions & Required Docs */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-gray-900 font-bold">Requirements & Instructions</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="space-y-3">
                            <Label className="text-sm font-semibold text-gray-900">Custom Instructions</Label>
                            <Textarea
                                placeholder="Add specific instructions that will appear at the top of the form..."
                                value={instructions}
                                onChange={(e) => setInstructions(e.target.value)}
                                rows={4}
                                className="border-gray-300"
                            />
                        </div>

                        <div className="space-y-4">
                            <Label className="text-sm font-semibold text-gray-900">Required Documents</Label>
                            <div className="space-y-2">
                                {requiredPdfs.map((pdf, idx) => (
                                    <div key={idx} className="flex items-center gap-2 bg-gray-50 p-2 rounded border border-gray-200">
                                        <span className="flex-1 text-sm font-medium text-gray-900">{pdf}</span>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleRemovePdf(idx)}
                                            className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                            <div className="flex gap-2 items-center">
                                <Input
                                    placeholder="Add document label..."
                                    value={newPdf}
                                    onChange={(e) => setNewPdf(e.target.value)}
                                    className="border-gray-300"
                                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddPdf())}
                                />
                                <Button type="button" onClick={handleAddPdf} variant="outline">
                                    <Plus className="h-4 w-4" /> Add
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Actions */}
                <div className="flex justify-end gap-4 pb-10">
                    <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
                    <Button type="submit" disabled={isPending} className="bg-blue-600 hover:bg-blue-700 text-white min-w-[150px]">
                        {isPending ? "Saving..." : <><Save className="h-4 w-4 mr-2" /> Save Form</>}
                    </Button>
                </div>
            </form>
        </div>
    );
}
