"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { type CategoryMeta, type FormConfig } from "@/db/schema";
import { updateFormConfig } from "@/actions/form-config";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ArrowLeft, Plus, Trash2, Save } from "lucide-react";

export function ConfigForm({
    category,
    initialData,
    defaultPdfs,
}: {
    category: CategoryMeta;
    initialData: FormConfig | null;
    defaultPdfs: string[];
}) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();

    const [isActive, setIsActive] = useState(initialData?.is_active ?? true);
    const [instructions, setInstructions] = useState(initialData?.instructions ?? "");

    // Use DB required_pdfs if available, else default
    const [requiredPdfs, setRequiredPdfs] = useState<string[]>(
        initialData && initialData.required_pdfs ? initialData.required_pdfs : defaultPdfs
    );
    const [newPdf, setNewPdf] = useState("");

    const handleAddPdf = () => {
        if (newPdf.trim()) {
            setRequiredPdfs([...requiredPdfs, newPdf.trim()]);
            setNewPdf("");
        }
    };

    const handleRemovePdf = (index: number) => {
        setRequiredPdfs(requiredPdfs.filter((_, i) => i !== index));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        startTransition(async () => {
            try {
                await updateFormConfig(category.key, {
                    is_active: isActive,
                    required_pdfs: requiredPdfs,
                    instructions: instructions || undefined,
                });
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
                    <h1 className="text-2xl font-bold text-gray-900">{category.label} Configuration</h1>
                    <p className="text-sm text-gray-600">Edit settings for this form type</p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-gray-900 font-bold">General Settings</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="flex items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                                <Label className="text-base text-gray-900 font-semibold">Active Status</Label>
                                <div className="text-sm text-gray-600">
                                    Allow users to create new requests of this type
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <span className={cn(
                                    "px-2.5 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 border",
                                    isActive
                                        ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                                        : "bg-gray-50 text-gray-600 border-gray-200"
                                )}>
                                    {isActive ? "Active" : "Inactive"}
                                </span>
                                <Switch checked={isActive} onCheckedChange={setIsActive} />
                            </div>
                        </div>

                        <div className="space-y-3">
                            <Label className="text-sm font-semibold text-gray-900">Custom Instructions</Label>
                            <Textarea
                                placeholder="Add specific instructions that will appear at the top of the form..."
                                value={instructions}
                                onChange={(e) => setInstructions(e.target.value)}
                                rows={4}
                                className="text-gray-900 min-h-[100px] border-gray-300 focus:border-blue-500"
                            />
                            <p className="text-xs text-gray-600">
                                Optional. These instructions will be displayed to requesters when filling out the form.
                            </p>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-gray-900 font-bold">Required Documents</CardTitle>
                        <CardDescription className="text-gray-500">
                            Define which documents must be uploaded for this request type.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="space-y-4">
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
                            {requiredPdfs.length === 0 && (
                                <p className="text-sm text-gray-500 italic">No required documents defined.</p>
                            )}
                        </div>

                        <div className="flex gap-2 items-end">
                            <div className="flex-1 space-y-2">
                                <Label className="text-sm font-semibold text-gray-900">Add Document Label</Label>
                                <Input
                                    placeholder="e.g. Travel Authority"
                                    value={newPdf}
                                    onChange={(e) => setNewPdf(e.target.value)}
                                    className="text-gray-900 border-gray-300 focus:border-blue-500"
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter") {
                                            e.preventDefault();
                                            handleAddPdf();
                                        }
                                    }}
                                />
                            </div>
                            <Button type="button" onClick={handleAddPdf} variant="outline">
                                <Plus className="h-4 w-4" /> Add
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                <div className="flex justify-end gap-4">
                    <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
                    <Button type="submit" disabled={isPending} className="bg-blue-600 hover:bg-blue-700">
                        {isPending ? "Saving..." : <><Save className="h-4 w-4 mr-2" /> Save Changes</>}
                    </Button>
                </div>
            </form>
        </div>
    );
}
