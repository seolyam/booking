
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const projectUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!projectUrl || !serviceKey) {
  throw new Error("Missing Supabase credentials in .env.local");
}

const supabase = createClient(projectUrl, serviceKey);

const BUCKETS = [
  { name: "id-documents", isPublic: false },
  { name: "attachments", isPublic: true },
];

async function main() {
  console.log("Checking and creating storage buckets...");

  const { data: existingBuckets, error: listError } =
    await supabase.storage.listBuckets();

  if (listError) {
    console.error("Error listing existing buckets:", listError.message);
    process.exit(1);
  }

  const existingNames = existingBuckets.map((b) => b.name);
  console.log("Existing buckets:", existingNames.join(", ") || "None");

  for (const bucket of BUCKETS) {
    if (existingNames.includes(bucket.name)) {
      console.log(`- Bucket "${bucket.name}" already exists. Skipping.`);
      continue;
    }

    console.log(`- Creating bucket "${bucket.name}" (public: ${bucket.isPublic})...`);
    const { error } = await supabase.storage.createBucket(bucket.name, {
      public: bucket.isPublic,
    });

    if (error) {
      console.error(`  Error creating bucket: ${error.message}`);
    } else {
      console.log(`  Bucket created successfully.`);
    }
  }

  console.log("\nBucket setup complete.");
}

main().catch(console.error);
