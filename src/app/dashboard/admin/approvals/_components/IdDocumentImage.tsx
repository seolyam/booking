
import { createClient } from "@supabase/supabase-js";
import Image from "next/image";

type Props = {
  filePath: string;
};

// This component must be a server component to securely handle signed URLs.
export default async function IdDocumentImage({ filePath }: Props) {
  if (!filePath) return null;

  const projectUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!projectUrl || !serviceKey) {
    console.error("Missing Supabase credentials for signed URL generation.");
    return null;
  }

  const supabase = createClient(projectUrl, serviceKey);

  const { data, error } = await supabase.storage
    .from("id-picture")
    .createSignedUrl(filePath, 60 * 5); // 5 minute expiry

  if (error) {
    console.error("Error creating signed URL:", error.message);
    return (
      <div className="text-sm text-red-600">
        Could not load ID image.
      </div>
    );
  }

  return (
    <div className="relative h-48 w-full overflow-hidden rounded-md border">
      <Image
        src={data.signedUrl}
        alt="ID Document"
        layout="fill"
        objectFit="contain"
        className="transition-transform duration-300 hover:scale-110"
      />
    </div>
  );
}
