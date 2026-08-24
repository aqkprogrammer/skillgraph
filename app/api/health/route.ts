import { handle } from "@/lib/api";
import { verifyConnection } from "@/lib/db";
import { getGraphStats } from "@/lib/services/stats";

export const dynamic = "force-dynamic";

/**
 * GET /api/health
 *
 * Confirms the Bolt connection is live and reports node counts. Useful after a
 * deployment to tell "credentials wrong" apart from "database not seeded", and
 * it exposes no configuration detail — only counts.
 */
export async function GET() {
  return handle("GET /api/health", async () => {
    await verifyConnection();
    const stats = await getGraphStats();
    return { connected: true, seeded: stats.skills > 0, stats };
  });
}
