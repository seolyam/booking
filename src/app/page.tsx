import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/supabase/server";

export default async function Home() {
  const user = await getAuthUser();

  if (user) {
    redirect("/dashboard");
  } else {
    redirect("/login");
  }
}
