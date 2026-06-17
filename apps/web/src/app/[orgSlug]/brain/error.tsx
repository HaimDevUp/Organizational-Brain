"use client";

import { PageError } from "@/components/ui/page-error";

export default function BrainError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <PageError
      title="Brain chat unavailable"
      message={error.message || "Please try again in a moment."}
      onRetry={reset}
    />
  );
}
