import { getAuthUser } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import LandingBranchCard from "./_components/LandingBranchCard";

export default async function RootPage() {
  const user = await getAuthUser();

  // If authenticated, redirect straight to the dashboard
  if (user) {
    redirect("/dashboard");
  }

  // Not authenticated - show landing page
  return <LandingBranchCard />;
}
