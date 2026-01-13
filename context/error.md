./src/app/dashboard/admin/approvals/page.tsx:160:31
Type error: Type '() => Promise<{ error: string; success?: undefined; } | { success: boolean; error?: undefined; }>' is not assignable to type 'string | ((formData: FormData) => void | Promise<void>) | undefined'.
Type '() => Promise<{ error: string; success?: undefined; } | { success: boolean; error?: undefined; }>' is not assignable to type '(formData: FormData) => void | Promise<void>'.  
 Type 'Promise<{ error: string; success?: undefined; } | { success: boolean; error?: undefined; }>' is not assignable to type 'void | Promise<void>'.
Type 'Promise<{ error: string; success?: undefined; } | { success: boolean; error?: undefined; }>' is not assignable to type 'Promise<void>'.
Type '{ error: string; success?: undefined; } | { success: boolean; error?: undefined; }' is not assignable to type 'void'.
Type '{ error: string; success?: undefined; }' is not assignable to type 'void'.

158 | {u.approval_status === "pending" && (
159 | <div className="flex gap-3 pt-2">

> 160 | <form action={approveUser.bind(null, u.id)}>

      |                               ^

161 | <Button
162 | type="submit"
163 | className="bg-green-600 hover:bg-green-700"
Next.js build worker exited with code: 1 and signal: null
 ELIFECYCLE  Command failed with exit code 1.
