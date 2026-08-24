import type {
  Category,
  Difficulty,
  NodeLabel,
  Resource,
  ResourceType,
  Role,
  RoleLevel,
  SearchResult,
  Skill,
  Technology,
} from "@/lib/types";

/**
 * Converts the plain maps returned by Cypher into typed domain objects.
 *
 * The queries project explicit maps (`{ id: s.id, name: s.name, ... }`) rather
 * than whole nodes, so these mappers receive `Record<string, unknown>` and are
 * responsible for the last, narrow step: coercing to the declared types with a
 * safe fallback. That keeps `any` out of the codebase without trusting the
 * database to have perfectly shaped data.
 */

type Props = Record<string, unknown>;

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function asNumber(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function asOneOf<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return typeof value === "string" && (allowed as readonly string[]).includes(value)
    ? (value as T)
    : fallback;
}

const DIFFICULTIES: readonly Difficulty[] = ["beginner", "intermediate", "advanced"];
const ROLE_LEVELS: readonly RoleLevel[] = ["junior", "mid", "senior"];
const RESOURCE_TYPES: readonly ResourceType[] = [
  "documentation",
  "course",
  "book",
  "tutorial",
  "interactive",
];
const NODE_LABELS: readonly NodeLabel[] = ["Skill", "Role", "Technology", "Resource", "Category"];

export function toSkill(props: Props): Skill {
  return {
    id: asString(props.id),
    name: asString(props.name),
    description: asString(props.description),
    difficulty: asOneOf(props.difficulty, DIFFICULTIES, "intermediate"),
  };
}

export function toRole(props: Props): Role {
  return {
    id: asString(props.id),
    name: asString(props.name),
    description: asString(props.description),
    level: asOneOf(props.level, ROLE_LEVELS, "mid"),
  };
}

export function toTechnology(props: Props): Technology {
  return {
    id: asString(props.id),
    name: asString(props.name),
    description: asString(props.description),
  };
}

export function toResource(props: Props): Resource {
  return {
    id: asString(props.id),
    title: asString(props.title),
    url: asString(props.url),
    type: asOneOf(props.type, RESOURCE_TYPES, "documentation"),
    difficulty: asOneOf(props.difficulty, DIFFICULTIES, "intermediate"),
    provider: asString(props.provider),
  };
}

export function toCategory(props: Props): Category {
  return {
    id: asString(props.id),
    name: asString(props.name),
    description: asString(props.description),
  };
}

/**
 * Search and the graph view span every label, so both return a single
 * normalised shape. `name` is projected in Cypher (Resources use `title`),
 * which is why there is no per-label branching here.
 */
export function toSearchResult(props: Props): SearchResult {
  const url = asString(props.url);
  return {
    id: asString(props.id),
    label: asOneOf(props.label, NODE_LABELS, "Skill"),
    name: asString(props.name),
    description: asString(props.description),
    ...(url ? { url } : {}),
  };
}

/** Maps a list value returned by `collect(...)` through a mapper. */
export function toList<T>(value: unknown, map: (props: Props) => T): T[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is Props => typeof item === "object" && item !== null)
    // `collect` on an OPTIONAL MATCH that found nothing yields [null]; the
    // queries filter those out, but guard here too so a stray null cannot
    // become an object with empty strings in the UI.
    .filter((item) => typeof item.id === "string" && item.id.length > 0)
    .map(map);
}

export { asNumber, asString, asStringArray };
