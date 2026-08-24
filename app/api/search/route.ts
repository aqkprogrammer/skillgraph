import type { NextRequest } from "next/server";

import { handle } from "@/lib/api";
import { searchNodes } from "@/lib/services/search";
import { parseOrThrow, queryObject, searchParamsSchema } from "@/lib/validation";

/** Never cached: results depend entirely on the query string and the graph. */
export const dynamic = "force-dynamic";

/** GET /api/search?q=react&limit=20 */
export async function GET(request: NextRequest) {
  return handle("GET /api/search", async () => {
    const { q, limit } = parseOrThrow(searchParamsSchema, queryObject(new URL(request.url)));
    return searchNodes(q, limit);
  });
}
