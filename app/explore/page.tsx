import Link from "next/link";
import type { Metadata } from "next";

import { GraphExplorer } from "@/components/graph/GraphExplorer";
import { Card, Container, EmptyState, NodeBadge, SectionHeading } from "@/components/ui";
import { DatabaseUnavailableState, EmptyGraphState } from "@/components/ui/DatabaseStates";
import { hrefForNode } from "@/lib/links";
import { load } from "@/lib/server-data";
import { getGraphNeighbourhood, getReachabilitySummary } from "@/lib/services/graph";
import { listRoles, listSkills } from "@/lib/services/search";
import { GRAPH_DEPTHS, type GraphDepth } from "@/lib/queries";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Graph explorer",
  description:
    "Walk the SkillGraph knowledge graph node by node: skills, roles, technologies and resources within one, two or three hops.",
};

const DEFAULT_FOCUS = "react";

/**
 * Flow E — the graph explorer.
 *
 * The whole page state is the query string, so the server can run both queries
 * and the client component only handles interaction. `?focus=react&depth=3` is
 * the README's showcase query rendered as a page.
 */
export default async function ExplorePage({
  searchParams,
}: {
  searchParams: Promise<{ focus?: string; depth?: string }>;
}) {
  const params = await searchParams;
  const focus = normaliseId(params.focus) ?? DEFAULT_FOCUS;
  const depth = normaliseDepth(params.depth);

  const [graph, reach, skills, roles] = await Promise.all([
    load("explore:graph", () => getGraphNeighbourhood(focus, depth)),
    load("explore:reach", () => getReachabilitySummary(focus, 8)),
    load("explore:skills", () => listSkills()),
    load("explore:roles", () => listRoles()),
  ]);

  const options = [
    ...(skills.ok ? skills.data.map((skill) => ({ id: skill.id, name: skill.name, group: "Skills" })) : []),
    ...(roles.ok ? roles.data.map((role) => ({ id: role.id, name: role.name, group: "Roles" })) : []),
  ];

  if (skills.ok && skills.data.length === 0) {
    return (
      <Container>
        <EmptyGraphState />
      </Container>
    );
  }

  return (
    <Container className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
          Graph explorer
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-ink-muted">
          One traversal, four kinds of node. Click any node to re-centre the graph on it, or change
          the depth to widen the search. Rings show hop distance from the node in the centre.
        </p>
      </header>

      {graph.ok ? (
        <GraphExplorer data={graph.data} depth={depth} options={options} />
      ) : (
        <DatabaseUnavailableState retryHref={`/explore?focus=${focus}&depth=${depth}`} />
      )}

      <section aria-labelledby="reachable">
        <SectionHeading
          title="Reachable within 3 hops"
          description="Everything connected to this node by at most three relationships, grouped by type. This is the query that is genuinely awkward in SQL — the result mixes four entity types that no single table describes."
        />

        {!reach.ok ? (
          <DatabaseUnavailableState retryHref={`/explore?focus=${focus}&depth=${depth}`} />
        ) : reach.data.length === 0 ? (
          <EmptyState
            title="Nothing within three hops"
            description="This node has no relationships yet, so there is nothing to reach from it."
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {reach.data.map((group) => (
              <Card key={group.label} as="article" className="p-5">
                <div className="flex items-center justify-between gap-2">
                  <NodeBadge label={group.label} />
                  <span className="text-xs text-ink-subtle">{group.total} total</span>
                </div>
                <ul className="mt-3 space-y-1.5">
                  {group.items.map((item) => (
                    <li key={item.id} className="flex items-baseline justify-between gap-2">
                      <Link
                        href={hrefForNode(group.label, item.id)}
                        className="truncate text-sm text-ink hover:text-accent hover:underline"
                      >
                        {item.name}
                      </Link>
                      <span className="shrink-0 text-[11px] text-ink-subtle">
                        {item.hops} hop{item.hops === 1 ? "" : "s"}
                      </span>
                    </li>
                  ))}
                </ul>
                {group.total > group.items.length ? (
                  <p className="mt-3 text-[11px] text-ink-subtle">
                    +{group.total - group.items.length} more
                  </p>
                ) : null}
              </Card>
            ))}
          </div>
        )}
      </section>
    </Container>
  );
}

/** Query-string values are untrusted; anything unexpected falls back to a default. */
function normaliseId(raw: string | undefined): string | null {
  if (!raw) return null;
  return /^[a-z0-9][a-z0-9-]{0,79}$/.test(raw) ? raw : null;
}

function normaliseDepth(raw: string | undefined): GraphDepth {
  const parsed = Number(raw);
  return (GRAPH_DEPTHS as readonly number[]).includes(parsed) ? (parsed as GraphDepth) : 2;
}
