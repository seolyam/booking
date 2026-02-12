import { getRequestForRating, getRating } from "@/actions/ratings";
import { CATEGORY_MAP } from "@/db/schema";
import { notFound } from "next/navigation";
import { RatingClient } from "./_components/RatingClient";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function RatePage({ params }: Props) {
  const { id } = await params;

  const request = await getRequestForRating(id);
  if (!request) {
    notFound();
  }

  if (request.status !== "resolved") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md w-full text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Rating Not Available</h1>
          <p className="text-gray-500">
            This request has not been resolved yet. Ratings are only available for resolved requests.
          </p>
        </div>
      </div>
    );
  }

  const existingRating = await getRating(id);
  const categoryMeta = CATEGORY_MAP[request.category];

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-12">
      <div className="max-w-lg w-full">
        <div className="rounded-2xl bg-white shadow-sm ring-1 ring-gray-100 p-8">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Rate Your Experience</h1>
            <p className="text-gray-500 text-sm">
              {categoryMeta?.label ?? request.category} &middot; {request.title}
            </p>
          </div>

          {existingRating ? (
            <div className="text-center">
              <div className="flex justify-center gap-1 mb-4">
                {[1, 2, 3, 4, 5].map((star) => (
                  <svg
                    key={star}
                    className={`h-10 w-10 ${star <= existingRating.rating ? "text-yellow-400" : "text-gray-200"}`}
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>
              <p className="text-lg font-semibold text-gray-900 mb-1">Thank you for your feedback!</p>
              <p className="text-sm text-gray-500">
                You rated this request {existingRating.rating} out of 5 stars.
              </p>
              {existingRating.comments && (
                <div className="mt-4 rounded-lg bg-gray-50 p-4 text-left">
                  <p className="text-sm text-gray-600">{existingRating.comments}</p>
                </div>
              )}
            </div>
          ) : (
            <RatingClient requestId={id} requestTitle={request.title} />
          )}
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          Booking System &middot; Your feedback helps us improve
        </p>
      </div>
    </div>
  );
}
