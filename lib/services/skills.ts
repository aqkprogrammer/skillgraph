import { readQuery } from "@/lib/db";
import { NotFoundError } from "@/lib/errors";
import {
  asNumber,
  asStringArray,
  toCategory,
  toList,
  toResource,
  toRole,
  toSkill,
  toTechnology,
} from "@/lib/mappers";
import { ROLES_REACHABLE_FROM_SKILL, SKILL_DETAIL } from "@/lib/queries";
import { byDifficultyThenTitle, byName, props, value } from "@/lib/services/shared";
import type { ReachableRole, SkillDetail } from "@/lib/types";

/**
 * Flow B — the skill explorer.
 *
 * One query returns every section of the page (see lib/queries/skills.ts); the
 * only work left here is mapping and ordering. Ordering happens in TypeScript
 * rather than Cypher because sorting seven collected lists in the query would
 * need seven extra `WITH ... ORDER BY` stages for no measurable gain on lists
 * this small.
 */
export async function getSkillDetail(skillId: string): Promise<SkillDetail> {
  const rows = await readQuery(SKILL_DETAIL, { skillId }, (record) => ({
    skill: toSkill(props(record, "skill")),
    categories: toList(value(record, "categories"), toCategory).sort(byName),
    prerequisites: toList(value(record, "prerequisites"), toSkill).sort(byName),
    unlocks: toList(value(record, "unlocks"), toSkill).sort(byName),
    relatedSkills: toList(value(record, "relatedSkills"), toSkill).sort(byName),
    roles: toList(value(record, "roles"), toRole).sort(byName),
    technologies: toList(value(record, "technologies"), toTechnology).sort(byName),
    resources: toList(value(record, "resources"), toResource).sort(byDifficultyThenTitle),
  }));

  const detail = rows[0];
  if (!detail) throw new NotFoundError("That skill");
  return detail;
}

/**
 * Flow B, second half — the mandatory multi-hop traversal.
 *
 * Returns roles that are 2–4 relationships away from this skill and that do not
 * already require it: careers you reach *through* the skills next door.
 */
export async function getRolesReachableFromSkill(
  skillId: string,
  limit: number,
): Promise<ReachableRole[]> {
  return readQuery(ROLES_REACHABLE_FROM_SKILL, { skillId, limit }, (record) => ({
    role: toRole(props(record, "role")),
    hops: asNumber(value(record, "hops")),
    via: asStringArray(value(record, "via")),
  }));
}
