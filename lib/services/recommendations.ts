import { readQuery } from "@/lib/db";
import { asNumber, toResource, toSkill } from "@/lib/mappers";
import { SKILL_RECOMMENDATIONS } from "@/lib/queries";
import { props, value } from "@/lib/services/shared";
import type { Recommendation, RecommendationKind, Resource } from "@/lib/types";

/**
 * Query 5 — "What should I learn next?"
 *
 * Ranking lives in Cypher (see lib/queries/recommendations.ts) because the
 * inputs to the score are graph structure: relationship kind and the REQUIRES
 * in-degree of each candidate. Only the human-readable justification is built
 * here, where it belongs — it is presentation, not data.
 */
export async function getRecommendations(
  skillId: string,
  limit: number,
): Promise<Recommendation[]> {
  return readQuery(SKILL_RECOMMENDATIONS, { skillId, limit }, (record) => {
    const skill = toSkill(props(record, "skill"));
    const kind = toKind(value(record, "kind"));
    const roleDemand = asNumber(value(record, "roleDemand"));

    return {
      skill,
      kind,
      score: asNumber(value(record, "score")),
      roleDemand,
      reason: buildReason(kind, roleDemand),
      topResource: toTopResource(value(record, "topResource")),
    };
  });
}

const KINDS: readonly RecommendationKind[] = ["prerequisite", "next-step", "related", "role-demand"];

function toKind(raw: unknown): RecommendationKind {
  return typeof raw === "string" && (KINDS as readonly string[]).includes(raw)
    ? (raw as RecommendationKind)
    : "related";
}

function toTopResource(raw: unknown): Resource | null {
  if (typeof raw !== "object" || raw === null) return null;
  const resource = toResource(raw as Record<string, unknown>);
  return resource.id ? resource : null;
}

/** Explains, in one sentence, why the graph surfaced this skill. */
function buildReason(kind: RecommendationKind, roleDemand: number): string {
  const demand =
    roleDemand > 0
      ? ` Required by ${roleDemand} ${roleDemand === 1 ? "role" : "roles"} in the graph.`
      : "";

  switch (kind) {
    case "prerequisite":
      return `A foundation for this skill — learn it first.${demand}`;
    case "next-step":
      return `This skill unlocks it — the natural next step.${demand}`;
    case "related":
      return `Closely related, and often learned alongside it.${demand}`;
    case "role-demand":
      return `Roles that need this skill usually need that one too.${demand}`;
  }
}
