import { readQuery } from "@/lib/db";
import { InvalidInputError, NotFoundError } from "@/lib/errors";
import { toSearchResult, toSkill } from "@/lib/mappers";
import { FETCH_PATH_ENDPOINTS, SHORTEST_LEARNING_PATH } from "@/lib/queries";
import { value } from "@/lib/services/shared";
import type { LearningPath, LearningPathStep, RelationshipType } from "@/lib/types";

/**
 * Flow D — find a learning path between two skills.
 *
 * Returns `null` when both skills exist but no route connects them within the
 * depth limit. That is a legitimate answer, not an error, and the UI renders it
 * as a dedicated empty state — so the two cases have to stay distinguishable,
 * which is why the endpoints are verified first.
 */
export async function findLearningPath(fromId: string, toId: string): Promise<LearningPath | null> {
  if (fromId === toId) {
    throw new InvalidInputError("Pick two different skills to find a path between them.");
  }

  const endpoints = await readQuery(FETCH_PATH_ENDPOINTS, { fromId, toId }, (record) =>
    toSkill({
      id: record.get("id"),
      name: record.get("name"),
      description: record.get("description"),
      difficulty: record.get("difficulty"),
    }),
  );

  const from = endpoints.find((skill) => skill.id === fromId);
  const to = endpoints.find((skill) => skill.id === toId);
  if (!from) throw new NotFoundError(`The skill "${fromId}"`);
  if (!to) throw new NotFoundError(`The skill "${toId}"`);

  const rows = await readQuery(SHORTEST_LEARNING_PATH, { fromId, toId }, (record) => ({
    nodes: value(record, "nodes"),
    relationships: value(record, "relationships"),
  }));

  const row = rows[0];
  if (!row) return null;

  const steps = buildSteps(row.nodes, row.relationships);
  if (steps.length === 0) return null;

  return { from, to, steps, hops: steps.length - 1 };
}

interface RawRelationship {
  type: string;
  startId: string;
  endId: string;
}

/**
 * Turns the raw `nodes` / `relationships` arrays from `shortestPath` into an
 * ordered list of steps.
 *
 * The traversal is undirected, so a relationship may have been walked against
 * its stored direction — `(React)<-[:PREREQUISITE_FOR]-(JavaScript)` read
 * forwards is "JavaScript is a prerequisite for React". Comparing the edge's
 * `startId` with the previous node tells us which way we went, and the UI uses
 * that to phrase each hop correctly instead of implying a false direction.
 */
function buildSteps(rawNodes: unknown, rawRelationships: unknown): LearningPathStep[] {
  if (!Array.isArray(rawNodes) || rawNodes.length === 0) return [];
  const relationships: RawRelationship[] = Array.isArray(rawRelationships)
    ? rawRelationships.filter(isRawRelationship)
    : [];

  return rawNodes.map((rawNode, index) => {
    const node = toSearchResult(
      typeof rawNode === "object" && rawNode !== null ? (rawNode as Record<string, unknown>) : {},
    );

    if (index === 0) {
      return { node, via: null, reversed: false };
    }

    const edge = relationships[index - 1];
    const previous = rawNodes[index - 1] as Record<string, unknown> | undefined;
    const previousId = typeof previous?.id === "string" ? previous.id : "";

    return {
      node,
      via: (edge?.type ?? null) as RelationshipType | null,
      reversed: edge ? edge.startId !== previousId : false,
    };
  });
}

function isRawRelationship(candidate: unknown): candidate is RawRelationship {
  if (typeof candidate !== "object" || candidate === null) return false;
  const record = candidate as Record<string, unknown>;
  return (
    typeof record.type === "string" &&
    typeof record.startId === "string" &&
    typeof record.endId === "string"
  );
}
