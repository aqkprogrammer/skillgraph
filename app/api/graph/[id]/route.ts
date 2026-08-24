import type { NextRequest } from "next/server";

import { handle } from "@/lib/api";
import { getGraphNeighbourhood } from "@/lib/services/graph";
import { graphParamsSchema, parseOrThrow, queryObject } from "@/lib/validation";

export const dynamic = "force-dynamic";

/**
 * GET /api/graph/:id?depth=2
 *
 * The neighbourhood around one node, for the visualisation. Depth is validated
 * to 1, 2 or 3 and then used to select a pre-built query — see the note in
 * lib/queries/graph.ts on why a variable-length bound cannot be a parameter.
 */
export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  return handle("GET /api/graph/:id", async () => {
    const { id: rawId } = await context.params;
    const { id, depth } = parseOrThrow(graphParamsSchema, {
      id: rawId,
      ...queryObject(new URL(request.url)),
    });
    return getGraphNeighbourhood(id, depth);
  });
}
