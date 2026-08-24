import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { ResourceList } from "@/components/skills/ResourceList";
import {
  ButtonLink,
  Card,
  Container,
  DifficultyBadge,
  EmptyState,
  LevelBadge,
  NodeBadge,
  NodeChip,
  Pill,
  SectionHeading,
} from "@/components/ui";
import { DatabaseUnavailableState } from "@/components/ui/DatabaseStates";
import { load } from "@/lib/server-data";
import { getRoleDetail } from "@/lib/services/roles";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const detail = await load("role:metadata", () => getRoleDetail(id));
  if (!detail.ok) return { title: "Role" };
  return { title: detail.data.role.name, description: detail.data.role.description };
}

/** Flow C — the career explorer. One query fills the whole page (Query 6). */
export default async function RolePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const detail = await load("role:detail", () => getRoleDetail(id));

  if (!detail.ok) {
    if (detail.unavailable) {
      return (
        <Container>
          <DatabaseUnavailableState retryHref={`/roles/${id}`} />
        </Container>
      );
    }
    notFound();
  }

  const { role, requiredSkills, technologies, resources, relatedRoles, skillGaps } = detail.data;

  return (
    <Container className="space-y-12">
      <header>
        <nav aria-label="Breadcrumb" className="text-xs text-ink-subtle">
          <Link href="/roles" className="hover:text-accent hover:underline">
            Roles
          </Link>
          <span aria-hidden="true"> / </span>
          <span className="text-ink-muted">{role.name}</span>
        </nav>

        <div className="mt-3 flex flex-wrap items-center gap-2.5">
          <h1 className="text-2xl font-semibold tracking-tight text-ink sm:text-4xl">{role.name}</h1>
          <NodeBadge label="Role" />
          <LevelBadge level={role.level} />
        </div>

        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-ink-muted sm:text-base">
          {role.description}
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Pill>
            {requiredSkills.length} required {requiredSkills.length === 1 ? "skill" : "skills"}
          </Pill>
          <ButtonLink href={`/explore?focus=${role.id}&depth=2`} variant="secondary">
            View in graph
          </ButtonLink>
        </div>
      </header>

      <section aria-labelledby="required">
        <SectionHeading
          title="Required skills"
          description="Everything this role expects, straight from the REQUIRES relationships."
        />
        {requiredSkills.length > 0 ? (
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {requiredSkills.map((skill) => (
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
            title="No skills listed"
            description="This role has no REQUIRES relationships in the graph yet."
          />
        )}
      </section>

      <div className="grid gap-10 lg:grid-cols-2">
        <section aria-labelledby="technologies">
          <SectionHeading title="Technologies used" description="The tools this role works with day to day." />
          {technologies.length > 0 ? (
            <ul className="flex flex-wrap gap-2">
              {technologies.map((technology) => (
                <li key={technology.id}>
                  <NodeChip
                    href={`/explore?focus=${technology.id}&depth=2`}
                    name={technology.name}
                    label="Technology"
                  />
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState
              title="No technologies listed"
              description="This role has no USES relationships in the graph yet."
            />
          )}
        </section>

        <section aria-labelledby="related-roles">
          <SectionHeading
            title="Related roles"
            description="Roles are never linked to each other directly — this similarity is derived by walking out to their shared skills and back."
          />
          {relatedRoles.length > 0 ? (
            <ul className="space-y-2">
              {relatedRoles.map((related) => (
                <li key={related.id}>
                  <Link
                    href={`/roles/${related.id}`}
                    className="flex items-center justify-between gap-3 rounded-lg border border-line bg-surface px-3.5 py-2.5 transition-colors hover:border-accent hover:bg-accent-soft"
                  >
                    <span className="text-sm font-medium text-ink">{related.name}</span>
                    <span className="shrink-0 text-xs text-ink-subtle">
                      {related.sharedSkillCount} shared{" "}
                      {related.sharedSkillCount === 1 ? "skill" : "skills"}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState
              title="No neighbouring roles"
              description="No other role in the graph requires any of the same skills."
            />
          )}
        </section>
      </div>

      <section aria-labelledby="gaps">
        <SectionHeading
          title="Skill gaps"
          description="Skills that nearby roles require and this one does not — a three-hop pattern with a negative filter, which is where SQL would need a self-join plus a NOT EXISTS subquery."
        />
        {skillGaps.length > 0 ? (
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {skillGaps.map((gap) => (
              <Card key={gap.id} as="li" className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <Link
                    href={`/skills/${gap.id}`}
                    className="text-sm font-semibold text-ink hover:text-accent hover:underline"
                  >
                    {gap.name}
                  </Link>
                  <DifficultyBadge difficulty={gap.difficulty} />
                </div>
                <p className="mt-2 text-xs leading-relaxed text-ink-muted">
                  <span className="text-ink-subtle">Wanted by </span>
                  {gap.requiredByRoles.join(", ")}
                </p>
              </Card>
            ))}
          </ul>
        ) : (
          <EmptyState
            title="No gaps found"
            description="This role already requires every skill that its neighbouring roles ask for."
          />
        )}
      </section>

      <section aria-labelledby="resources">
        <SectionHeading
          title="Learning resources"
          description="Everything that teaches a skill this role requires, collected in one traversal."
        />
        <ResourceList
          resources={resources}
          emptyMessage="None of this role's required skills have resources attached yet."
        />
      </section>
    </Container>
  );
}
