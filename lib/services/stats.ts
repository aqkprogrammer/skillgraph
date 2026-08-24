import { readQuery } from "@/lib/db";
import { asNumber, toList, toSkill } from "@/lib/mappers";
import { CATEGORIES_WITH_SKILLS, GRAPH_STATS, TOP_SKILLS_BY_DEMAND } from "@/lib/queries";
import { value } from "@/lib/services/shared";
import type { Category, GraphStats, Skill } from "@/lib/types";

/** Counts used by the homepage and the empty-database first-run state. */
export async function getGraphStats(): Promise<GraphStats> {
  const rows = await readQuery(GRAPH_STATS, {}, (record) => ({
    skills: asNumber(value(record, "skills")),
    roles: asNumber(value(record, "roles")),
    technologies: asNumber(value(record, "technologies")),
    resources: asNumber(value(record, "resources")),
    categories: asNumber(value(record, "categories")),
    relationships: asNumber(value(record, "relationships")),
  }));

  return (
    rows[0] ?? {
      skills: 0,
      roles: 0,
      technologies: 0,
      resources: 0,
      categories: 0,
      relationships: 0,
    }
  );
}

export interface SkillWithDemand extends Skill {
  roleDemand: number;
}

/** Skills ranked by REQUIRES in-degree — "most in demand" on the homepage. */
export async function getTopSkillsByDemand(limit: number): Promise<SkillWithDemand[]> {
  return readQuery(TOP_SKILLS_BY_DEMAND, { limit }, (record) => ({
    ...toSkill({
      id: record.get("id"),
      name: record.get("name"),
      description: record.get("description"),
      difficulty: record.get("difficulty"),
    }),
    roleDemand: asNumber(value(record, "roleDemand")),
  }));
}

export interface CategoryWithSkills extends Category {
  skills: Skill[];
  skillCount: number;
}

/** Categories plus a preview of their skills — the "Popular paths" section. */
export async function getCategoriesWithSkills(
  skillsPerCategory: number,
): Promise<CategoryWithSkills[]> {
  return readQuery(CATEGORIES_WITH_SKILLS, { skillsPerCategory }, (record) => ({
    id: String(record.get("id")),
    name: String(record.get("name")),
    description: String(record.get("description")),
    skills: toList(value(record, "skills"), toSkill),
    skillCount: asNumber(value(record, "skillCount")),
  }));
}
