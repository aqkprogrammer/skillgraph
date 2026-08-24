/**
 * Test stub for the `server-only` package.
 *
 * `server-only` throws on import outside a React Server Component, which is
 * exactly the guard we want in the application — but it also means a plain
 * Node test process cannot import lib/db.ts. Aliasing it to this empty module
 * in vitest.config.ts lets the tests reach the code without weakening the
 * guarantee in the real build.
 */
export {};
