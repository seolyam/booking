This error is happening because you added an `onError` property to a Next.js `<Image />` component inside a **Server Component**.

In Next.js (App Router), Server Components render HTML on the server and send it to the browser. They cannot send "functions" (like your `onError` handler) because functions are JavaScript logic that must run in the browser.

Since you are likely inside `src/app/dashboard/admin/approvals/page.tsx` (which fetches your data), you cannot make the whole page a Client Component if it is `async`.

Here is the best way to fix this: **Extract the Image into its own Client Component.**

### Step 1: Create a new component file

Create a new file, for example: `src/components/ui/id-card-image.tsx`.

```tsx
"use client"; // <--- This magic line fixes the error

import { useState } from "react";
import Image from "next/image";

export default function IdCardImage({
  src,
  alt,
}: {
  src: string;
  alt: string;
}) {
  const [error, setError] = useState(false);

  if (error) {
    // Show a fallback placeholder if the image fails
    return (
      <div className="w-[280px] h-[180px] bg-gray-200 flex items-center justify-center rounded text-gray-400 text-sm">
        Image not found
      </div>
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      width={280}
      height={180}
      className="rounded-lg border border-gray-200 object-cover"
      onError={() => setError(true)} // This works now because we are in a Client Component
    />
  );
}
```

### Step 2: Use this component in your Page

Go back to your `src/app/dashboard/admin/approvals/page.tsx` and replace the standard `<Image>` tag with your new component.

```tsx
// 1. Import your new component
import IdCardImage from "@/components/ui/id-card-image";

// ... inside your map loop ...
{
  approvals.map((item) => {
    // ... your existing url logic ...
    const idUrl = `...`;

    return (
      <div key={item.id}>
        {/* 2. Use the component instead of <Image> */}
        {idUrl && (
          <div className="mt-2">
            <p className="text-sm mb-1">ID Document:</p>
            <IdCardImage src={idUrl} alt="User ID" />
          </div>
        )}
      </div>
    );
  });
}
```

### Why this fixes it

- **The Page** remains a **Server Component**, so it can still directly connect to Supabase and fetch your data securely.
- **The Image** becomes a **Client Component**, so the browser can handle the `onError` event if the file is missing or broken.
