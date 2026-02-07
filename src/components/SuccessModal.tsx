"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CheckCircle2 } from "lucide-react";

type SuccessModalProps = {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: string;
  buttonText?: string;
};

export default function SuccessModal({
  isOpen,
  onClose,
  title,
  message,
  buttonText = "Done",
}: SuccessModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="flex flex-col items-center text-center">
            <div className="p-3 bg-green-100 rounded-full mb-3">
                <CheckCircle2 className="h-8 w-8 text-green-600" />
            </div>
          <DialogTitle className="text-xl font-bold">{title}</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-center text-gray-500 -mt-2 mb-4">{message}</p>
        <DialogFooter className="sm:justify-center">
          <Button type="button" onClick={onClose} className="w-full sm:w-auto">
            {buttonText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
