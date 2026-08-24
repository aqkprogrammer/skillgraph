import { DatabaseConfigError } from "@/lib/errors";

/**
 * CognoDB connection settings, read from the environment.
 *
 * This module is deliberately free of the driver and of `server-only`: it is
 * pure, unit-testable, and shared by both the web application (lib/db.ts) and
 * the seed script (scripts/seed.ts).
 */
export interface DatabaseConfig {
  uri: string;
  username: string;
  password: string;
  /** Optional logical database. Undefined means "use the instance default". */
  database?: string;
}

/**
 * Just the variables this module reads. Typing the parameter this way rather
 * than as `NodeJS.ProcessEnv` keeps the function callable with a plain object,
 * which is what makes it testable without touching the real environment.
 */
export type EnvSource = Partial<Record<string, string>>;

/** URI schemes the Bolt driver understands. CognoDB issues `bolt+s://`. */
export const VALID_URI_SCHEMES = [
  "bolt://",
  "bolt+s://",
  "bolt+ssc://",
  "neo4j://",
  "neo4j+s://",
  "neo4j+ssc://",
] as const;

/**
 * Reads and validates the CognoDB connection settings.
 *
 * Called lazily rather than at import time so that `next build` succeeds on a
 * machine with no credentials — the failure belongs at request time, where it
 * can be turned into a friendly error state, not at build time.
 *
 * @throws DatabaseConfigError when a variable is missing or the URI scheme is
 *         not one the Bolt driver understands.
 */
export function readDatabaseConfig(env: EnvSource = process.env): DatabaseConfig {
  const uri = env.COGNODB_URI?.trim();
  const username = env.COGNODB_USERNAME?.trim();
  const password = env.COGNODB_PASSWORD?.trim();
  const database = env.COGNODB_DATABASE?.trim();

  const missing = (
    [
      ["COGNODB_URI", uri],
      ["COGNODB_USERNAME", username],
      ["COGNODB_PASSWORD", password],
    ] as const
  )
    .filter(([, value]) => !value)
    .map(([name]) => name);

  if (missing.length > 0) {
    throw new DatabaseConfigError(
      `Missing required environment variable(s): ${missing.join(", ")}. ` +
        "Copy .env.example to .env.local and fill in your CognoDB credentials.",
    );
  }

  // The check above guarantees these are set; this narrows the types.
  if (!uri || !username || !password) {
    throw new DatabaseConfigError("Unreachable: configuration already validated.");
  }

  if (!VALID_URI_SCHEMES.some((scheme) => uri.startsWith(scheme))) {
    throw new DatabaseConfigError(
      `COGNODB_URI must start with one of: ${VALID_URI_SCHEMES.join(", ")}. ` +
        "A CognoDB instance URI normally looks like bolt+s://<instance-id>.databases.cognodb.cloud",
    );
  }

  return { uri, username, password, database: database || undefined };
}
