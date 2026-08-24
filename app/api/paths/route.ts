import type { NextRequest } from "next/server";

import { handle } from "@/lib/api";
import { findLearningPath } from "@/lib/services/paths";
import { parseOrThrow, pathParamsSchema, queryObject } from "@/lib/validation";

export const dynamic = "force-dynamic";

/**
 * GET /api/paths?from=javascript&to=machine-learning
 *
 * Responds 200 with `data: null` when both skills exist but nothing connects
 * them — "no route" is an answer, not a failure, and the UI has an empty state
 * for exactly that case. A missing skill is a 404, handled in the service.
 */
export async function GET(request: NextRequest) {
  return handle("GET /api/paths", async () => {
    const { from, to } = parseOrThrow(pathParamsSchema, queryObject(new URL(request.url)));
    return findLearningPath(from, to);
  });
}
