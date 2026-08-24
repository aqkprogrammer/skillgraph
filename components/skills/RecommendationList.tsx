"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { fetchApi, isAbort } from "@/lib/api-client";
import type { Recommendation, RecommendationKind } from "@/lib/types";
import { Card, DifficultyBadge, EmptyState, Skeleton } from "@/components/ui";

/**
 * Query 5 — "What should I learn next?", rendered as a client island.
 *
 * The rest of the skill page is server-rendered, but recommendations load
 * separately so the main content is not held up by the ranking query. It also
 * means this is one of the places the public API is exercised by the app
 * itself, rather than only by the pages.
 */

const KIND_LABEL: Record<RecommendationKind, string> = {
  prerequisite: "Learn first",
  "next-step": "Next step",
  related: "Related",
  "role-demand": "In demand together",
};

const KIND_STYLE: Record<RecommendationKind, string> = {
  prerequisite: "bg-danger-soft text-danger",
  "next-step": "bg-accent-soft text-accent",
  related: "bg-surface-muted text-ink-muted",
  "role-demand": "bg-role-soft text-role",
};

export function RecommendationList({ skillId }: { skillId: string }) {
  const [state, setState] = useState<
    | { status: "loading" }
    | { status: "ready"; items: Recommendation[] }
    | { status: "error"; message: string }
  >({ status: "loading" });

  useEffect(() => {
    const controller = new AbortController();
    setState({ status: "loading" });

    fetchApi<Recommendation[]>(`/api/recommendations/${skillId}?limit=6`, controller.signal)
      .then((items) => setState({ status: "ready", items }))
      .catch((error: unknown) => {
        if (isAbort(error)) return;
        setState({
          status: "error",
          message: error instanceof Error ? error.message : "Recommendations are unavailable.",
        });
      });

    return () => controller.abort();
  }, [skillId]);

  if (state.status === "loading") {
    return (
      <div role="status" aria-live="polite" className="grid gap-3 sm:grid-cols-2">
        <span className="sr-only">Finding what to learn next…</span>
        {Array.from({ length: 4 }, (_, index) => (
          <Skeleton key={index} className="h-28 w-full" />
        ))}
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <p role="alert" className="rounded-card border border-danger/30 bg-danger-soft px-4 py-3 text-sm text-danger">
        {state.message}
      </p>
    );
  }

  if (state.items.length === 0) {
    return (
      <EmptyState
        title="No suggestions yet"
        description="This skill has no neighbouring skills in the graph, so there is nothing to recommend from it."
      />
    );
  }

  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {state.items.map((item) => (
        <Card key={item.skill.id} as="li" className="flex flex-col p-4">
          <div className="flex items-start justify-between gap-2">
            <Link
              href={`/skills/${item.skill.id}`}
              className="text-sm font-semibold text-ink hover:text-accent hover:underline"
            >
              {item.skill.name}
            </Link>
            <span
              className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${KIND_STYLE[item.kind]}`}
            >
              {KIND_LABEL[item.kind]}
            </span>
          </div>

          <p className="mt-1.5 flex-1 text-xs leading-relaxed text-ink-muted">{item.reason}</p>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <DifficultyBadge difficulty={item.skill.difficulty} />
            {item.topResource ? (
              <a
                href={item.topResource.url}
                target="_blank"
                rel="noreferrer noopener"
                className="text-xs font-medium text-accent hover:underline"
              >
                {item.topResource.title} ↗
              </a>
            ) : null}
          </div>
        </Card>
      ))}
    </ul>
  );
}
