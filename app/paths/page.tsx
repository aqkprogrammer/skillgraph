import { Suspense } from "react";
import type { Metadata } from "next";

import { PathFinder } from "@/components/learning-path/PathFinder";
import { Container, Skeleton } from "@/components/ui";
import { DatabaseUnavailableState, EmptyGraphState } from "@/components/ui/DatabaseStates";
import { load } from "@/lib/server-data";
import { listSkills } from "@/lib/services/search";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Learning path",
  description:
    "Find the shortest route between two skills, derived from prerequisite and related-skill relationships in the graph.",
};

/**
 * Flow D — the learning path finder.
 *
 * The skill list is fetched on the server; the finder itself is a client
 * component because both selections and the resulting query live in the URL and
 * update without a page load.
 */
export default async function PathsPage() {
  const skills = await load("paths:skills", () => listSkills());

  return (
    <Container className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
          Find a learning path
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-ink-muted">
          Pick where you are and where you want to get to. SkillGraph walks the prerequisite and
          related-skill relationships and returns the shortest route it can find.
        </p>
      </header>

      {!skills.ok ? (
        <DatabaseUnavailableState retryHref="/paths" />
      ) : skills.data.length === 0 ? (
        <EmptyGraphState />
      ) : (
        <Suspense fallback={<Skeleton className="h-40 w-full" />}>
          <PathFinder skills={skills.data} />
        </Suspense>
      )}
    </Container>
  );
}
