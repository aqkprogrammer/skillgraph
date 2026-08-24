import type { NextRequest } from "next/server";

import { handle } from "@/lib/api";
import { getRecommendations } from "@/lib/services/recommendations";
import { parseOrThrow, queryObject, recommendationParamsSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

/** GET /api/recommendations/:id?limit=8 — Query 5, "what should I learn next?". */
export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  return handle("GET /api/recommendations/:id", async () => {
    const { id: rawId } = await context.params;
    const { id, limit } = parseOrThrow(recommendationParamsSchema, {
      id: rawId,
      ...queryObject(new URL(request.url)),
    });
    return getRecommendations(id, limit);
  });
}
