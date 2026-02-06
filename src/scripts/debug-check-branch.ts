
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

import { db } from "@/db";
import { branches } from "@/db/schema";
import { eq } from "drizzle-orm";

async function main() {
  const branchId = "19f88c29-a39b-4adc-817e-f351ae419be6";
  console.log(`Checking for branch ID: ${branchId}`);
  
  const branch = await db.query.branches.findFirst({
    where: eq(branches.id, branchId),
  });

  if (branch) {
    console.log("Branch found:", branch);
  } else {
    console.log("Branch NOT found.");
  }
  
  // Also list all branches to see what we have
  const allBranches = await db.query.branches.findMany();
  console.log("Total branches:", allBranches.length);
  allBranches.forEach(b => console.log(`- ${b.name} (${b.id})`));
}

main().catch(console.error).finally(() => process.exit(0));
