import type { NextRequest } from "next/server";

import { handle } from "@/lib/api";
import { getReachabilitySummary } from "@/lib/services/graph";
import { parseOrThrow, queryObject, reachParamsSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

/**
 * GET /api/reach/:id?limit=10
 *
 * The README's showcase traversal: everything reachable from a node within
 * three hops, grouped by node label.
 */
export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  return handle("GET /api/reach/:id", async () => {
    const { id: rawId } = await context.params;
    const { id, limit } = parseOrThrow(reachParamsSchema, {
      id: rawId,
      ...queryObject(new URL(request.url)),
    });
    return getReachabilitySummary(id, limit);
  });
}
