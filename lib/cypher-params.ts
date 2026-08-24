import neo4j from "neo4j-driver";

/**
 * Converts JavaScript numbers in a parameter map into Cypher integers.
 *
 * This is not cosmetic. The Bolt protocol distinguishes integers from floats,
 * and the driver encodes a plain JS `number` as a **float** — so `LIMIT $limit`
 * with `limit: 10` reaches the server as `LIMIT 10.0` and fails with
 * "'10.0' is not a valid value. Must be a non-negative integer."
 *
 * `disableLosslessIntegers` only affects values coming *back*; parameters going
 * *out* still need this. Doing it here, in the one place every query's
 * parameters pass through, means no caller has to remember.
 *
 * Non-integer numbers are left alone — a float parameter is presumably meant to
 * be a float.
 */
export function toCypherParams(params: Record<string, unknown>): Record<string, unknown> {
  const converted: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(params)) {
    converted[key] =
      typeof value === "number" && Number.isInteger(value) ? neo4j.int(value) : value;
  }

  return converted;
}
