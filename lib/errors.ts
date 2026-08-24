/**
 * Error types shared by the database layer, the services and the API routes.
 *
 * The rule these encode: internal detail (URIs, credentials, driver stack
 * traces) is logged server-side and never travels to the browser. Routes only
 * ever read `code` and `publicMessage` off these objects.
 */

import type { ApiErrorCode } from "@/lib/types";

export class AppError extends Error {
  readonly code: ApiErrorCode;
  readonly status: number;
  /** The message that is safe to show a user. */
  readonly publicMessage: string;

  constructor(
    code: ApiErrorCode,
    status: number,
    publicMessage: string,
    /** Internal detail — logged, never serialised into a response. */
    internalMessage?: string,
  ) {
    super(internalMessage ?? publicMessage);
    this.name = new.target.name;
    this.code = code;
    this.status = status;
    this.publicMessage = publicMessage;
  }
}

/** The COGNODB_* environment variables are missing or malformed. */
export class DatabaseConfigError extends AppError {
  constructor(internalMessage: string) {
    super(
      "DATABASE_NOT_CONFIGURED",
      503,
      "The knowledge graph is not configured yet. Please try again shortly.",
      internalMessage,
    );
  }
}

/** CognoDB could not be reached, or the query failed at the driver level. */
export class DatabaseUnavailableError extends AppError {
  constructor(internalMessage: string) {
    super(
      "DATABASE_UNAVAILABLE",
      503,
      "We couldn't connect to the knowledge graph. Please try again in a moment.",
      internalMessage,
    );
  }
}

/** A requested node id does not exist in the graph. */
export class NotFoundError extends AppError {
  constructor(what: string) {
    super("NOT_FOUND", 404, `${what} could not be found.`);
  }
}

/** Query-string or route input failed validation. */
export class InvalidInputError extends AppError {
  constructor(publicMessage: string) {
    super("INVALID_INPUT", 400, publicMessage);
  }
}
