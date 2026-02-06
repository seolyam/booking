
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const projectUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!projectUrl || !serviceKey) {
  throw new Error("Missing Supabase credentials in .env.local");
}

const supabase = createClient(projectUrl, serviceKey);

const BUCKET_TO_CREATE = { name: "id-picture", isPublic: false };

async function main() {
  console.log(`Checking and creating storage bucket: "${BUCKET_TO_CREATE.name}"...`);

  const { data: existingBuckets, error: listError } =
    await supabase.storage.listBuckets();

  if (listError) {
    console.error("Error listing existing buckets:", listError.message);
    process.exit(1);
  }

  const alreadyExists = existingBuckets.some(b => b.name === BUCKET_TO_CREATE.name);

  if (alreadyExists) {
    console.log(`- Bucket "${BUCKET_TO_CREATE.name}" already exists. Skipping.`);
  } else {
    console.log(`- Creating bucket "${BUCKET_TO_CREATE.name}" (public: ${BUCKET_TO_CREATE.isPublic})...`);
    const { error } = await supabase.storage.createBucket(BUCKET_TO_CREATE.name, {
      public: BUCKET_TO_CREATE.isPublic,
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
