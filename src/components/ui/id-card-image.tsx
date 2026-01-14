"use client";

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
      onError={() => setError(true)}
      priority
    />
  );
}
