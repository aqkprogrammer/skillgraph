"use client";

import { useMemo, useState } from "react";

import type { GraphData, GraphNode, NodeLabel } from "@/lib/types";

/**
 * The graph visualisation (Flow E).
 *
 * Deliberately not a force-directed layout and deliberately not a third-party
 * library. Nodes already carry their hop distance from the focus node, so a
 * radial layout — focus in the centre, one ring per hop — draws the thing the
 * user actually asked about: *how far away* each node is. It is deterministic
 * (the same query always renders the same picture), it has no simulation to
 * tune, and it is about a hundred lines of SVG that can be explained in full.
 *
 * Nodes within a ring are grouped by label before being spaced out, so colours
 * cluster instead of scattering.
 */

const RING_RADII = [0, 135, 250, 340];
/**
 * Nodes on the same ring alternate between the base radius and a slightly
 * larger one. That halves how many labels sit at any single distance from the
 * centre, which is what stops the outer ring turning into overlapping text.
 */
const RING_STAGGER = 32;
/**
 * Rings are ellipses, not circles: a page is much wider than it is tall, so
 * stretching horizontally uses the space instead of leaving margins. It also
 * helps legibility — labels run horizontally, so spreading nodes along the same
 * axis is exactly where the extra room is needed.
 */
const HORIZONTAL_STRETCH = 1.45;
const VIEW_WIDTH = 1320;
const VIEW_HEIGHT = 810;

const LABEL_COLOR: Record<NodeLabel, string> = {
  Skill: "var(--color-skill)",
  Role: "var(--color-role)",
  Technology: "var(--color-technology)",
  Resource: "var(--color-resource)",
  Category: "var(--color-category)",
};

const LABEL_ORDER: NodeLabel[] = ["Skill", "Role", "Technology", "Resource", "Category"];

interface PositionedNode extends GraphNode {
  x: number;
  y: number;
  /** Circle radius in SVG units. */
  radius: number;
  /** Direction from the centre, used to place the label clear of the ring. */
  angle: number;
}

/**
 * Rounds a coordinate to two decimals.
 *
 * Not cosmetic: `Math.cos` may return a value one ULP apart in Node and in the
 * browser, so the server renders `x2="-112.95090619726392"` and the client
 * computes `-112.95090619726393`. React reports that as a hydration mismatch on
 * every edge. Two decimals is far finer than a pixel at this scale and makes
 * both sides produce byte-identical output.
 */
function round(value: number): number {
  return Math.round(value * 100) / 100;
}

function layout(nodes: GraphNode[]): PositionedNode[] {
  const byDepth = new Map<number, GraphNode[]>();
  for (const node of nodes) {
    const bucket = byDepth.get(node.depth) ?? [];
    bucket.push(node);
    byDepth.set(node.depth, bucket);
  }

  const positioned: PositionedNode[] = [];

  for (const [depth, bucket] of byDepth) {
    const radius = RING_RADII[Math.min(depth, RING_RADII.length - 1)] ?? 300;

    if (depth === 0) {
      for (const node of bucket) positioned.push({ ...node, x: 0, y: 0, radius: 16, angle: 0 });
      continue;
    }

    // Group by label so the ring reads as coloured arcs rather than confetti.
    const ordered = [...bucket].sort((a, b) => {
      const byLabel = LABEL_ORDER.indexOf(a.label) - LABEL_ORDER.indexOf(b.label);
      return byLabel !== 0 ? byLabel : a.name.localeCompare(b.name);
    });

    // Rotate each ring so nodes on different rings rarely line up radially.
    const offset = depth * 0.6;
    for (const [index, node] of ordered.entries()) {
      const angle = (index / ordered.length) * Math.PI * 2 + offset;
      const distance = radius + (index % 2 === 0 ? 0 : RING_STAGGER);
      positioned.push({
        ...node,
        x: round(Math.cos(angle) * distance * HORIZONTAL_STRETCH),
        y: round(Math.sin(angle) * distance),
        radius: depth === 1 ? 10 : 7.5,
        angle,
      });
    }
  }

  return positioned;
}

export function GraphView({
  data,
  onSelect,
}: {
  data: GraphData;
  onSelect: (nodeId: string) => void;
}) {
  const [hovered, setHovered] = useState<string | null>(null);

  const nodes = useMemo(() => layout(data.nodes), [data.nodes]);
  const positions = useMemo(
    () => new Map(nodes.map((node) => [node.id, node] as const)),
    [nodes],
  );

  /** Ids connected to the hovered node — everything else dims. */
  const connected = useMemo(() => {
    if (!hovered) return null;
    const ids = new Set<string>([hovered]);
    for (const edge of data.relationships) {
      if (edge.source === hovered) ids.add(edge.target);
      if (edge.target === hovered) ids.add(edge.source);
    }
    return ids;
  }, [hovered, data.relationships]);

  const isDimmed = (nodeId: string) => connected !== null && !connected.has(nodeId);

  return (
    <svg
      viewBox={`${-VIEW_WIDTH / 2} ${-VIEW_HEIGHT / 2} ${VIEW_WIDTH} ${VIEW_HEIGHT}`}
      className="h-full w-full"
      role="img"
      aria-label={`Graph of ${data.nodes.length} nodes and ${data.relationships.length} relationships around the selected node`}
    >
      <defs>
        <marker
          id="graph-arrow"
          viewBox="0 0 8 8"
          refX="7"
          refY="4"
          markerWidth="5"
          markerHeight="5"
          orient="auto-start-reverse"
        >
          <path d="M0 0 L8 4 L0 8 z" fill="var(--color-line-strong)" />
        </marker>
      </defs>

      {/* Faint guide rings make the hop distance legible at a glance. */}
      {RING_RADII.slice(1).map((radius) => (
        <ellipse
          key={radius}
          rx={radius * HORIZONTAL_STRETCH}
          ry={radius}
          fill="none"
          stroke="var(--color-line)"
          strokeDasharray="3 5"
        />
      ))}

      <g>
        {data.relationships.map((edge) => {
          const source = positions.get(edge.source);
          const target = positions.get(edge.target);
          if (!source || !target) return null;

          const dimmed = isDimmed(edge.source) || isDimmed(edge.target);
          const active = connected !== null && !dimmed;

          return (
            <line
              key={edge.id}
              x1={source.x}
              y1={source.y}
              x2={target.x}
              y2={target.y}
              stroke={active ? "var(--color-accent)" : "var(--color-line-strong)"}
              strokeWidth={active ? 1.6 : 1}
              opacity={dimmed ? 0.12 : active ? 0.9 : 0.5}
              markerEnd="url(#graph-arrow)"
            >
              <title>{`${edge.source} —[${edge.type}]→ ${edge.target}`}</title>
            </line>
          );
        })}
      </g>

      <g>
        {nodes.map((node) => {
          const dimmed = isDimmed(node.id);
          const isFocus = node.depth === 0;

          return (
            <g
              key={node.id}
              opacity={dimmed ? 0.2 : 1}
              onMouseEnter={() => setHovered(node.id)}
              onMouseLeave={() => setHovered(null)}
              className="cursor-pointer"
            >
              <circle
                cx={node.x}
                cy={node.y}
                r={node.radius}
                fill={LABEL_COLOR[node.label]}
                stroke="var(--color-surface)"
                strokeWidth={isFocus ? 3 : 2}
                tabIndex={0}
                role="button"
                aria-label={`${node.name}, ${node.label}, ${node.depth} ${node.depth === 1 ? "hop" : "hops"} away`}
                onClick={() => onSelect(node.id)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    onSelect(node.id);
                  }
                }}
                onFocus={() => setHovered(node.id)}
                onBlur={() => setHovered(null)}
              >
                <title>{`${node.name} — ${node.label}`}</title>
              </circle>
              <NodeLabel node={node} isFocus={isFocus} />
            </g>
          );
        })}
      </g>
    </svg>
  );
}

/**
 * Labels on the rings are placed radially outward — anchored to the left of a
 * node on the left half and to the right of one on the right half. Because
 * neighbours on a ring are separated by angle, pushing their labels outward
 * along that angle separates the text too, which a fixed "below the node"
 * placement does not.
 */
function NodeLabel({ node, isFocus }: { node: PositionedNode; isFocus: boolean }) {
  if (isFocus) {
    return (
      <text
        x={0}
        y={node.radius + 18}
        textAnchor="middle"
        fontSize={15}
        fontWeight={700}
        fill="var(--color-ink)"
        className="pointer-events-none select-none"
      >
        {truncate(node.name, 26)}
      </text>
    );
  }

  const pointsRight = Math.cos(node.angle) >= 0;
  const gap = node.radius + 5;

  return (
    <text
      x={node.x + (pointsRight ? gap : -gap)}
      y={node.y + 3.5}
      textAnchor={pointsRight ? "start" : "end"}
      fontSize={10}
      fontWeight={500}
      fill="var(--color-ink)"
      className="pointer-events-none select-none"
    >
      {truncate(node.name, 18)}
    </text>
  );
}

function truncate(value: string, max: number): string {
  return value.length <= max ? value : `${value.slice(0, max - 1)}…`;
}

export function GraphLegend() {
  return (
    <ul className="flex flex-wrap items-center gap-x-4 gap-y-2">
      {LABEL_ORDER.map((label) => (
        <li key={label} className="flex items-center gap-1.5 text-xs text-ink-muted">
          <span
            className="inline-block h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: LABEL_COLOR[label] }}
            aria-hidden="true"
          />
          {label}
        </li>
      ))}
    </ul>
  );
}
