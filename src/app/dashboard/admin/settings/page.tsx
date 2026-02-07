import ChangePasswordForm from "./_components/ChangePasswordForm";

export default function SettingsPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">System Settings</h1>
        <p className="text-sm text-gray-500 mt-1">
          Manage system-wide settings and configurations.
        </p>
      </div>

      <div className="space-y-8 max-w-3xl">
        <ChangePasswordForm />
      </div>
    </div>
  );
}
