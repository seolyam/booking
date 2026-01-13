import CreateBudgetWizard from "@/components/CreateBudgetWizard";

export default function CreateBudgetPage() {
  return (
    <div className="container mx-auto py-10 text-gray-900">
      <h1 className="text-3xl font-bold mb-6 text-gray-900">
        Create New Budget Request
      </h1>
      <p className="text-gray-800 mb-8">
        Follow the steps below to submit your budget for approval. Requests are
        routed to Reviewers (Finance) then Approvers (Management).
      </p>

      <CreateBudgetWizard />
    </div>
  );
}
