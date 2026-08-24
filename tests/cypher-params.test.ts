import { describe, expect, it } from "vitest";

import { toCypherParams } from "@/lib/cypher-params";

/**
 * Regression test for a bug that only shows up against a real Bolt server.
 *
 * Bolt distinguishes integers from floats, and the driver encodes a plain JS
 * `number` as a float. `LIMIT $limit` with `limit: 10` therefore arrives as
 * `LIMIT 10.0`, and the server rejects it: "'10.0' is not a valid value. Must
 * be a non-negative integer." Every limit in the application would have failed
 * in production while passing every unit test.
 */

/** neo4j-driver Integers carry `low`/`high` 32-bit halves. */
function isNeo4jInteger(value: unknown): boolean {
  return (
    typeof value === "object" &&
    value !== null &&
    "low" in value &&
    "high" in value &&
    typeof (value as { low: unknown }).low === "number"
  );
}

describe("toCypherParams", () => {
  it("converts whole numbers into Bolt integers", () => {
    const params = toCypherParams({ limit: 20, nodeLimit: 40 });

    expect(isNeo4jInteger(params.limit)).toBe(true);
    expect(isNeo4jInteger(params.nodeLimit)).toBe(true);
    expect(String(params.limit)).toBe("20");
    expect(String(params.nodeLimit)).toBe("40");
  });

  it("converts zero, which is a valid LIMIT", () => {
    expect(isNeo4jInteger(toCypherParams({ limit: 0 }).limit)).toBe(true);
  });

  it("leaves strings, booleans, arrays and null untouched", () => {
    const params = toCypherParams({
      query: "react",
      skillId: "machine-learning",
      flag: true,
      ids: ["a", "b"],
      nothing: null,
    });

    expect(params).toEqual({
      query: "react",
      skillId: "machine-learning",
      flag: true,
      ids: ["a", "b"],
      nothing: null,
    });
  });

  it("leaves a genuine float alone", () => {
    expect(toCypherParams({ ratio: 0.5 }).ratio).toBe(0.5);
  });
});
