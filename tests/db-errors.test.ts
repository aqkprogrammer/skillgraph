import { describe, expect, it } from "vitest";

import { toDatabaseError } from "@/lib/db";
import {
  DatabaseConfigError,
  DatabaseUnavailableError,
  InvalidInputError,
  NotFoundError,
} from "@/lib/errors";

/**
 * The contract that keeps internal detail off the screen: whatever the driver
 * throws, the user sees one generic sentence and the server log keeps the rest.
 */

describe("toDatabaseError", () => {
  it("wraps a driver failure without exposing it", () => {
    const driverError = Object.assign(
      new Error("Failed to connect to bolt+s://abc.databases.cognodb.cloud:7687 (auth failed)"),
      { name: "Neo4jError" },
    );

    const wrapped = toDatabaseError(driverError);

    expect(wrapped).toBeInstanceOf(DatabaseUnavailableError);
    // Internal message keeps the diagnostic detail for the log …
    expect(wrapped.message).toContain("cognodb.cloud");
    // … while the message that ships to the browser says nothing about it.
    const publicMessage = (wrapped as DatabaseUnavailableError).publicMessage;
    expect(publicMessage).not.toContain("cognodb.cloud");
    expect(publicMessage).not.toContain("auth");
    expect(publicMessage).toBe(
      "We couldn't connect to the knowledge graph. Please try again in a moment.",
    );
  });

  it("passes a configuration error through unchanged", () => {
    const configError = new DatabaseConfigError("COGNODB_PASSWORD missing");
    expect(toDatabaseError(configError)).toBe(configError);
  });

  it("handles a non-Error being thrown", () => {
    const wrapped = toDatabaseError("socket hang up");
    expect(wrapped).toBeInstanceOf(DatabaseUnavailableError);
    expect(wrapped.message).toContain("socket hang up");
  });
});

describe("application errors", () => {
  it("maps each error to the right HTTP status and code", () => {
    expect(new NotFoundError("That skill").status).toBe(404);
    expect(new NotFoundError("That skill").code).toBe("NOT_FOUND");
    expect(new InvalidInputError("Pick two skills.").status).toBe(400);
    expect(new DatabaseUnavailableError("pool exhausted").status).toBe(503);
    expect(new DatabaseConfigError("missing uri").code).toBe("DATABASE_NOT_CONFIGURED");
  });

  it("writes NotFound messages for a person to read", () => {
    expect(new NotFoundError("That role").publicMessage).toBe("That role could not be found.");
  });
});
