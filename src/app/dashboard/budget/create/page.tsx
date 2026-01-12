import CreateBudgetWizard from '@/components/CreateBudgetWizard';

export default function CreateBudgetPage() {
  return (
    <div className="container mx-auto py-10">
      <h1 className="text-3xl font-bold mb-6">Create New Budget Request</h1>
      <p className="text-gray-500 mb-8">
        Follow the steps below to submit your budget for approval. 
        Requests are routed to Reviewers (Finance) then Approvers (Management).
      </p>
      
      <CreateBudgetWizard />
    </div>
  );
}
