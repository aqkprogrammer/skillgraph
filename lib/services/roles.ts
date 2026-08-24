import { readQuery } from "@/lib/db";
import { NotFoundError } from "@/lib/errors";
import {
  asNumber,
  asStringArray,
  toList,
  toResource,
  toRole,
  toSkill,
  toTechnology,
} from "@/lib/mappers";
import { ROLE_DETAIL } from "@/lib/queries";
import { byDifficultyThenTitle, byName, props, value } from "@/lib/services/shared";
import type { RelatedRole, RoleDetail, SkillGap } from "@/lib/types";

/** How many neighbouring roles and skill gaps the role page shows. */
const RELATED_ROLE_LIMIT = 5;
const SKILL_GAP_LIMIT = 8;

/** Flow C — the career explorer. */
export async function getRoleDetail(roleId: string): Promise<RoleDetail> {
  const rows = await readQuery(
    ROLE_DETAIL,
    { roleId, relatedLimit: RELATED_ROLE_LIMIT, gapLimit: SKILL_GAP_LIMIT },
    (record) => ({
      role: toRole(props(record, "role")),
      requiredSkills: toList(value(record, "requiredSkills"), toSkill).sort(byName),
      technologies: toList(value(record, "technologies"), toTechnology).sort(byName),
      resources: toList(value(record, "resources"), toResource).sort(byDifficultyThenTitle),
      // Related roles and skill gaps are already ranked by the query, so their
      // order is preserved rather than re-sorted alphabetically.
      relatedRoles: toList(value(record, "relatedRoles"), toRelatedRole),
      skillGaps: toList(value(record, "skillGaps"), toSkillGap),
    }),
  );

  const detail = rows[0];
  if (!detail) throw new NotFoundError("That role");
  return detail;
}

function toRelatedRole(row: Record<string, unknown>): RelatedRole {
  return { ...toRole(row), sharedSkillCount: asNumber(row.sharedSkillCount) };
}

function toSkillGap(row: Record<string, unknown>): SkillGap {
  return { ...toSkill(row), requiredByRoles: asStringArray(row.requiredByRoles).sort() };
}
