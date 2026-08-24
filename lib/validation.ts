import { z } from "zod";

import { InvalidInputError } from "@/lib/errors";
import { GRAPH_DEPTHS } from "@/lib/queries";

/**
 * Input validation for every API route.
 *
 * Two jobs: reject nonsense before it reaches the database, and clamp limits so
 * a crafted query string cannot ask the free-tier instance for the whole graph.
 *
 * Ids are constrained to a slug pattern. That is defence in depth rather than
 * injection protection — the Cypher is parameterised, so a hostile id is inert
 * — but it keeps obviously invalid input from turning into a database round
 * trip, and it makes the expected shape of an id explicit.
 */

const nodeId = z
  .string()
  .trim()
  .min(1, "An id is required.")
  .max(80, "That id is too long.")
  .regex(/^[a-z0-9][a-z0-9-]*$/, "Ids may only contain lowercase letters, numbers and hyphens.");

export const searchParamsSchema = z.object({
  q: z
    .string()
    .trim()
    .min(2, "Enter at least 2 characters to search.")
    .max(64, "That search term is too long."),
  limit: z.coerce
    .number()
    .int("Limit must be a whole number.")
    .min(1, "Limit must be at least 1.")
    .max(50, "Limit must be 50 or fewer.")
    .default(20),
});

export const skillParamsSchema = z.object({
  id: nodeId,
});

export const roleParamsSchema = z.object({
  id: nodeId,
});

export const recommendationParamsSchema = z.object({
  id: nodeId,
  limit: z.coerce
    .number()
    .int("Limit must be a whole number.")
    .min(1, "Limit must be at least 1.")
    .max(20, "Limit must be 20 or fewer.")
    .default(8),
});

export const pathParamsSchema = z.object({
  from: nodeId,
  to: nodeId,
});

export const graphParamsSchema = z.object({
  id: nodeId,
  depth: z.coerce
    .number()
    .int("Depth must be a whole number.")
    .refine(
      (depth): depth is (typeof GRAPH_DEPTHS)[number] =>
        (GRAPH_DEPTHS as readonly number[]).includes(depth),
      { message: `Depth must be one of: ${GRAPH_DEPTHS.join(", ")}.` },
    )
    .default(2),
});

export const reachParamsSchema = z.object({
  id: nodeId,
  limit: z.coerce
    .number()
    .int("Limit must be a whole number.")
    .min(1, "Limit must be at least 1.")
    .max(25, "Limit must be 25 or fewer.")
    .default(10),
});

/**
 * Parses a schema and converts a Zod failure into an InvalidInputError, whose
 * message is safe to show the user. Zod's own issue paths are dropped — they
 * describe internals, not something a person can act on.
 */
export function parseOrThrow<Schema extends z.ZodTypeAny>(
  schema: Schema,
  input: unknown,
): z.infer<Schema> {
  const result = schema.safeParse(input);
  if (result.success) return result.data;

  const firstIssue = result.error.issues[0];
  throw new InvalidInputError(firstIssue?.message ?? "That request was not valid.");
}

/** Turns a URLSearchParams into the plain object the schemas expect. */
export function queryObject(url: URL): Record<string, string> {
  return Object.fromEntries(url.searchParams.entries());
}
