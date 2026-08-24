import { handle } from "@/lib/api";
import { listRoles } from "@/lib/services/search";

export const dynamic = "force-dynamic";

/** GET /api/roles — the full role list. */
export async function GET() {
  return handle("GET /api/roles", () => listRoles());
}
