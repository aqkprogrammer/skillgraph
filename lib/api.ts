import { NextResponse } from "next/server";

import { AppError } from "@/lib/errors";
import type { ApiResponse } from "@/lib/types";

/**
 * The single response format every API route returns, for success and failure
 * alike: `{ data, error }`, exactly one of which is non-null.
 *
 * Having one shape means the client has one code path for reading responses,
 * and — more importantly — one place where the rule "never serialise internal
 * detail" is enforced.
 */

export function ok<T>(data: T, status = 200): NextResponse<ApiResponse<T>> {
  return NextResponse.json({ data, error: null }, { status });
}

/**
 * Converts a thrown value into a safe JSON error response.
 *
 * `AppError` carries a public message written for a human plus an internal
 * message written for a log. Anything else is an unexpected bug: it is logged
 * in full and reported to the browser as a generic 500, so a driver stack
 * trace or a connection URI can never reach a user.
 */
export function fail(error: unknown, context: string): NextResponse<ApiResponse<never>> {
  if (error instanceof AppError) {
    // AppError.message holds the internal detail; publicMessage is what ships.
    console.error(`[skillgraph] ${context}: ${error.code} — ${error.message}`);
    return NextResponse.json(
      { data: null, error: { code: error.code, message: error.publicMessage } },
      { status: error.status },
    );
  }

  console.error(`[skillgraph] ${context}: unhandled error`, error);
  return NextResponse.json(
    {
      data: null,
      error: {
        code: "INTERNAL_ERROR" as const,
        message: "Something went wrong on our side. Please try again.",
      },
    },
    { status: 500 },
  );
}

/**
 * Wraps a route handler so every route gets the same error handling without
 * repeating a try/catch. `context` is a short label used only in server logs.
 */
export async function handle<T>(
  context: string,
  run: () => Promise<T>,
): Promise<NextResponse<ApiResponse<T>>> {
  try {
    return ok(await run());
  } catch (error) {
    return fail(error, context);
  }
}
