"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { GraphLegend, GraphView } from "@/components/graph/GraphView";
import type { GraphData } from "@/lib/types";

/**
 * The interactive shell around the graph.
 *
 * State lives in the URL rather than in React: `?focus=react&depth=2` is the
 * whole state of this page, which makes every view shareable and lets the
 * server do the querying. Clicking a node is a navigation, and `useTransition`
 * keeps the current picture on screen — dimmed — while the next one loads,
 * instead of flashing an empty frame.
 */
export function GraphExplorer({
  data,
  depth,
  options,
}: {
  data: GraphData;
  depth: number;
  options: { id: string; name: string; group: string }[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const navigate = (focus: string, nextDepth: number) => {
    startTransition(() => {
      router.push(`/explore?focus=${encodeURIComponent(focus)}&depth=${nextDepth}`);
    });
  };

  const groups = [...new Set(options.map((option) => option.group))];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-4">
        <div className="min-w-56 flex-1">
          <label htmlFor="graph-focus" className="mb-1.5 block text-xs font-medium text-ink-muted">
            Focus node
          </label>
          <select
            id="graph-focus"
            value={data.focusId}
            onChange={(event) => navigate(event.target.value, depth)}
            className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink"
          >
            {/* The focus may be a technology or resource reached by clicking a
                node, in which case it is not in the picker — keep it selectable. */}
            {options.every((option) => option.id !== data.focusId) ? (
              <option value={data.focusId}>Current selection</option>
            ) : null}
            {groups.map((group) => (
              <optgroup key={group} label={group}>
                {options
                  .filter((option) => option.group === group)
                  .map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.name}
                    </option>
                  ))}
              </optgroup>
            ))}
          </select>
        </div>

        <fieldset>
          <legend className="mb-1.5 text-xs font-medium text-ink-muted">Traversal depth</legend>
          <div className="flex gap-1 rounded-lg border border-line bg-surface p-1">
            {[1, 2, 3].map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => navigate(data.focusId, option)}
                aria-pressed={option === depth}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  option === depth
                    ? "bg-accent text-white"
                    : "text-ink-muted hover:bg-surface-muted hover:text-ink"
                }`}
              >
                {option} hop{option === 1 ? "" : "s"}
              </button>
            ))}
          </div>
        </fieldset>
      </div>

      <div className="relative overflow-hidden rounded-card border border-line bg-surface">
        {/* A fixed height rather than an aspect ratio: the graph has to fit on
            screen without scrolling, and its own viewBox handles the shape. */}
        <div
          className={`h-[28rem] w-full transition-opacity sm:h-[32rem] lg:h-[36rem] ${
            isPending ? "opacity-40" : "opacity-100"
          }`}
        >
          <GraphView data={data} onSelect={(nodeId) => navigate(nodeId, depth)} />
        </div>

        {isPending ? (
          <p
            role="status"
            aria-live="polite"
            className="absolute inset-x-0 top-4 mx-auto w-fit rounded-full border border-line bg-surface px-3 py-1 text-xs font-medium text-ink-muted shadow-sm"
          >
            Loading graph…
          </p>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <GraphLegend />
        <p className="text-xs text-ink-subtle">
          {data.nodes.length} nodes · {data.relationships.length} relationships
          {data.truncated ? " · view limited to the nearest 40 neighbours" : ""}
        </p>
      </div>
    </div>
  );
}
