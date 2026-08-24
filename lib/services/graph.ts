import { readQuery } from "@/lib/db";
import { NotFoundError } from "@/lib/errors";
import { asNumber, toList } from "@/lib/mappers";
import { GRAPH_NEIGHBOURHOOD, REACHABLE_WITHIN_THREE_HOPS, type GraphDepth } from "@/lib/queries";
import { value } from "@/lib/services/shared";
import type { GraphData, GraphNode, GraphRelationship, NodeLabel, RelationshipType } from "@/lib/types";

/**
 * How many neighbours the visualisation will draw. Past roughly this many the
 * picture stops being readable and starts being a hairball, and the free-tier
 * instance has no reason to serve rows nobody can interpret.
 */
export const GRAPH_NODE_LIMIT = 40;

/** Flow E — the neighbourhood around one node, for the graph visualisation. */
export async function getGraphNeighbourhood(
  focusId: string,
  depth: GraphDepth,
): Promise<GraphData> {
  const rows = await readQuery(
    // Depth selects a pre-built query from a frozen table — it is never
    // interpolated into Cypher. See the note in lib/queries/graph.ts.
    GRAPH_NEIGHBOURHOOD[depth],
    { focusId, nodeLimit: GRAPH_NODE_LIMIT },
    (record) => ({
      nodes: toList(value(record, "nodes"), toGraphNode),
      relationships: toList(value(record, "relationships"), toGraphRelationship),
      truncated: value(record, "truncated") === true,
    }),
  );

  const row = rows[0];
  if (!row) throw new NotFoundError("That node");

  return { focusId, ...row };
}

const NODE_LABELS: readonly NodeLabel[] = ["Skill", "Role", "Technology", "Resource", "Category"];
const RELATIONSHIP_TYPES: readonly RelationshipType[] = [
  "PREREQUISITE_FOR",
  "RELATED_TO",
  "REQUIRES",
  "TAUGHT_BY",
  "BUILDS_ON",
  "REQUIRES_SKILL",
  "BELONGS_TO",
  "USES",
];

function toGraphNode(row: Record<string, unknown>): GraphNode {
  const label = typeof row.label === "string" && (NODE_LABELS as readonly string[]).includes(row.label)
    ? (row.label as NodeLabel)
    : "Skill";
  return {
    id: String(row.id ?? ""),
    label,
    name: typeof row.name === "string" ? row.name : "",
    depth: asNumber(row.depth),
  };
}

function toGraphRelationship(row: Record<string, unknown>): GraphRelationship {
  const type =
    typeof row.type === "string" && (RELATIONSHIP_TYPES as readonly string[]).includes(row.type)
      ? (row.type as RelationshipType)
      : "RELATED_TO";
  return {
    id: String(row.id ?? ""),
    source: String(row.source ?? ""),
    target: String(row.target ?? ""),
    type,
  };
}

export interface ReachableGroup {
  label: NodeLabel;
  items: { id: string; name: string; hops: number }[];
  total: number;
}

/**
 * The README's showcase query: everything reachable from a node within 3 hops,
 * grouped by node type. One traversal crosses four different labels.
 */
export async function getReachabilitySummary(
  focusId: string,
  perLabelLimit: number,
): Promise<ReachableGroup[]> {
  return readQuery(REACHABLE_WITHIN_THREE_HOPS, { focusId, perLabelLimit }, (record) => ({
    label: (() => {
      const raw = record.get("label");
      return typeof raw === "string" && (NODE_LABELS as readonly string[]).includes(raw)
        ? (raw as NodeLabel)
        : "Skill";
    })(),
    items: toList(value(record, "items"), (row) => ({
      id: String(row.id ?? ""),
      name: typeof row.name === "string" ? row.name : "",
      hops: asNumber(row.hops),
    })),
    total: asNumber(value(record, "total")),
  }));
}
