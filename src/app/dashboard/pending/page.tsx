import { signOut } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function PendingApprovalPage() {
  return (
    <div className="min-h-[calc(100vh-2rem)] flex items-center justify-center p-6">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle className="text-gray-900">Application pending</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-gray-800">
          <p>
            Your account application is waiting for admin approval. You’ll be
            able to access the dashboard once it’s approved.
          </p>
          <form action={signOut}>
            <Button type="submit" variant="outline">
              Sign out
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
