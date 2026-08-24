import { describe, expect, it } from "vitest";

import { InvalidInputError } from "@/lib/errors";
import {
  graphParamsSchema,
  parseOrThrow,
  pathParamsSchema,
  recommendationParamsSchema,
  searchParamsSchema,
  skillParamsSchema,
} from "@/lib/validation";

/**
 * Route input validation. The Cypher is parameterised, so these rules are not
 * what stops injection — they stop nonsense from becoming a database round trip
 * and stop a crafted query string from asking a free-tier instance for the
 * whole graph.
 */

describe("searchParamsSchema", () => {
  it("defaults the limit when it is absent", () => {
    expect(parseOrThrow(searchParamsSchema, { q: "react" })).toEqual({ q: "react", limit: 20 });
  });

  it("trims the term", () => {
    expect(parseOrThrow(searchParamsSchema, { q: "  react  " }).q).toBe("react");
  });

  it("rejects a term shorter than two characters", () => {
    expect(() => parseOrThrow(searchParamsSchema, { q: "r" })).toThrow(InvalidInputError);
  });

  it("rejects an absurdly long term instead of sending it to the database", () => {
    expect(() => parseOrThrow(searchParamsSchema, { q: "a".repeat(500) })).toThrow(InvalidInputError);
  });

  it("rejects a limit above the cap rather than silently clamping it", () => {
    expect(() => parseOrThrow(searchParamsSchema, { q: "react", limit: "5000" })).toThrow(
      InvalidInputError,
    );
  });

  it("coerces a numeric limit out of the query string", () => {
    expect(parseOrThrow(searchParamsSchema, { q: "react", limit: "5" }).limit).toBe(5);
  });
});

describe("node id validation", () => {
  it.each(["react", "machine-learning", "web3", "a"])("accepts the slug %s", (id) => {
    expect(parseOrThrow(skillParamsSchema, { id }).id).toBe(id);
  });

  it.each([
    "React",
    "machine learning",
    "-leading-hyphen",
    "semi;colon",
    "quote'injection",
    "../../etc/passwd",
    "",
  ])("rejects %s", (id) => {
    expect(() => parseOrThrow(skillParamsSchema, { id })).toThrow(InvalidInputError);
  });

  it("rejects an id longer than the cap", () => {
    expect(() => parseOrThrow(skillParamsSchema, { id: "a".repeat(200) })).toThrow(InvalidInputError);
  });
});

describe("pathParamsSchema", () => {
  it("requires both endpoints", () => {
    expect(() => parseOrThrow(pathParamsSchema, { from: "javascript" })).toThrow(InvalidInputError);
  });

  it("accepts two valid ids", () => {
    expect(parseOrThrow(pathParamsSchema, { from: "javascript", to: "machine-learning" })).toEqual({
      from: "javascript",
      to: "machine-learning",
    });
  });
});

describe("graphParamsSchema", () => {
  it("defaults the depth to 2", () => {
    expect(parseOrThrow(graphParamsSchema, { id: "react" }).depth).toBe(2);
  });

  it.each(["1", "2", "3"])("accepts depth %s", (depth) => {
    expect(parseOrThrow(graphParamsSchema, { id: "react", depth }).depth).toBe(Number(depth));
  });

  it.each(["0", "4", "99", "abc"])(
    "rejects depth %s, so it can never index the query table with an unknown key",
    (depth) => {
      expect(() => parseOrThrow(graphParamsSchema, { id: "react", depth })).toThrow(InvalidInputError);
    },
  );
});

describe("recommendationParamsSchema", () => {
  it("defaults the limit", () => {
    expect(parseOrThrow(recommendationParamsSchema, { id: "react" }).limit).toBe(8);
  });

  it("rejects a limit outside the allowed range", () => {
    expect(() => parseOrThrow(recommendationParamsSchema, { id: "react", limit: "0" })).toThrow(
      InvalidInputError,
    );
  });
});

describe("error messages", () => {
  it("never surfaces a raw validation-library message to the user", () => {
    const cases: [unknown, () => unknown][] = [
      [searchParamsSchema, () => parseOrThrow(searchParamsSchema, { q: "react", limit: "9999" })],
      [graphParamsSchema, () => parseOrThrow(graphParamsSchema, { id: "react", depth: "9" })],
      [
        recommendationParamsSchema,
        () => parseOrThrow(recommendationParamsSchema, { id: "react", limit: "99" }),
      ],
    ];

    for (const [, run] of cases) {
      try {
        run();
        throw new Error("expected the schema to reject this input");
      } catch (error) {
        const message = (error as InvalidInputError).publicMessage;
        // Zod's defaults read like "Number must be less than or equal to 50".
        expect(message).not.toMatch(/^Number must be/);
        expect(message).not.toBe("Invalid input");
        expect(message.endsWith(".")).toBe(true);
      }
    }
  });
});

describe("parseOrThrow", () => {
  it("produces a message a user can act on, not a Zod dump", () => {
    try {
      parseOrThrow(searchParamsSchema, { q: "x" });
      throw new Error("expected parseOrThrow to throw");
    } catch (error) {
      expect(error).toBeInstanceOf(InvalidInputError);
      expect((error as InvalidInputError).publicMessage).toBe("Enter at least 2 characters to search.");
    }
  });
});
