"use client";

import * as React from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const BRANCHES = [
  { value: "bacolod", label: "Negros Power - Bacolod Branch" },
  { value: "dumaguete", label: "Negros Power - Dumaguete Branch" },
  { value: "san-carlos", label: "Negros Power - San Carlos Branch" },
];

export default function LandingBranchCard() {
  const router = useRouter();
  const [branch, setBranch] = React.useState(BRANCHES[0]?.value ?? "");

  return (
    <div className="min-h-dvh bg-[#0B6B4B] flex flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-md flex flex-col items-center">
        <div className="mb-10 flex items-center justify-center">
          <Image
            src="/images/nepc-logo.png"
            alt="Primelectric"
            width={260}
            height={64}
            priority
            className="h-auto w-65 object-contain"
          />
        </div>

        <div className="w-full rounded-2xl bg-[#FFFEF5] shadow-[0_18px_60px_rgba(0,0,0,0.25)] ring-1 ring-black/5 px-10 py-10">
          <div className="text-center">
            <div className="text-2xl font-semibold text-gray-900">
              Choose Branch
            </div>
            <div className="mt-2 text-xs text-gray-500">
              Select the Branch you belong to
            </div>
          </div>

          <div className="mt-6">
            <Select value={branch} onValueChange={setBranch}>
              <SelectTrigger className="h-9 rounded-md border border-gray-300 bg-white text-gray-900">
                <SelectValue placeholder="Select a branch" />
              </SelectTrigger>
              <SelectContent>
                {BRANCHES.map((b) => (
                  <SelectItem key={b.value} value={b.value}>
                    {b.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="mt-6">
            <Button
              type="button"
              className="w-full h-10 bg-[#2E8C2B] hover:bg-[#267623] text-white"
              onClick={() => router.push("/login")}
            >
              Next
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
