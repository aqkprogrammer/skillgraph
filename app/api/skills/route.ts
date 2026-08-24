import { handle } from "@/lib/api";
import { listSkills } from "@/lib/services/search";

export const dynamic = "force-dynamic";

/** GET /api/skills — the full skill list, used by the learning-path pickers. */
export async function GET() {
  return handle("GET /api/skills", () => listSkills());
}
