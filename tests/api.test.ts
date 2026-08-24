import { describe, expect, it, vi } from "vitest";

import { fail, ok } from "@/lib/api";
import { DatabaseUnavailableError, InvalidInputError, NotFoundError } from "@/lib/errors";

/**
 * The response envelope. The important property is negative: nothing internal
 * ever appears in the body, whatever was thrown.
 */

describe("ok", () => {
  it("wraps data in the standard envelope", async () => {
    const response = ok([{ id: "react" }]);
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ data: [{ id: "react" }], error: null });
  });

  it("carries a null result without collapsing it into an error", async () => {
    // /api/paths returns `data: null` for "no route exists", which is a
    // successful answer, not a failure.
    await expect(ok(null).json()).resolves.toEqual({ data: null, error: null });
  });
});

describe("fail", () => {
  it("returns the public message and status for a known error", async () => {
    const logs = vi.spyOn(console, "error").mockImplementation(() => {});

    const response = fail(new NotFoundError("That skill"), "GET /api/skills/:id");

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      data: null,
      error: { code: "NOT_FOUND", message: "That skill could not be found." },
    });

    logs.mockRestore();
  });

  it("never serialises the internal detail of a database failure", async () => {
    const logs = vi.spyOn(console, "error").mockImplementation(() => {});

    const response = fail(
      new DatabaseUnavailableError("Neo4jError: auth failed for bolt+s://abc.cognodb.cloud"),
      "GET /api/search",
    );
    const body = JSON.stringify(await response.json());

    expect(response.status).toBe(503);
    expect(body).not.toContain("cognodb.cloud");
    expect(body).not.toContain("auth failed");
    expect(body).toContain("We couldn't connect to the knowledge graph");

    // The detail is not lost — it goes to the server log instead.
    expect(logs).toHaveBeenCalledWith(expect.stringContaining("cognodb.cloud"));
    logs.mockRestore();
  });

  it("reduces an unexpected error to a generic 500", async () => {
    const logs = vi.spyOn(console, "error").mockImplementation(() => {});

    const response = fail(new TypeError("Cannot read property 'x' of undefined at line 42"), "GET /api/x");
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body).toEqual({
      data: null,
      error: { code: "INTERNAL_ERROR", message: "Something went wrong on our side. Please try again." },
    });
    expect(JSON.stringify(body)).not.toContain("line 42");

    logs.mockRestore();
  });

  it("maps invalid input to 400", async () => {
    const logs = vi.spyOn(console, "error").mockImplementation(() => {});
    const response = fail(new InvalidInputError("Enter at least 2 characters to search."), "GET /api/search");
    expect(response.status).toBe(400);
    logs.mockRestore();
  });
});
