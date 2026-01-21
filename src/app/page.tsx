import { getAuthUser } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import LandingBranchCard from "./_components/LandingBranchCard";

export default async function RootPage() {
  const user = await getAuthUser();

  // If authenticated, show link to dashboard
  if (user) {
    return (
      <div className="min-h-screen bg-linear-to-br from-[#2F5E3D] to-[#1e3f2a] flex items-center justify-center px-4">
        <div className="text-center space-y-6 max-w-md">
          <h1 className="text-4xl font-bold text-white">Negros Power</h1>
          <p className="text-green-100 text-lg">
            Budget Submission & Approval Tool
          </p>
          <p className="text-green-100">
            You are already signed in. Redirecting to dashboard...
          </p>
          <Link href="/dashboard">
            <Button variant="outline" className="w-full">
              Go to Dashboard
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  // Not authenticated - show landing page
  return <LandingBranchCard />;
}
