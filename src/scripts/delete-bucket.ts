
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const projectUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!projectUrl || !serviceKey) {
  throw new Error("Missing Supabase credentials in .env.local");
}

const supabase = createClient(projectUrl, serviceKey);

const BUCKET_TO_DELETE = "id-picture";

async function main() {
  console.log(`Attempting to delete storage bucket: "${BUCKET_TO_DELETE}"...`);

  const { data: buckets, error: listError } = await supabase.storage.listBuckets();
  if (listError) {
    console.error("Error listing buckets:", listError.message);
    return;
  }

  if (!buckets.find((b) => b.name === BUCKET_TO_DELETE)) {
    console.log(`Bucket "${BUCKET_TO_DELETE}" not found. Skipping.`);
    return;
  }

  const { error: deleteError } = await supabase.storage.deleteBucket(BUCKET_TO_DELETE);

  if (deleteError) {
    console.error(`Error deleting bucket: ${deleteError.message}`);
  } else {
    console.log(`Bucket "${BUCKET_TO_DELETE}" deleted successfully.`);
  }
}

main().catch(console.error);
