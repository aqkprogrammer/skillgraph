"use client";

import { useEffect } from "react";

import { Container } from "@/components/ui";

/**
 * The last-resort error boundary.
 *
 * Next passes the error object here, but it is deliberately not rendered — an
 * unexpected failure could carry internal detail. The user gets a sentence and
 * a retry; the detail is already in the server log.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[skillgraph] client boundary caught:", error.digest ?? error.message);
  }, [error]);

  return (
    <Container>
      <div
        role="alert"
        className="mx-auto my-16 max-w-md rounded-card border border-danger/30 bg-danger-soft px-6 py-10 text-center"
      >
        <h1 className="text-lg font-semibold text-danger">Something went wrong</h1>
        <p className="mt-2 text-sm text-ink-muted">
          We couldn&apos;t load this page. Please try again in a moment.
        </p>
        <button
          type="button"
          onClick={reset}
          className="mt-5 inline-flex items-center rounded-lg bg-accent px-3.5 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-strong"
        >
          Try again
        </button>
      </div>
    </Container>
  );
}
