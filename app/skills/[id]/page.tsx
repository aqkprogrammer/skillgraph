import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { RecommendationList } from "@/components/skills/RecommendationList";
import { ResourceList } from "@/components/skills/ResourceList";
import {
  ButtonLink,
  Card,
  Container,
  DifficultyBadge,
  EmptyState,
  NodeBadge,
  NodeChip,
  Pill,
  SectionHeading,
} from "@/components/ui";
import { DatabaseUnavailableState } from "@/components/ui/DatabaseStates";
import { load } from "@/lib/server-data";
import { getRolesReachableFromSkill, getSkillDetail } from "@/lib/services/skills";
import type { Skill } from "@/lib/types";

export const dynamic = "force-dynamic";

const REACHABLE_ROLE_LIMIT = 6;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const detail = await load("skill:metadata", () => getSkillDetail(id));
  if (!detail.ok) return { title: "Skill" };
  return { title: detail.data.skill.name, description: detail.data.skill.description };
}

/**
 * Flow B — the skill explorer.
 *
 * Two queries run in parallel: the detail fan-out (Query 2) and the multi-hop
 * role traversal (Query 3). Recommendations (Query 5) load client-side so the
 * page can paint before the ranking finishes.
 */
export default async function SkillPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const [detail, reachable] = await Promise.all([
    load("skill:detail", () => getSkillDetail(id)),
    load("skill:reachableRoles", () => getRolesReachableFromSkill(id, REACHABLE_ROLE_LIMIT)),
  ]);

  if (!detail.ok) {
    if (detail.unavailable) {
      return (
        <Container>
          <DatabaseUnavailableState retryHref={`/skills/${id}`} />
        </Container>
      );
    }
    notFound();
  }

  const { skill, categories, prerequisites, unlocks, relatedSkills, roles, technologies, resources } =
    detail.data;

  return (
    <Container className="space-y-12">
      <header>
        <nav aria-label="Breadcrumb" className="text-xs text-ink-subtle">
          <Link href="/skills" className="hover:text-accent hover:underline">
            Skills
          </Link>
          <span aria-hidden="true"> / </span>
          <span className="text-ink-muted">{skill.name}</span>
        </nav>

        <div className="mt-3 flex flex-wrap items-center gap-2.5">
          <h1 className="text-2xl font-semibold tracking-tight text-ink sm:text-4xl">
            {skill.name}
          </h1>
          <NodeBadge label="Skill" />
          <DifficultyBadge difficulty={skill.difficulty} />
        </div>

        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-ink-muted sm:text-base">
          {skill.description}
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          {categories.map((category) => (
            <Pill key={category.id}>{category.name}</Pill>
          ))}
          <ButtonLink href={`/explore?focus=${skill.id}&depth=2`} variant="secondary">
            View in graph
          </ButtonLink>
          <ButtonLink href={`/paths?to=${skill.id}`} variant="secondary">
            Find a path to this skill
          </ButtonLink>
        </div>
      </header>

      <section aria-labelledby="next">
        <SectionHeading
          title="What should I learn next?"
          description="Ranked from the graph: missing foundations first, then what this skill unlocks, then skills that keep appearing alongside it in job requirements."
        />
        <RecommendationList skillId={skill.id} />
      </section>

      <div className="grid gap-10 lg:grid-cols-2">
        <SkillGroup
          title="Prerequisites"
          description="Learn these before this skill."
          skills={prerequisites}
          emptyMessage="This skill has no prerequisites in the graph — it is a good entry point."
        />
        <SkillGroup
          title="Unlocks"
          description="This skill is a prerequisite for these."
          skills={unlocks}
          emptyMessage="Nothing in the graph lists this skill as a prerequisite yet."
        />
      </div>

      <section aria-labelledby="related">
        <SectionHeading
          title="Related skills"
          description="Skills you will keep meeting alongside this one."
        />
        {relatedSkills.length > 0 ? (
          <ul className="flex flex-wrap gap-2">
            {relatedSkills.map((related) => (
              <li key={related.id}>
                <NodeChip href={`/skills/${related.id}`} name={related.name} label="Skill" />
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState
            title="No related skills yet"
            description="Nothing in the graph is linked to this skill by a RELATED_TO relationship."
          />
        )}
      </section>

      <div className="grid gap-10 lg:grid-cols-2">
        <section aria-labelledby="roles">
          <SectionHeading title="Required by roles" description="Careers that list this skill directly." />
          {roles.length > 0 ? (
            <ul className="flex flex-wrap gap-2">
              {roles.map((role) => (
                <li key={role.id}>
                  <NodeChip href={`/roles/${role.id}`} name={role.name} label="Role" meta={role.level} />
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState
              title="No roles require this yet"
              description="No role in the graph lists this skill as a requirement."
            />
          )}
        </section>

        <section aria-labelledby="technologies">
          <SectionHeading
            title="Technologies"
            description="Tools and products that assume this skill."
          />
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
              title="No technologies linked"
              description="No technology in the graph requires this skill yet."
            />
          )}
        </section>
      </div>

      <section aria-labelledby="reachable-roles">
        <SectionHeading
          title="Careers two or more hops away"
          description="Roles reached through neighbouring skills that do not require this one directly — the multi-hop traversal."
        />
        {!reachable.ok ? (
          <DatabaseUnavailableState retryHref={`/skills/${id}`} />
        ) : reachable.data.length === 0 ? (
          <EmptyState
            title="No indirect careers found"
            description="Every role connected to this skill already requires it directly, so there is nothing new to discover through its neighbours."
          />
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {reachable.data.map(({ role, hops, via }) => (
              <Card key={role.id} as="li" className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <Link
                    href={`/roles/${role.id}`}
                    className="text-sm font-semibold text-ink hover:text-accent hover:underline"
                  >
                    {role.name}
                  </Link>
                  <Pill>
                    {hops} hop{hops === 1 ? "" : "s"}
                  </Pill>
                </div>
                <p className="mt-2 text-xs leading-relaxed text-ink-muted">
                  <span className="text-ink-subtle">via </span>
                  {[skill.name, ...via].join(" → ")}
                </p>
              </Card>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="resources">
        <SectionHeading title="Learning resources" description="Where to actually learn this." />
        <ResourceList
          resources={resources}
          emptyMessage="This skill does not have any associated resources yet."
        />
      </section>
    </Container>
  );
}

function SkillGroup({
  title,
  description,
  skills,
  emptyMessage,
}: {
  title: string;
  description: string;
  skills: Skill[];
  emptyMessage: string;
}) {
  return (
    <section>
      <SectionHeading title={title} description={description} />
      {skills.length > 0 ? (
        <ul className="flex flex-wrap gap-2">
          {skills.map((skill) => (
            <li key={skill.id}>
              <NodeChip href={`/skills/${skill.id}`} name={skill.name} label="Skill" />
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState title="Nothing here" description={emptyMessage} />
      )}
    </section>
  );
}
