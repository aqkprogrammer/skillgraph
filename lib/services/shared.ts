import type { Record as Neo4jRecord } from "neo4j-driver";

/**
 * Small helpers shared by the service layer.
 *
 * The Neo4j driver types `record.get()` loosely, so every service narrows its
 * result through these two functions rather than sprinkling casts around.
 */

export function props(record: Neo4jRecord, key: string): Record<string, unknown> {
  const value: unknown = record.get(key);
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};
}

export function value(record: Neo4jRecord, key: string): unknown {
  return record.get(key) as unknown;
}

/** Alphabetical ordering used for the collected lists on the detail pages. */
export function byName<T extends { name: string }>(a: T, b: T): number {
  return a.name.localeCompare(b.name);
}

/** Resources sort by how approachable they are, then alphabetically. */
const DIFFICULTY_ORDER = { beginner: 0, intermediate: 1, advanced: 2 } as const;

export function byDifficultyThenTitle<T extends { difficulty: keyof typeof DIFFICULTY_ORDER; title: string }>(
  a: T,
  b: T,
): number {
  const delta = DIFFICULTY_ORDER[a.difficulty] - DIFFICULTY_ORDER[b.difficulty];
  return delta !== 0 ? delta : a.title.localeCompare(b.title);
}
