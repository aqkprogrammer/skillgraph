import "server-only";

import { AppError } from "@/lib/errors";

/**
 * How server components fetch data.
 *
 * Pages call the service layer directly rather than fetching their own API
 * routes: the code already runs on the server, so an HTTP round trip back to
 * the same process would add latency and a serialisation step for nothing. The
 * API routes exist for the *client* components (search, path finding, the graph
 * explorer), and both paths share the same services and the same queries.
 *
 * The result is a discriminated union rather than a thrown error, so a page can
 * render a friendly error state for one section without the whole route
 * failing — and so the failure mode is visible in the types.
 */
export type Loaded<T> =
  | { ok: true; data: T }
  | { ok: false; unavailable: boolean; message: string };

export async function load<T>(context: string, run: () => Promise<T>): Promise<Loaded<T>> {
  try {
    return { ok: true, data: await run() };
  } catch (error) {
    if (error instanceof AppError) {
      // The internal message goes to the log; only publicMessage reaches the page.
      console.error(`[skillgraph] ${context}: ${error.code} — ${error.message}`);
      return {
        ok: false,
        unavailable: error.code === "DATABASE_UNAVAILABLE" || error.code === "DATABASE_NOT_CONFIGURED",
        message: error.publicMessage,
      };
    }

    console.error(`[skillgraph] ${context}: unhandled error`, error);
    return {
      ok: false,
      unavailable: false,
      message: "Something went wrong on our side. Please try again.",
    };
  }
}
