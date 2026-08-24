import { describe, expect, it } from "vitest";

import { readDatabaseConfig } from "@/lib/config";
import { DatabaseConfigError } from "@/lib/errors";

/**
 * Configuration handling is the one part of the database layer that can be
 * tested without a database, and it is the part most likely to be wrong on a
 * fresh clone or a first deploy — so it is worth covering properly.
 */

const VALID: Record<string, string> = {
  COGNODB_URI: "bolt+s://abc123.databases.cognodb.cloud",
  COGNODB_USERNAME: "cognodb",
  COGNODB_PASSWORD: "s3cret",
};

describe("readDatabaseConfig", () => {
  it("reads a complete configuration", () => {
    expect(readDatabaseConfig(VALID)).toEqual({
      uri: "bolt+s://abc123.databases.cognodb.cloud",
      username: "cognodb",
      password: "s3cret",
      database: undefined,
    });
  });

  it("trims surrounding whitespace, which copy-paste from a console adds", () => {
    const config = readDatabaseConfig({
      COGNODB_URI: "  bolt+s://abc123.databases.cognodb.cloud  ",
      COGNODB_USERNAME: " cognodb ",
      COGNODB_PASSWORD: " s3cret\n",
    });

    expect(config.uri).toBe("bolt+s://abc123.databases.cognodb.cloud");
    expect(config.password).toBe("s3cret");
  });

  it("passes through an explicit database name", () => {
    expect(readDatabaseConfig({ ...VALID, COGNODB_DATABASE: "neo4j" }).database).toBe("neo4j");
  });

  it("treats an empty database name as unset rather than as a real name", () => {
    expect(readDatabaseConfig({ ...VALID, COGNODB_DATABASE: "  " }).database).toBeUndefined();
  });

  it.each(["COGNODB_URI", "COGNODB_USERNAME", "COGNODB_PASSWORD"])(
    "throws when %s is missing",
    (variable) => {
      const env = { ...VALID };
      delete env[variable];
      expect(() => readDatabaseConfig(env)).toThrow(DatabaseConfigError);
    },
  );

  it("names every missing variable at once, so one run fixes them all", () => {
    try {
      readDatabaseConfig({});
      throw new Error("expected readDatabaseConfig to throw");
    } catch (error) {
      expect(error).toBeInstanceOf(DatabaseConfigError);
      const message = (error as DatabaseConfigError).message;
      expect(message).toContain("COGNODB_URI");
      expect(message).toContain("COGNODB_USERNAME");
      expect(message).toContain("COGNODB_PASSWORD");
    }
  });

  it("rejects a URI the Bolt driver cannot use", () => {
    expect(() =>
      readDatabaseConfig({ ...VALID, COGNODB_URI: "https://abc123.databases.cognodb.cloud" }),
    ).toThrow(/must start with/);
  });

  it.each(["bolt://", "bolt+s://", "bolt+ssc://", "neo4j://", "neo4j+s://", "neo4j+ssc://"])(
    "accepts the %s scheme",
    (scheme) => {
      expect(() => readDatabaseConfig({ ...VALID, COGNODB_URI: `${scheme}host` })).not.toThrow();
    },
  );

  it("never puts the password into the error message", () => {
    try {
      readDatabaseConfig({ ...VALID, COGNODB_URI: "ftp://nope" });
      throw new Error("expected readDatabaseConfig to throw");
    } catch (error) {
      expect((error as Error).message).not.toContain("s3cret");
    }
  });
});

describe("DatabaseConfigError", () => {
  it("keeps the diagnostic message internal and shows a generic one to users", () => {
    const error = new DatabaseConfigError("COGNODB_PASSWORD missing on host db-7");

    expect(error.message).toContain("db-7");
    expect(error.publicMessage).not.toContain("db-7");
    expect(error.publicMessage).toMatch(/not configured/i);
    expect(error.status).toBe(503);
  });
});
