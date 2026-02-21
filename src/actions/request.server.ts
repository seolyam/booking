import { db } from "@/db";
import { requests } from "@/db/schema";
import { eq } from "drizzle-orm";
import { updateRequestStatus } from "./request";

/**
 * Gets a single request by ID with all details for the detail page (attachments, comments, activityLogs, etc.)
 */
export async function getRequestById(id: string) {
  // Drizzle supports 'with' for relations
  const request = await db.query.requests.findFirst({
    where: eq(requests.id, id),
    with: {
      requester: true,
      branch: true,
      attachments: true,
      comments: {
        with: {
          user: true
        }
      },
      activityLogs: {
        with: {
          actor: true
        }
      }
    },
  });
  return request;
}

// Re-export updateRequestStatus for consumer
export { updateRequestStatus };
