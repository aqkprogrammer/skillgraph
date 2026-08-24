"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import { fetchApi, isAbort } from "@/lib/api-client";
import type { LearningPath, RelationshipType, Skill } from "@/lib/types";
import { Card, EmptyState, NodeBadge, Skeleton } from "@/components/ui";

/**
 * Flow D — find a learning path between two skills.
 *
 * The two selections live in the URL so a discovered path can be shared or
 * linked to from elsewhere in the app (the skill page links here with `?to=`).
 * A change to either selection triggers the query; the previous request is
 * aborted so results always match the current selection.
 */
export function PathFinder({ skills }: { skills: Skill[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [from, setFrom] = useState(searchParams.get("from") ?? "");
  const [to, setTo] = useState(searchParams.get("to") ?? "");
  const [state, setState] = useState<
    | { status: "idle" }
    | { status: "loading" }
    | { status: "found"; path: LearningPath }
    | { status: "none" }
    | { status: "error"; message: string }
  >({ status: "idle" });

  useEffect(() => {
    if (!from || !to || from === to) {
      setState({ status: "idle" });
      return;
    }

    const controller = new AbortController();
    setState({ status: "loading" });

    fetchApi<LearningPath | null>(
      `/api/paths?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
      controller.signal,
    )
      .then((path) => setState(path ? { status: "found", path } : { status: "none" }))
      .catch((error: unknown) => {
        if (isAbort(error)) return;
        setState({
          status: "error",
          message: error instanceof Error ? error.message : "We couldn't look for a path.",
        });
      });

    return () => controller.abort();
  }, [from, to]);

  // Mirror the selection into the URL without adding a history entry per change.
  useEffect(() => {
    const params = new URLSearchParams();
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    const query = params.toString();
    router.replace(query ? `/paths?${query}` : "/paths", { scroll: false });
  }, [from, to, router]);

  return (
    <div className="space-y-8">
      <Card className="p-5 sm:p-6">
        <div className="grid gap-4 sm:grid-cols-[1fr_auto_1fr] sm:items-end">
          <SkillSelect
            id="path-from"
            label="I already know"
            value={from}
            onChange={setFrom}
            skills={skills}
            excludeId={to}
          />

          <div className="hidden pb-2.5 text-center text-ink-subtle sm:block" aria-hidden="true">
            →
          </div>

          <SkillSelect
            id="path-to"
            label="I want to learn"
            value={to}
            onChange={setTo}
            skills={skills}
            excludeId={from}
          />
        </div>

        {from && to && from === to ? (
          <p className="mt-4 text-sm text-ink-muted">Pick two different skills.</p>
        ) : null}
      </Card>

      {state.status === "loading" ? (
        <div role="status" aria-live="polite" className="space-y-3">
          <span className="sr-only">Finding learning path…</span>
          <p className="text-sm text-ink-muted">Finding learning path…</p>
          {Array.from({ length: 4 }, (_, index) => (
            <Skeleton key={index} className="h-16 w-full" />
          ))}
        </div>
      ) : null}

      {state.status === "error" ? (
        <p
          role="alert"
          className="rounded-card border border-danger/30 bg-danger-soft px-4 py-3 text-sm text-danger"
        >
          {state.message}
        </p>
      ) : null}

      {state.status === "none" ? (
        <EmptyState
          title="No learning path could be found between these skills"
          description="Nothing connects them within five relationships. Try a nearer target, or pick a skill in the same area first and work outwards."
        />
      ) : null}

      {state.status === "found" ? <PathSteps path={state.path} /> : null}
    </div>
  );
}

function SkillSelect({
  id,
  label,
  value,
  onChange,
  skills,
  excludeId,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  skills: Skill[];
  excludeId: string;
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-xs font-medium text-ink-muted">
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-lg border border-line bg-surface px-3 py-2.5 text-sm text-ink"
      >
        <option value="">Choose a skill…</option>
        {skills
          .filter((skill) => skill.id !== excludeId)
          .map((skill) => (
            <option key={skill.id} value={skill.id}>
              {skill.name}
            </option>
          ))}
      </select>
    </div>
  );
}

/**
 * How each relationship reads in a sentence.
 *
 * `shortestPath` traverses undirected, so a PREREQUISITE_FOR edge may have been
 * walked backwards. Phrasing each direction separately keeps the path honest
 * instead of implying a dependency that the data does not claim.
 */
const STEP_LABEL: Record<RelationshipType, { forward: string; reverse: string }> = {
  PREREQUISITE_FOR: { forward: "is a prerequisite for", reverse: "builds on" },
  RELATED_TO: { forward: "is related to", reverse: "is related to" },
  REQUIRES: { forward: "requires", reverse: "is required by" },
  TAUGHT_BY: { forward: "is taught by", reverse: "teaches" },
  BUILDS_ON: { forward: "builds on", reverse: "is built on by" },
  REQUIRES_SKILL: { forward: "requires the skill", reverse: "is needed by" },
  BELONGS_TO: { forward: "belongs to", reverse: "contains" },
  USES: { forward: "uses", reverse: "is used by" },
};

function PathSteps({ path }: { path: LearningPath }) {
  return (
    <section aria-live="polite">
      <div className="mb-4 flex flex-wrap items-baseline gap-2">
        <h2 className="text-lg font-semibold tracking-tight text-ink">
          {path.from.name} → {path.to.name}
        </h2>
        <span className="text-sm text-ink-muted">
          {path.hops} {path.hops === 1 ? "step" : "steps"}
        </span>
      </div>

      <ol className="space-y-1">
        {path.steps.map((step, index) => {
          const phrasing = step.via ? STEP_LABEL[step.via] : null;
          const connector = phrasing ? (step.reversed ? phrasing.reverse : phrasing.forward) : null;

          return (
            <li key={`${step.node.id}-${index}`}>
              {connector ? (
                <div className="flex items-center gap-3 py-1 pl-6">
                  <span
                    className="h-6 w-px bg-line-strong"
                    aria-hidden="true"
                  />
                  <span className="text-xs italic text-ink-subtle">{connector}</span>
                </div>
              ) : null}

              <Card className="flex items-center gap-3 p-3.5">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent-soft text-xs font-semibold text-accent">
                  {index + 1}
                </span>
                <Link
                  href={`/skills/${step.node.id}`}
                  className="min-w-0 flex-1 text-sm font-medium text-ink hover:text-accent hover:underline"
                >
                  {step.node.name}
                </Link>
                <NodeBadge label={step.node.label} />
              </Card>
            </li>
          );
        })}
      </ol>

      <p className="mt-4 text-xs text-ink-subtle">
        Found with a single <code className="font-mono">shortestPath</code> traversal over
        PREREQUISITE_FOR and RELATED_TO relationships, up to five hops.
      </p>
    </section>
  );
}
