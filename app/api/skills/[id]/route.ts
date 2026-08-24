import type { NextRequest } from "next/server";

import { handle } from "@/lib/api";
import { getRolesReachableFromSkill, getSkillDetail } from "@/lib/services/skills";
import { parseOrThrow, skillParamsSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

/** How many indirectly reachable roles the skill page shows. */
const REACHABLE_ROLE_LIMIT = 6;

/**
 * GET /api/skills/:id
 *
 * Returns the skill detail (Query 2) together with the multi-hop traversal
 * result (Query 3). They run concurrently — two independent reads, so there is
 * no reason to pay for them in sequence.
 */
export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  return handle("GET /api/skills/:id", async () => {
    const { id } = parseOrThrow(skillParamsSchema, await context.params);

    const [detail, reachableRoles] = await Promise.all([
      getSkillDetail(id),
      getRolesReachableFromSkill(id, REACHABLE_ROLE_LIMIT),
    ]);

    return { ...detail, reachableRoles };
  });
}
