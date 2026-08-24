import type { NextRequest } from "next/server";

import { handle } from "@/lib/api";
import { getRoleDetail } from "@/lib/services/roles";
import { parseOrThrow, roleParamsSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

/** GET /api/roles/:id — Query 6, the career explorer. */
export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  return handle("GET /api/roles/:id", async () => {
    const { id } = parseOrThrow(roleParamsSchema, await context.params);
    return getRoleDetail(id);
  });
}
