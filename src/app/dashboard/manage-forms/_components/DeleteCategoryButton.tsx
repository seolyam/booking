"use client";

import { useTransition, useState } from "react";
import { Trash2 } from "lucide-react";
import { deleteFormConfig } from "@/actions/form-config";
import { useRouter } from "next/navigation";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface DeleteCategoryButtonProps {
    categoryKey: string;
    categoryLabel: string;
    isDefault: boolean;
}

export default function DeleteCategoryButton({
    categoryKey,
    categoryLabel,
    isDefault
}: DeleteCategoryButtonProps) {
    const [isPending, startTransition] = useTransition();
    const [isOpen, setIsOpen] = useState(false);
    const router = useRouter();

    const handleDelete = () => {
        startTransition(async () => {
            try {
                const result = await deleteFormConfig(categoryKey);
                setIsOpen(false);
                router.refresh();

                if (result.isDefault) {
                    alert("Category configuration has been reset to default.");
                }
            } catch (error) {
                console.error("Failed to delete category:", error);
                alert("Failed to delete category. Please try again.");
            }
        });
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <button
                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
                    title={isDefault ? "Reset to Default" : "Delete Category"}
                >
                    <Trash2 className="h-4 w-4" />
                </button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>
                        {isDefault ? "Reset Default Category?" : "Delete Category?"}
                    </DialogTitle>
                    <DialogDescription>
                        {isDefault
                            ? `This will remove any custom configuration for "${categoryLabel}" and revert it to system defaults. The category will still appear in the list.`
                            : `Are you sure you want to delete "${categoryLabel}"? This action cannot be undone.`
                        }
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setIsOpen(false)}>
                        Cancel
                    </Button>
                    <Button
                        variant="destructive"
                        onClick={handleDelete}
                        disabled={isPending}
                    >
                        {isPending ? "Processing..." : (isDefault ? "Reset Configuration" : "Delete Category")}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
