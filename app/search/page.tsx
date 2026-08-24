import Link from "next/link";
import type { Metadata } from "next";

import { SearchBar } from "@/components/search/SearchBar";
import { Card, Container, EmptyState, NodeBadge } from "@/components/ui";
import { DatabaseUnavailableState } from "@/components/ui/DatabaseStates";
import { hrefForNode } from "@/lib/links";
import { load } from "@/lib/server-data";
import { searchNodes } from "@/lib/services/search";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Search",
  description: "Search skills, roles, technologies and learning resources across the knowledge graph.",
};

const RESULT_LIMIT = 30;
const MIN_QUERY_LENGTH = 2;

/** Flow A — the full search results page, behind the instant dropdown. */
export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const query = (q ?? "").trim();
  const results =
    query.length >= MIN_QUERY_LENGTH
      ? await load("search:page", () => searchNodes(query, RESULT_LIMIT))
      : null;

  return (
    <Container className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-ink sm:text-3xl">Search</h1>
        <p className="mt-2 max-w-2xl text-sm text-ink-muted">
          One query across every node type — skills, roles, technologies and learning resources.
        </p>
        <div className="mt-5 max-w-xl">
          <SearchBar autoFocus />
        </div>
      </header>

      {query.length < MIN_QUERY_LENGTH ? (
        <EmptyState
          title="Start typing to search"
          description="Enter at least two characters. Try “react”, “data”, “kubernetes” or “engineer”."
        />
      ) : !results ? null : !results.ok ? (
        <DatabaseUnavailableState retryHref={`/search?q=${encodeURIComponent(query)}`} />
      ) : results.data.length === 0 ? (
        <EmptyState
          title="No results found"
          description={`Nothing in the graph matches “${query}”. Try a broader term, or browse skills and roles instead.`}
        />
      ) : (
        <section aria-live="polite">
          <p className="mb-4 text-sm text-ink-muted">
            {results.data.length} {results.data.length === 1 ? "result" : "results"} for{" "}
            <span className="font-medium text-ink">“{query}”</span>
          </p>
          <ul className="space-y-2">
            {results.data.map((result) => (
              <Card key={`${result.label}-${result.id}`} as="li" className="transition-colors hover:border-accent">
                <Link
                  href={hrefForNode(result.label, result.id, result.url)}
                  className="flex items-start gap-3 p-4"
                  {...(result.label === "Resource" ? { target: "_blank", rel: "noreferrer noopener" } : {})}
                >
                  <NodeBadge label={result.label} className="mt-0.5" />
                  <span className="min-w-0">
                    <span className="block text-sm font-medium text-ink">{result.name}</span>
                    {result.description ? (
                      <span className="mt-0.5 block text-xs text-ink-muted">{result.description}</span>
                    ) : null}
                  </span>
                </Link>
              </Card>
            ))}
          </ul>
        </section>
      )}
    </Container>
  );
}
