/**
 * Seeds CognoDB with the SkillGraph dataset.
 *
 *   npm run seed            # create or update everything
 *   npm run seed -- --reset # delete the existing SkillGraph data first
 *
 * Safe to rerun. Every write is a MERGE keyed on the stable `id` property, so a
 * second run updates the same nodes and relationships instead of duplicating
 * them. `--reset` exists for the case MERGE cannot handle: removing data that
 * was deleted from the dataset since the last run.
 *
 * This script deliberately creates its own driver rather than importing
 * lib/db.ts. lib/db.ts is marked `server-only` so that the Next.js build fails
 * if a client component ever imports it, and that guard would also reject a
 * plain Node process. The connection settings come from the same lib/config.ts,
 * so there is exactly one definition of how the environment is read.
 */

import { config as loadEnv } from "dotenv";
import neo4j, { type Driver, type Session } from "neo4j-driver";

import { readDatabaseConfig } from "../lib/config";
import {
  categories,
  countSeedData,
  prerequisites,
  relatedSkills,
  resources,
  roles,
  skills,
  technologies,
  validateSeedData,
} from "./data";

// `.env.local` is Next.js's convention and is git-ignored; `.env` is supported
// as a fallback for hosts that only write that file.
loadEnv({ path: ".env.local" });
loadEnv({ path: ".env" });

const RESET = process.argv.includes("--reset");

/**
 * Uniqueness constraints double as indexes, so every `MATCH (s:Skill {id: ...})`
 * in the application becomes an index lookup rather than a label scan — and a
 * duplicate id becomes an error rather than a silently forked node.
 */
const CONSTRAINTS = [
  "CREATE CONSTRAINT skill_id IF NOT EXISTS FOR (n:Skill) REQUIRE n.id IS UNIQUE",
  "CREATE CONSTRAINT role_id IF NOT EXISTS FOR (n:Role) REQUIRE n.id IS UNIQUE",
  "CREATE CONSTRAINT technology_id IF NOT EXISTS FOR (n:Technology) REQUIRE n.id IS UNIQUE",
  "CREATE CONSTRAINT resource_id IF NOT EXISTS FOR (n:Resource) REQUIRE n.id IS UNIQUE",
  "CREATE CONSTRAINT category_id IF NOT EXISTS FOR (n:Category) REQUIRE n.id IS UNIQUE",
];

/**
 * Every write below follows the same shape: one statement per relationship
 * type, driven by an UNWIND over a parameter list. That means the whole seed is
 * a handful of round trips rather than one per row, and — as everywhere else in
 * this project — no value is ever concatenated into the Cypher text.
 */
const WRITES: { label: string; cypher: string; rows: () => Record<string, unknown>[] }[] = [
  {
    label: "Category nodes",
    cypher: `
      UNWIND $rows AS row
      MERGE (n:Category {id: row.id})
      SET n.name = row.name, n.description = row.description
    `,
    rows: () => categories.map((category) => ({ ...category })),
  },
  {
    label: "Skill nodes",
    cypher: `
      UNWIND $rows AS row
      MERGE (n:Skill {id: row.id})
      SET n.name = row.name,
          n.description = row.description,
          n.difficulty = row.difficulty
    `,
    rows: () =>
      skills.map(({ id, name, description, difficulty }) => ({ id, name, description, difficulty })),
  },
  {
    label: "Role nodes",
    cypher: `
      UNWIND $rows AS row
      MERGE (n:Role {id: row.id})
      SET n.name = row.name, n.description = row.description, n.level = row.level
    `,
    rows: () => roles.map(({ id, name, description, level }) => ({ id, name, description, level })),
  },
  {
    label: "Technology nodes",
    cypher: `
      UNWIND $rows AS row
      MERGE (n:Technology {id: row.id})
      SET n.name = row.name, n.description = row.description
    `,
    rows: () => technologies.map(({ id, name, description }) => ({ id, name, description })),
  },
  {
    label: "Resource nodes",
    cypher: `
      UNWIND $rows AS row
      MERGE (n:Resource {id: row.id})
      SET n.title = row.title,
          n.url = row.url,
          n.type = row.type,
          n.difficulty = row.difficulty,
          n.provider = row.provider
    `,
    rows: () =>
      resources.map(({ id, title, url, type, difficulty, provider }) => ({
        id,
        title,
        url,
        type,
        difficulty,
        provider,
      })),
  },
  {
    label: "(:Skill)-[:BELONGS_TO]->(:Category)",
    cypher: `
      UNWIND $rows AS row
      MATCH (skill:Skill {id: row.skillId})
      MATCH (category:Category {id: row.categoryId})
      MERGE (skill)-[:BELONGS_TO]->(category)
    `,
    rows: () => skills.map((skill) => ({ skillId: skill.id, categoryId: skill.category })),
  },
  {
    label: "(:Skill)-[:PREREQUISITE_FOR]->(:Skill)",
    cypher: `
      UNWIND $rows AS row
      MATCH (from:Skill {id: row.from})
      MATCH (to:Skill {id: row.to})
      MERGE (from)-[:PREREQUISITE_FOR]->(to)
    `,
    rows: () => prerequisites.map(([from, to]) => ({ from, to })),
  },
  {
    label: "(:Skill)-[:RELATED_TO]->(:Skill)",
    cypher: `
      UNWIND $rows AS row
      MATCH (a:Skill {id: row.a})
      MATCH (b:Skill {id: row.b})
      MERGE (a)-[:RELATED_TO]->(b)
    `,
    rows: () => relatedSkills.map(([a, b]) => ({ a, b })),
  },
  {
    label: "(:Role)-[:REQUIRES]->(:Skill)",
    cypher: `
      UNWIND $rows AS row
      MATCH (role:Role {id: row.roleId})
      MATCH (skill:Skill {id: row.skillId})
      MERGE (role)-[:REQUIRES]->(skill)
    `,
    rows: () =>
      roles.flatMap((role) => role.requires.map((skillId) => ({ roleId: role.id, skillId }))),
  },
  {
    label: "(:Role)-[:USES]->(:Technology)",
    cypher: `
      UNWIND $rows AS row
      MATCH (role:Role {id: row.roleId})
      MATCH (technology:Technology {id: row.technologyId})
      MERGE (role)-[:USES]->(technology)
    `,
    rows: () =>
      roles.flatMap((role) => role.uses.map((technologyId) => ({ roleId: role.id, technologyId }))),
  },
  {
    label: "(:Technology)-[:BUILDS_ON]->(:Technology)",
    cypher: `
      UNWIND $rows AS row
      MATCH (from:Technology {id: row.from})
      MATCH (to:Technology {id: row.to})
      MERGE (from)-[:BUILDS_ON]->(to)
    `,
    rows: () =>
      technologies.flatMap((technology) =>
        technology.buildsOn.map((to) => ({ from: technology.id, to })),
      ),
  },
  {
    label: "(:Technology)-[:REQUIRES_SKILL]->(:Skill)",
    cypher: `
      UNWIND $rows AS row
      MATCH (technology:Technology {id: row.technologyId})
      MATCH (skill:Skill {id: row.skillId})
      MERGE (technology)-[:REQUIRES_SKILL]->(skill)
    `,
    rows: () =>
      technologies.flatMap((technology) =>
        technology.requiresSkill.map((skillId) => ({ technologyId: technology.id, skillId })),
      ),
  },
  {
    label: "(:Skill)-[:TAUGHT_BY]->(:Resource)",
    cypher: `
      UNWIND $rows AS row
      MATCH (skill:Skill {id: row.skillId})
      MATCH (resource:Resource {id: row.resourceId})
      MERGE (skill)-[:TAUGHT_BY]->(resource)
    `,
    rows: () =>
      resources.flatMap((resource) =>
        resource.teaches.map((skillId) => ({ resourceId: resource.id, skillId })),
      ),
  },
];

/** Deletes only SkillGraph's own labels, never anything else in the database. */
const RESET_STATEMENTS = [
  "MATCH (n:Skill) DETACH DELETE n",
  "MATCH (n:Role) DETACH DELETE n",
  "MATCH (n:Technology) DETACH DELETE n",
  "MATCH (n:Resource) DETACH DELETE n",
  "MATCH (n:Category) DETACH DELETE n",
];

const VERIFY = `
MATCH (n)
WITH
  count(CASE WHEN n:Skill      THEN 1 END) AS skills,
  count(CASE WHEN n:Role       THEN 1 END) AS roles,
  count(CASE WHEN n:Technology THEN 1 END) AS technologies,
  count(CASE WHEN n:Resource   THEN 1 END) AS resources,
  count(CASE WHEN n:Category   THEN 1 END) AS categories
OPTIONAL MATCH ()-[r]->()
RETURN skills, roles, technologies, resources, categories, count(r) AS relationships
`;

async function run(session: Session, cypher: string, params: Record<string, unknown> = {}) {
  await session.run(cypher, params);
}

async function main(): Promise<void> {
  const problems = validateSeedData();
  if (problems.length > 0) {
    console.error("Seed data is inconsistent — nothing was written:\n");
    for (const problem of problems) console.error(`  • ${problem}`);
    process.exitCode = 1;
    return;
  }

  const expected = countSeedData();
  console.log(
    `Seeding ${expected.skills} skills, ${expected.roles} roles, ${expected.technologies} technologies, ` +
      `${expected.resources} resources, ${expected.categories} categories ` +
      `and ${expected.relationships} relationships.\n`,
  );

  const settings = readDatabaseConfig();
  // Log the host only — never the full URI with credentials, and never the password.
  console.log(`Connecting to ${new URL(settings.uri.replace(/^bolt/, "http")).host} …`);

  const driver: Driver = neo4j.driver(
    settings.uri,
    neo4j.auth.basic(settings.username, settings.password),
    { disableLosslessIntegers: true },
  );

  try {
    await driver.verifyConnectivity();
    console.log("Connected.\n");
  } catch (error) {
    console.error(
      "Could not connect to CognoDB. Check COGNODB_URI, COGNODB_USERNAME and COGNODB_PASSWORD in .env.local.",
    );
    console.error(error instanceof Error ? `  ${error.message}` : error);
    process.exitCode = 1;
    await driver.close();
    return;
  }

  const session = driver.session({ database: settings.database });

  try {
    // Constraints are best-effort: a managed instance may not grant schema
    // privileges, and the seed is still correct without them (MERGE on `id`
    // keeps the data consistent either way) — it is just slower.
    for (const constraint of CONSTRAINTS) {
      try {
        await run(session, constraint);
      } catch (error) {
        console.warn(
          `  ! Skipped a constraint (${error instanceof Error ? error.message.split("\n")[0] : "unknown error"})`,
        );
      }
    }
    console.log("Constraints ensured.");

    if (RESET) {
      for (const statement of RESET_STATEMENTS) await run(session, statement);
      console.log("Existing SkillGraph data removed (--reset).");
    }

    for (const write of WRITES) {
      const rows = write.rows();
      await run(session, write.cypher, { rows });
      console.log(`  ✓ ${write.label} (${rows.length})`);
    }

    const result = await session.run(VERIFY);
    const record = result.records[0];
    console.log("\nGraph now contains:");
    if (record) {
      for (const key of record.keys) {
        console.log(`  ${String(key).padEnd(15)} ${record.get(key)}`);
      }
    }
    console.log("\nDone. Start the app with `npm run dev`.");
  } catch (error) {
    console.error("\nSeeding failed:", error instanceof Error ? error.message : error);
    process.exitCode = 1;
  } finally {
    await session.close();
    await driver.close();
  }
}

void main();
