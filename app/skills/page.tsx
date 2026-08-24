import Link from "next/link";
import type { Metadata } from "next";

import { Card, Container, DifficultyBadge, EmptyState } from "@/components/ui";
import { DatabaseUnavailableState, EmptyGraphState } from "@/components/ui/DatabaseStates";
import { load } from "@/lib/server-data";
import { getCategoriesWithSkills } from "@/lib/services/stats";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Skills",
  description: "Every skill in the graph, grouped by category.",
};

/** Browse every skill, grouped by the category it BELONGS_TO. */
export default async function SkillsPage() {
  // A high per-category limit turns the preview query into a full listing —
  // the graph is small enough that one query can render the whole page.
  const categories = await load("skills:index", () => getCategoriesWithSkills(50));

  if (!categories.ok) {
    return (
      <Container>
        <DatabaseUnavailableState retryHref="/skills" />
      </Container>
    );
  }

  const total = categories.data.reduce((sum, category) => sum + category.skillCount, 0);
  if (total === 0) {
    return (
      <Container>
        <EmptyGraphState />
      </Container>
    );
  }

  return (
    <Container className="space-y-10">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-ink sm:text-3xl">Skills</h1>
        <p className="mt-2 max-w-2xl text-sm text-ink-muted">
          {total} skills across {categories.data.length} categories. Open any one to see its
          prerequisites, the roles that need it and what to learn next.
        </p>
      </header>

      {categories.data.map((category) => (
        <section key={category.id} aria-labelledby={`category-${category.id}`}>
          <div className="mb-3">
            <h2 id={`category-${category.id}`} className="text-base font-semibold text-ink">
              {category.name}
            </h2>
            <p className="mt-0.5 text-sm text-ink-muted">{category.description}</p>
          </div>

          {category.skills.length > 0 ? (
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {category.skills.map((skill) => (
                <Card key={skill.id} as="li" className="transition-colors hover:border-accent">
                  <Link href={`/skills/${skill.id}`} className="block p-4">
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-sm font-semibold text-ink">{skill.name}</span>
                      <DifficultyBadge difficulty={skill.difficulty} />
                    </div>
                    <p className="mt-1.5 line-clamp-2 text-xs text-ink-muted">{skill.description}</p>
                  </Link>
                </Card>
              ))}
            </ul>
          ) : (
            <EmptyState
              title="No skills in this category"
              description="Nothing belongs to this category yet."
            />
          )}
        </section>
      ))}
    </Container>
  );
}
