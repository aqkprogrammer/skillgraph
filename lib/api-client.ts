import type { ApiResponse } from "@/lib/types";

/**
 * The browser-side counterpart to lib/api.ts.
 *
 * Every client component fetches through this one function, so the `{ data,
 * error }` envelope is unwrapped in exactly one place and every caller gets a
 * plain value or a thrown `Error` carrying a message that is already safe to
 * display — the server guarantees that.
 */
export async function fetchApi<T>(path: string, signal?: AbortSignal): Promise<T> {
  let response: Response;

  try {
    response = await fetch(path, { signal, headers: { accept: "application/json" } });
  } catch (error) {
    // AbortError is a normal part of debounced search; let callers detect it.
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    throw new Error("We couldn't reach the server. Check your connection and try again.");
  }

  let payload: ApiResponse<T> | null = null;
  try {
    payload = (await response.json()) as ApiResponse<T>;
  } catch {
    throw new Error("Something went wrong on our side. Please try again.");
  }

  if (payload?.error) throw new Error(payload.error.message);
  if (!response.ok) throw new Error("Something went wrong on our side. Please try again.");

  return payload.data as T;
}

/** True when a caught error is just a superseded request, not a real failure. */
export function isAbort(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}
