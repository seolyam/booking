import { createSupabaseServerClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default async function RootPage() {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

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
  return (
    <div className="min-h-screen bg-linear-to-br from-[#2F5E3D] to-[#1e3f2a] flex items-center justify-center px-4">
      <div className="text-center space-y-8 max-w-md">
        <div className="space-y-3">
          <h1 className="text-5xl font-bold text-white">Negros Power</h1>
          <p className="text-green-100 text-xl">
            Budget Submission & Approval Tool
          </p>
        </div>
        <p className="text-green-100 text-lg">
          Streamline your budget approval workflow with our integrated budgeting
          platform.
        </p>
        <div className="flex flex-col gap-3 pt-6">
          <Link href="/login" className="w-full">
            <Button className="w-full" size="lg">
              Sign In
            </Button>
          </Link>
          <p className="text-sm text-green-200">
            No account yet? Contact your administrator.
          </p>
        </div>
      </div>
    </div>
  );
}
