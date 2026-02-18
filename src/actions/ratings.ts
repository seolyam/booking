"use server";

import { db } from "@/db";
import { requestRatings, requests } from "@/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z, ZodError } from "zod";

// ============================================================================
// Schemas
// ============================================================================

const submitRatingSchema = z.object({
  request_id: z.string().uuid("Invalid ticket ID"),
  rating: z.coerce
    .number({ message: "Rating is required" })
    .int("Rating must be a whole number")
    .min(1, "Rating must be 1-5")
    .max(5, "Rating must be 1-5"),
  comments: z.string().max(2000).optional().nullable(),
});

// ============================================================================
// Queries
// ============================================================================

export async function getRating(requestId: string) {
  const rating = await db.query.requestRatings.findFirst({
    where: eq(requestRatings.request_id, requestId),
  });
  return rating ?? null;
}

export async function getRequestForRating(requestId: string) {
  const request = await db.query.requests.findFirst({
    where: eq(requests.id, requestId),
    columns: {
      id: true,
      title: true,
      category: true,
      status: true,
    },
  });
  return request ?? null;
}

// ============================================================================
// Mutations
// ============================================================================

export async function submitRating(formData: {
  request_id: string;
  rating: number;
  comments?: string | null;
}): Promise<{ success: true } | { error: string }> {
  try {
    const parsed = submitRatingSchema.parse(formData);

    // Verify request exists and is resolved
    const request = await db.query.requests.findFirst({
      where: eq(requests.id, parsed.request_id),
    });

    if (!request) {
      return { error: "Request not found" };
    }

    if (request.status !== "resolved") {
      return { error: "Only resolved requests can be rated" };
    }

    // Check if already rated
    const existingRating = await db.query.requestRatings.findFirst({
      where: eq(requestRatings.request_id, parsed.request_id),
    });

    if (existingRating) {
      return { error: "This request has already been rated" };
    }

    await db.insert(requestRatings).values({
      request_id: parsed.request_id,
      rating: parsed.rating,
      comments: parsed.comments ?? null,
    });

    revalidatePath(`/requests/${parsed.request_id}/rate`);

    return { success: true };
  } catch (error) {
    if (error instanceof ZodError) {
      const fieldErrors = error.issues.map((err) => {
        const path = err.path.join(".");
        return `${path}: ${err.message}`;
      });
      return { error: `Validation failed: ${fieldErrors.join(", ")}` };
    }
    throw error;
  }
}
