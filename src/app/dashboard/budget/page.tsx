import { redirect } from "next/navigation";

export default function BudgetIndexPage() {
  // CreateBudgetWizard currently redirects to /dashboard/budget after submit.
  // Treat that as "Your Requests".
  redirect("/dashboard/requests");
}
