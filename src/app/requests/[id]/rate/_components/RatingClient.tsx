"use client";

import { useState, useTransition } from "react";
import { submitRating } from "@/actions/ratings";

// ---------------------------------------------------------------------------
// Star component
// ---------------------------------------------------------------------------

function Star({
  filled,
  hovered,
  onClick,
  onHover,
  onLeave,
}: {
  filled: boolean;
  hovered: boolean;
  onClick: () => void;
  onHover: () => void;
  onLeave: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
      className="transition-transform hover:scale-110 focus:outline-none"
    >
      <svg
        className={`h-12 w-12 transition-colors ${
          filled || hovered ? "text-yellow-400" : "text-gray-200 hover:text-yellow-300"
        }`}
        fill="currentColor"
        viewBox="0 0 20 20"
      >
        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
      </svg>
    </button>
  );
}

// ---------------------------------------------------------------------------
// Rating labels
// ---------------------------------------------------------------------------

const RATING_LABELS: Record<number, string> = {
  1: "Poor",
  2: "Fair",
  3: "Good",
  4: "Very Good",
  5: "Excellent",
};

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function RatingClient({
  requestId,
  requestTitle,
}: {
  requestId: string;
  requestTitle: string;
}) {
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [comments, setComments] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isPending, startTransition] = useTransition();

  const displayRating = hoveredRating || rating;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (rating === 0) {
      setError("Please select a rating");
      return;
    }

    startTransition(async () => {
      const result = await submitRating({
        request_id: requestId,
        rating,
        comments: comments.trim() || null,
      });

      if ("error" in result) {
        setError(result.error);
        return;
      }

      setSuccess(true);
    });
  }

  if (success) {
    return (
      <div className="text-center">
        <div className="flex justify-center gap-1 mb-4">
          {[1, 2, 3, 4, 5].map((star) => (
            <svg
              key={star}
              className={`h-10 w-10 ${star <= rating ? "text-yellow-400" : "text-gray-200"}`}
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
          ))}
        </div>
        <p className="text-lg font-semibold text-gray-900 mb-1">Thank you for your feedback!</p>
        <p className="text-sm text-gray-500">
          You rated &quot;{requestTitle}&quot; {rating} out of 5 stars.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-700 ring-1 ring-red-200">
          {error}
        </div>
      )}

      {/* Star Rating */}
      <div className="text-center">
        <div className="flex justify-center gap-2 mb-2">
          {[1, 2, 3, 4, 5].map((star) => (
            <Star
              key={star}
              filled={star <= rating}
              hovered={star <= hoveredRating}
              onClick={() => setRating(star)}
              onHover={() => setHoveredRating(star)}
              onLeave={() => setHoveredRating(0)}
            />
          ))}
        </div>
        <p className="text-sm font-medium text-gray-600 h-5">
          {displayRating > 0 ? RATING_LABELS[displayRating] : "Select a rating"}
        </p>
      </div>

      {/* Comments */}
      <div className="space-y-2">
        <label htmlFor="rating-comments" className="text-sm font-medium text-gray-700">
          Comments (optional)
        </label>
        <textarea
          id="rating-comments"
          value={comments}
          onChange={(e) => setComments(e.target.value)}
          placeholder="Tell us about your experience..."
          rows={4}
          maxLength={2000}
          className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all resize-none"
        />
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={isPending || rating === 0}
        className="w-full rounded-lg bg-[#358334] px-4 py-3 text-sm font-semibold text-white hover:bg-[#2F5E3D] transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isPending ? "Submitting..." : "Submit Rating"}
      </button>
    </form>
  );
}
