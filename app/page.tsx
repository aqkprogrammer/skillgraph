import Link from "next/link";

import { SearchBar } from "@/components/search/SearchBar";
import {
  ButtonLink,
  Card,
  Container,
  DifficultyBadge,
  NodeBadge,
  Pill,
  SectionHeading,
} from "@/components/ui";
import { DatabaseUnavailableState, EmptyGraphState } from "@/components/ui/DatabaseStates";
import { load } from "@/lib/server-data";
import { getCategoriesWithSkills, getGraphStats, getTopSkillsByDemand } from "@/lib/services/stats";

/**
 * The homepage runs three small queries in parallel and degrades section by
 * section: if the database is unreachable the whole page becomes one error
 * state, and if it is reachable but empty it becomes the seed instruction.
 */
export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [stats, categories, topSkills] = await Promise.all([
    load("home:stats", () => getGraphStats()),
    load("home:categories", () => getCategoriesWithSkills(5)),
    load("home:topSkills", () => getTopSkillsByDemand(8)),
  ]);

  if (!stats.ok) {
    return (
      <Container>
        <Hero />
        <div className="mt-10">
          <DatabaseUnavailableState />
        </div>
      </Container>
    );
  }

  if (stats.data.skills === 0) {
    return (
      <Container>
        <Hero />
        <div className="mt-10">
          <EmptyGraphState />
        </div>
      </Container>
    );
  }

  return (
    <Container className="space-y-14">
      <Hero />

      <section aria-labelledby="inventory">
        <h2 id="inventory" className="sr-only">
          What is in the graph
        </h2>
        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <Stat label="Skills" value={stats.data.skills} />
          <Stat label="Roles" value={stats.data.roles} />
          <Stat label="Technologies" value={stats.data.technologies} />
          <Stat label="Resources" value={stats.data.resources} />
          <Stat label="Categories" value={stats.data.categories} />
          <Stat label="Relationships" value={stats.data.relationships} highlight />
        </dl>
      </section>

      <section aria-labelledby="popular-paths">
        <SectionHeading
          title="Popular paths"
          description="Every skill belongs to a category. Start with the area you care about."
          action={
            <Link href="/skills" className="text-sm font-medium text-accent hover:underline">
              Browse all skills →
            </Link>
          }
        />
        {categories.ok ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {categories.data.map((category) => (
              <Card key={category.id} as="article" className="flex flex-col p-5">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-sm font-semibold text-ink">{category.name}</h3>
                  <Pill>{category.skillCount}</Pill>
                </div>
                <p className="mt-1.5 line-clamp-2 text-xs text-ink-muted">{category.description}</p>
                <ul className="mt-4 flex flex-1 flex-wrap content-start gap-1.5">
                  {category.skills.map((skill) => (
                    <li key={skill.id}>
                      <Link
                        href={`/skills/${skill.id}`}
                        className="inline-block rounded-md bg-surface-muted px-2 py-1 text-xs text-ink-muted transition-colors hover:bg-accent-soft hover:text-accent"
                      >
                        {skill.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </Card>
            ))}
          </div>
        ) : (
          <DatabaseUnavailableState />
        )}
      </section>

      <section aria-labelledby="in-demand">
        <SectionHeading
          title="Most in-demand skills"
          description="Ranked by how many roles require them — the in-degree of the REQUIRES relationship, computed at query time."
        />
        {topSkills.ok ? (
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {topSkills.data.map((skill) => (
              <Card key={skill.id} as="li" className="transition-colors hover:border-accent">
                <Link href={`/skills/${skill.id}`} className="block p-4">
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-sm font-semibold text-ink">{skill.name}</span>
                    <NodeBadge label="Skill" />
                  </div>
                  <p className="mt-1.5 line-clamp-2 text-xs text-ink-muted">{skill.description}</p>
                  <div className="mt-3 flex items-center gap-2">
                    <DifficultyBadge difficulty={skill.difficulty} />
                    <span className="text-xs text-ink-subtle">
                      {skill.roleDemand} {skill.roleDemand === 1 ? "role" : "roles"}
                    </span>
                  </div>
                </Link>
              </Card>
            ))}
          </ul>
        ) : (
          <DatabaseUnavailableState />
        )}
      </section>

      <section aria-labelledby="traversals">
        <SectionHeading
          title="Explore the graph"
          description="Three questions that are natural to ask of a graph and awkward to ask of a table."
        />
        <div className="grid gap-4 md:grid-cols-3">
          <TraversalCard
            href="/skills/react"
            eyebrow="Multi-hop traversal"
            title="React → ? → ? → a career"
            body="Which roles open up two or three relationships away from React, without already requiring it?"
          />
          <TraversalCard
            href="/paths?from=javascript&to=machine-learning"
            eyebrow="Shortest path"
            title="JavaScript → Machine Learning"
            body="The shortest chain of prerequisites and related skills between where you are and where you want to be."
          />
          <TraversalCard
            href="/explore?focus=react&depth=3"
            eyebrow="Heterogeneous reach"
            title="Everything within 3 hops"
            body="Skills, technologies, resources and roles reachable from one node — four entity types, one traversal."
          />
        </div>
      </section>
    </Container>
  );
}

function Hero() {
  return (
    <section className="pt-6 text-center sm:pt-12">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-accent">
        Skills · Roles · Technologies · Resources
      </p>
      <h1 className="mx-auto mt-3 max-w-3xl text-balance text-3xl font-semibold tracking-tight text-ink sm:text-5xl">
        Discover your next career skill
      </h1>
      <p className="mx-auto mt-4 max-w-xl text-pretty text-sm text-ink-muted sm:text-base">
        SkillGraph maps how skills connect to each other, to the roles that need them and to the
        resources that teach them — then lets you walk those connections.
      </p>
      <div className="mx-auto mt-7 max-w-xl">
        <SearchBar autoFocus />
      </div>
      <div className="mt-5 flex flex-wrap justify-center gap-2">
        <ButtonLink href="/paths" variant="secondary">
          Find a learning path
        </ButtonLink>
        <ButtonLink href="/explore" variant="secondary">
          Open the graph explorer
        </ButtonLink>
      </div>
    </section>
  );
}

function Stat({ label, value, highlight = false }: { label: string; value: number; highlight?: boolean }) {
  return (
    <Card className={`px-4 py-3 ${highlight ? "border-accent/40 bg-accent-soft" : ""}`}>
      <dt className="text-xs text-ink-muted">{label}</dt>
      <dd className={`mt-0.5 text-xl font-semibold ${highlight ? "text-accent" : "text-ink"}`}>
        {value}
      </dd>
    </Card>
  );
}

function TraversalCard({
  href,
  eyebrow,
  title,
  body,
}: {
  href: string;
  eyebrow: string;
  title: string;
  body: string;
}) {
  return (
    <Card as="article" className="transition-colors hover:border-accent">
      <Link href={href} className="block p-5">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-accent">{eyebrow}</p>
        <h3 className="mt-2 text-sm font-semibold text-ink">{title}</h3>
        <p className="mt-1.5 text-xs leading-relaxed text-ink-muted">{body}</p>
      </Link>
    </Card>
  );
}
