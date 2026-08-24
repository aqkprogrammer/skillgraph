/**
 * Executes every Cypher query in the application against a live database and
 * prints what comes back.
 *
 *   npm run verify
 *
 * A development aid, not part of the web app. The unit tests assert properties
 * of the *query text*; this asserts that the queries actually parse and return
 * the expected shape on a real Bolt endpoint. Useful right after pointing
 * .env.local at a fresh CognoDB instance.
 *
 * Like the seed script it owns its driver rather than importing lib/db.ts,
 * which is marked `server-only` and cannot be loaded outside Next.js.
 */

import { config as loadEnv } from "dotenv";
import neo4j, { type Session } from "neo4j-driver";

import { readDatabaseConfig } from "../lib/config";
import { toCypherParams } from "../lib/cypher-params";
import {
  CATEGORIES_WITH_SKILLS,
  GRAPH_NEIGHBOURHOOD,
  GRAPH_STATS,
  LIST_ROLES,
  LIST_SKILLS,
  REACHABLE_WITHIN_THREE_HOPS,
  ROLES_REACHABLE_FROM_SKILL,
  ROLE_DETAIL,
  SEARCH_NODES,
  SHORTEST_LEARNING_PATH,
  SKILL_DETAIL,
  SKILL_RECOMMENDATIONS,
  TOP_SKILLS_BY_DEMAND,
} from "../lib/queries";
import { FETCH_PATH_ENDPOINTS } from "../lib/queries/paths";

loadEnv({ path: ".env.local" });
loadEnv({ path: ".env" });

interface Case {
  name: string;
  cypher: string;
  params: Record<string, unknown>;
  /** Formats one row for the console. */
  show: (row: Record<string, unknown>) => string;
  /** Rows to print; the rest are summarised as a count. */
  preview?: number;
  /** Set when returning nothing is the expected, correct answer. */
  emptyIsValid?: boolean;
  /**
   * Asserts the query's *contract*, not just that it returned something.
   * Returns a problem description, or null when the result is correct.
   *
   * This exists because of a real failure: on CognoDB a negative pattern
   * predicate silently matched nothing, so two queries returned empty results
   * with no error at all. A "did it return rows?" check calls that a pass. An
   * assertion about what the rows must satisfy does not.
   */
  expect?: (rows: Record<string, unknown>[]) => string | null;
}

const name = (value: unknown) => (value as { name?: string; title?: string })?.name ?? "?";
const names = (value: unknown) => (Array.isArray(value) ? value.map(name).join(", ") : "");

const CASES: Case[] = [
  {
    name: "GRAPH_STATS",
    cypher: GRAPH_STATS,
    params: {},
    show: (r) =>
      `${r.skills} skills · ${r.roles} roles · ${r.technologies} tech · ${r.resources} resources · ${r.categories} categories · ${r.relationships} relationships`,
  },
  {
    name: "SEARCH_NODES  q='react'",
    cypher: SEARCH_NODES,
    params: { query: "react", limit: 10 },
    show: (r) => `${r.name} [${r.label}]`,
    preview: 10,
  },
  {
    name: "SEARCH_NODES  q='engineer'",
    cypher: SEARCH_NODES,
    params: { query: "engineer", limit: 5 },
    show: (r) => `${r.name} [${r.label}]`,
    preview: 5,
  },
  {
    name: "SEARCH_NODES  q='zzzz' (expects no rows)",
    cypher: SEARCH_NODES,
    params: { query: "zzzz", limit: 5 },
    show: (r) => String(r.name),
    emptyIsValid: true,
  },
  {
    name: "SKILL_DETAIL  react",
    cypher: SKILL_DETAIL,
    params: { skillId: "react" },
    show: (r) =>
      [
        `prerequisites: ${names(r.prerequisites)}`,
        `unlocks:       ${names(r.unlocks)}`,
        `related:       ${names(r.relatedSkills)}`,
        `roles:         ${names(r.roles)}`,
        `technologies:  ${names(r.technologies)}`,
        `categories:    ${names(r.categories)}`,
        `resources:     ${(r.resources as unknown[]).length}`,
      ].join("\n        "),
  },
  {
    name: "SKILL_DETAIL  git (checks empty sections)",
    cypher: SKILL_DETAIL,
    params: { skillId: "git" },
    show: (r) =>
      `prerequisites=${(r.prerequisites as unknown[]).length} unlocks=${(r.unlocks as unknown[]).length} roles=${(r.roles as unknown[]).length}`,
  },
  {
    name: "ROLES_REACHABLE_FROM_SKILL  react (multi-hop)",
    cypher: ROLES_REACHABLE_FROM_SKILL,
    params: { skillId: "react", limit: 6 },
    show: (r) => `${name(r.role)} — ${r.hops} hops via ${(r.via as string[]).join(" → ")}`,
    preview: 6,
    expect: (rows) => {
      // Frontend Engineer and Full Stack Engineer require React directly, so the
      // whole point of this query is that they must NOT appear here.
      const direct = ["Frontend Engineer", "Full Stack Engineer"];
      const leaked = rows.map((r) => name(r.role)).filter((n) => direct.includes(n));
      if (leaked.length > 0) return `roles that require React directly leaked in: ${leaked.join(", ")}`;
      if (rows.every((r) => Number(r.hops) < 2)) return "every result is under 2 hops away";
      return null;
    },
  },
  {
    name: "ROLES_REACHABLE_FROM_SKILL  statistics",
    cypher: ROLES_REACHABLE_FROM_SKILL,
    params: { skillId: "statistics", limit: 4 },
    show: (r) => `${name(r.role)} — ${r.hops} hops via ${(r.via as string[]).join(" → ")}`,
    preview: 4,
  },
  {
    name: "FETCH_PATH_ENDPOINTS  javascript / machine-learning",
    cypher: FETCH_PATH_ENDPOINTS,
    params: { fromId: "javascript", toId: "machine-learning" },
    show: (r) => `${r.name}`,
    preview: 2,
  },
  {
    name: "SHORTEST_LEARNING_PATH  javascript → machine-learning",
    cypher: SHORTEST_LEARNING_PATH,
    params: { fromId: "javascript", toId: "machine-learning" },
    expect: (rows) => {
      const nodes = rows[0]?.nodes as { id: string }[] | undefined;
      if (!nodes || nodes.length < 2) return "path has fewer than two nodes";
      if (nodes[0]?.id !== "javascript") return `path starts at ${nodes[0]?.id}, not javascript`;
      if (nodes[nodes.length - 1]?.id !== "machine-learning") return "path does not end at machine-learning";
      const rels = rows[0]?.relationships as unknown[];
      if (rels.length !== nodes.length - 1) return "relationship count does not match the node count";
      return null;
    },
    show: (r) => {
      const nodes = r.nodes as { name: string }[];
      const rels = r.relationships as { type: string; startId: string }[];
      const parts = nodes.map((node, index) =>
        index === 0 ? node.name : `-[${rels[index - 1]?.type}]- ${node.name}`,
      );
      return parts.join(" ");
    },
  },
  {
    name: "SHORTEST_LEARNING_PATH  html-css → kubernetes",
    cypher: SHORTEST_LEARNING_PATH,
    params: { fromId: "html-css", toId: "kubernetes" },
    show: (r) => (r.nodes as { name: string }[]).map((n) => n.name).join(" → "),
    emptyIsValid: true,
  },
  {
    name: "SKILL_RECOMMENDATIONS  react",
    cypher: SKILL_RECOMMENDATIONS,
    params: { skillId: "react", limit: 6 },
    expect: (rows) => {
      if (rows.some((r) => name(r.skill) === "React")) return "React recommended to itself";
      const scores = rows.map((r) => Number(r.score));
      if (scores.some((s, i) => i > 0 && s > Number(scores[i - 1]))) return "results are not ordered by score";
      if (!rows.some((r) => r.kind === "prerequisite")) return "no prerequisite surfaced for React";
      return null;
    },
    show: (r) =>
      `${name(r.skill).padEnd(22)} ${String(r.kind).padEnd(13)} score=${String(r.score).padStart(3)} demand=${r.roleDemand} resource=${(r.topResource as { title?: string } | null)?.title ?? "—"}`,
    preview: 6,
  },
  {
    name: "SKILL_RECOMMENDATIONS  machine-learning",
    cypher: SKILL_RECOMMENDATIONS,
    params: { skillId: "machine-learning", limit: 5 },
    show: (r) => `${name(r.skill).padEnd(22)} ${String(r.kind).padEnd(13)} score=${r.score}`,
    preview: 5,
  },
  {
    name: "ROLE_DETAIL  ml-engineer",
    cypher: ROLE_DETAIL,
    params: { roleId: "ml-engineer", relatedLimit: 5, gapLimit: 8 },
    expect: (rows) => {
      const row = rows[0];
      if (!row) return "no row";
      const required = new Set((row.requiredSkills as { id: string }[]).map((s) => s.id));
      const gaps = row.skillGaps as { id: string; requiredByRoles: string[] }[];
      const related = row.relatedRoles as unknown[];
      if (related.length === 0) return "no related roles — the shared-skill walk returned nothing";
      if (gaps.length === 0) return "no skill gaps — the anti-join returned nothing";
      // A "gap" the role already has would mean the exclusion silently failed.
      const wrong = gaps.filter((g) => required.has(g.id)).map((g) => g.id);
      if (wrong.length > 0) return `skills the role already requires listed as gaps: ${wrong.join(", ")}`;
      if (gaps.some((g) => g.requiredByRoles.length === 0)) return "a gap names no role that wants it";
      return null;
    },
    show: (r) =>
      [
        `required:   ${names(r.requiredSkills)}`,
        `technology: ${names(r.technologies)}`,
        `resources:  ${(r.resources as unknown[]).length}`,
        `related:    ${(r.relatedRoles as { name: string; sharedSkillCount: number }[]).map((x) => `${x.name}(${x.sharedSkillCount})`).join(", ")}`,
        `gaps:       ${(r.skillGaps as { name: string; requiredByRoles: string[] }[]).map((x) => `${x.name}←${x.requiredByRoles.length}`).join(", ")}`,
      ].join("\n        "),
  },
  {
    name: "ROLE_DETAIL  frontend-engineer",
    cypher: ROLE_DETAIL,
    params: { roleId: "frontend-engineer", relatedLimit: 3, gapLimit: 5 },
    show: (r) =>
      `related=${(r.relatedRoles as { name: string }[]).map((x) => x.name).join(", ")} | gaps=${(r.skillGaps as { name: string }[]).map((x) => x.name).join(", ")}`,
  },
  ...([1, 2, 3] as const).map<Case>((depth) => ({
    name: `GRAPH_NEIGHBOURHOOD[${depth}]  react`,
    cypher: GRAPH_NEIGHBOURHOOD[depth],
    params: { focusId: "react", nodeLimit: 40 },
    show: (r) =>
      `${(r.nodes as unknown[]).length} nodes, ${(r.relationships as unknown[]).length} relationships, truncated=${r.truncated}`,
    expect: (rows) => {
      const nodes = rows[0]?.nodes as { id: string; depth: number }[];
      const edges = rows[0]?.relationships as { id: string; source: string; target: string }[];
      const ids = nodes.map((n) => n.id);
      if (new Set(ids).size !== ids.length) return "duplicate node ids";
      if (ids.filter((id) => id === "react").length !== 1) return "focus node missing or duplicated";
      if (new Set(edges.map((e) => e.id)).size !== edges.length) return "duplicate edge ids";
      const known = new Set(ids);
      const dangling = edges.filter((e) => !known.has(e.source) || !known.has(e.target));
      if (dangling.length > 0) return `${dangling.length} edges point outside the returned node set`;
      if (nodes.some((n) => n.depth > depth)) return "a node exceeds the requested depth";
      return null;
    },
  })),
  {
    name: "REACHABLE_WITHIN_THREE_HOPS  react",
    cypher: REACHABLE_WITHIN_THREE_HOPS,
    params: { focusId: "react", perLabelLimit: 5 },
    show: (r) =>
      `${String(r.label).padEnd(11)} total=${String(r.total).padStart(3)}  nearest: ${(r.items as { name: string; hops: number }[]).map((i) => `${i.name}(${i.hops})`).join(", ")}`,
    preview: 5,
  },
  {
    name: "TOP_SKILLS_BY_DEMAND",
    cypher: TOP_SKILLS_BY_DEMAND,
    params: { limit: 6 },
    show: (r) => `${String(r.name).padEnd(22)} ${r.roleDemand} roles`,
    preview: 6,
  },
  {
    name: "CATEGORIES_WITH_SKILLS",
    cypher: CATEGORIES_WITH_SKILLS,
    params: { skillsPerCategory: 3 },
    show: (r) => `${String(r.name).padEnd(24)} ${r.skillCount} skills — ${names(r.skills)}`,
    preview: 8,
  },
  {
    name: "LIST_SKILLS",
    cypher: LIST_SKILLS,
    params: {},
    show: (r) => String(r.name),
    preview: 3,
  },
  {
    name: "LIST_ROLES",
    cypher: LIST_ROLES,
    params: {},
    show: (r) => String(r.name),
    preview: 3,
  },
];

async function main(): Promise<void> {
  const settings = readDatabaseConfig();
  const driver = neo4j.driver(
    settings.uri,
    neo4j.auth.basic(settings.username, settings.password),
    { disableLosslessIntegers: true },
  );

  let failures = 0;
  const session: Session = driver.session({ database: settings.database });

  console.log("\nExecuting every query against the configured database\n");

  for (const testCase of CASES) {
    try {
      const result = await session.run(testCase.cypher, toCypherParams(testCase.params));
      const rows = result.records.map(
        (record) => Object.fromEntries(record.keys.map((key) => [key, record.get(key)])) as Record<string, unknown>,
      );

      if (rows.length === 0 && !testCase.emptyIsValid) {
        failures += 1;
        console.error(`  ✗ ${testCase.name}\n        returned no rows`);
        continue;
      }

      const problem = testCase.expect?.(rows) ?? null;
      if (problem) {
        failures += 1;
        console.error(`  ✗ ${testCase.name}\n        WRONG RESULT: ${problem}`);
        for (const row of rows.slice(0, testCase.preview ?? 1)) {
          console.error(`        ${testCase.show(row)}`);
        }
        continue;
      }

      console.log(`  ✓ ${testCase.name}`);
      if (rows.length === 0) {
        console.log("        (no rows — expected)");
      }
      for (const row of rows.slice(0, testCase.preview ?? 1)) {
        console.log(`        ${testCase.show(row)}`);
      }
      const hidden = rows.length - (testCase.preview ?? 1);
      if (hidden > 0) console.log(`        … and ${hidden} more`);
    } catch (error) {
      failures += 1;
      console.error(`  ✗ ${testCase.name}\n        ${error instanceof Error ? error.message.split("\n")[0] : error}`);
    }
  }

  await session.close();
  await driver.close();

  console.log(
    `\n${failures === 0 ? `All ${CASES.length} queries executed successfully.` : `${failures} of ${CASES.length} queries FAILED.`}\n`,
  );
  process.exitCode = failures === 0 ? 0 : 1;
}

void main();
