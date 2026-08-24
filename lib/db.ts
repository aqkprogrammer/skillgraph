import "server-only";

import neo4j, { type Driver, type QueryResult, type Record as Neo4jRecord } from "neo4j-driver";

import { readDatabaseConfig } from "@/lib/config";
import { toCypherParams } from "@/lib/cypher-params";
import { DatabaseConfigError, DatabaseUnavailableError } from "@/lib/errors";

/**
 * The only place the web application talks to CognoDB.
 *
 * CognoDB speaks the Bolt protocol and openCypher, so the official Neo4j
 * JavaScript driver connects to it unchanged — only the URI and credentials
 * differ from a self-hosted Neo4j.
 *
 * Two things here are deliberate:
 *
 *  1. `import "server-only"` makes it a build error for a client component to
 *     pull this module in, so credentials cannot reach the browser bundle.
 *  2. The driver is a long-lived singleton because it owns a connection pool —
 *     one per request would mean a TLS handshake per request. Sessions are the
 *     cheap, short-lived part: one per query, always closed in a `finally`.
 */

/**
 * Next.js re-evaluates modules on every edit in development, which would leak a
 * driver (and its pool) per hot reload. Caching on globalThis keeps exactly one.
 */
const globalForDriver = globalThis as typeof globalThis & {
  __skillgraphDriver?: Driver;
  __skillgraphDatabase?: string;
};

export function getDriver(): Driver {
  const existing = globalForDriver.__skillgraphDriver;
  if (existing) return existing;

  const config = readDatabaseConfig();

  const driver = neo4j.driver(
    config.uri,
    neo4j.auth.basic(config.username, config.password),
    {
      // Cypher integers are 64-bit, so the driver returns its own Integer
      // objects by default and those do not JSON.stringify cleanly. Every
      // number this app reads is a small count, so plain JS numbers are safe.
      disableLosslessIntegers: true,
      // A CognoDB free instance is small; a modest pool avoids exhausting it.
      maxConnectionPoolSize: 10,
      connectionAcquisitionTimeout: 10_000,
      connectionTimeout: 10_000,
      maxTransactionRetryTime: 8_000,
    },
  );

  globalForDriver.__skillgraphDriver = driver;
  globalForDriver.__skillgraphDatabase = config.database;
  return driver;
}

/**
 * Runs one parameterised read query and maps each record with `mapRecord`.
 *
 * Every Cypher statement the application executes goes through this function,
 * which guarantees that:
 *   - the session is closed even when the query throws;
 *   - the query is routed as a read;
 *   - driver failures become a safe DatabaseUnavailableError before they can
 *     reach a route handler and leak connection detail to the browser.
 *
 * `params` is the only channel for user input — no caller concatenates Cypher.
 */
export async function readQuery<T>(
  cypher: string,
  params: Record<string, unknown>,
  mapRecord: (record: Neo4jRecord) => T,
): Promise<T[]> {
  const session = getDriver().session({
    defaultAccessMode: neo4j.session.READ,
    database: globalForDriver.__skillgraphDatabase,
  });

  try {
    // toCypherParams turns JS integers into Bolt integers — without it,
    // `LIMIT $limit` arrives as `LIMIT 10.0` and the server rejects it.
    const result: QueryResult = await session.run(cypher, toCypherParams(params));
    return result.records.map(mapRecord);
  } catch (error) {
    throw toDatabaseError(error);
  } finally {
    await session.close();
  }
}

/** Verifies the driver can actually reach CognoDB. Used by /api/health. */
export async function verifyConnection(): Promise<void> {
  try {
    await getDriver().verifyConnectivity();
  } catch (error) {
    throw toDatabaseError(error);
  }
}

/**
 * Converts anything thrown by the driver into an application error.
 *
 * Configuration errors pass through untouched; everything else becomes a
 * DatabaseUnavailableError whose *internal* message keeps the driver detail for
 * the server log while its public message stays generic.
 */
export function toDatabaseError(error: unknown): Error {
  if (error instanceof DatabaseConfigError || error instanceof DatabaseUnavailableError) {
    return error;
  }
  const detail = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
  return new DatabaseUnavailableError(detail);
}
