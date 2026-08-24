import { describe, expect, it } from "vitest";

import {
  CATEGORIES_WITH_SKILLS,
  GRAPH_DEPTHS,
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
} from "@/lib/queries";
import { FETCH_PATH_ENDPOINTS } from "@/lib/queries/paths";

/**
 * Properties every query in the application must hold.
 *
 * These are cheap to check and they guard the two rules that matter most: no
 * value is ever concatenated into Cypher, and no traversal is unbounded.
 */

const ALL_QUERIES: Record<string, string> = {
  SEARCH_NODES,
  LIST_SKILLS,
  LIST_ROLES,
  GRAPH_STATS,
  TOP_SKILLS_BY_DEMAND,
  CATEGORIES_WITH_SKILLS,
  SKILL_DETAIL,
  ROLES_REACHABLE_FROM_SKILL,
  ROLE_DETAIL,
  SHORTEST_LEARNING_PATH,
  FETCH_PATH_ENDPOINTS,
  SKILL_RECOMMENDATIONS,
  REACHABLE_WITHIN_THREE_HOPS,
  ...Object.fromEntries(
    GRAPH_DEPTHS.map((depth) => [`GRAPH_NEIGHBOURHOOD[${depth}]`, GRAPH_NEIGHBOURHOOD[depth]]),
  ),
};

describe("every Cypher query", () => {
  it.each(Object.entries(ALL_QUERIES))("%s contains no template interpolation", (_name, cypher) => {
    // A `${` surviving into the query text would mean a value was concatenated
    // in rather than passed as a parameter.
    expect(cypher).not.toContain("${");
    expect(cypher).not.toContain("__DEPTH__");
  });

  it.each(Object.entries(ALL_QUERIES))("%s never writes", (_name, cypher) => {
    // The web application is read-only; only the seed script mutates the graph.
    expect(cypher).not.toMatch(/\b(CREATE|MERGE|DELETE|SET|REMOVE|DROP)\b/);
  });

  it.each(Object.entries(ALL_QUERIES))("%s bounds any variable-length traversal", (_name, cypher) => {
    // `[*]` or `[*2..]` with no upper bound could walk the entire graph.
    const unbounded = cypher.match(/\[[^\]]*\*(?!\s*\.?\.?\s*\d)[^\]]*\]/g) ?? [];
    expect(unbounded).toEqual([]);
  });
});

describe("engine portability", () => {
  /**
   * No query may use a pattern predicate — a graph pattern used as a boolean in
   * a WHERE clause, e.g. `WHERE NOT (role)-[:REQUIRES]->(skill)`.
   *
   * It is valid openCypher and works on Neo4j, but CognoDB evaluates it as a
   * constant `true`, so a negated one silently discards every row. No error is
   * raised — the query just returns nothing, or returns rows it should have
   * filtered out. Two features shipped broken against CognoDB because of this
   * and only `npm run verify` caught it.
   *
   * The portable equivalent is an anti-join through a collected id list, which
   * behaves identically on both engines.
   */
  it.each(Object.entries(ALL_QUERIES))("%s uses no pattern predicate", (_name, cypher) => {
    const offending = cypher
      .split("\n")
      .map((line) => line.trim())
      // Cypher `//` comments are documentation, not executed predicates.
      .filter((line) => !line.startsWith("//"))
      .filter((line) => /^(WHERE|AND|OR|NOT)\b/i.test(line))
      // A predicate line containing `)-[` or `)<-[` is a pattern used as a boolean.
      .filter((line) => /\)\s*<?-\[/.test(line));

    expect(offending).toEqual([]);
  });

  it("excludes direct roles with a list anti-join rather than a pattern predicate", () => {
    expect(ROLES_REACHABLE_FROM_SKILL).toContain("NOT role.id IN directRoleIds");
    expect(ROLES_REACHABLE_FROM_SKILL).not.toMatch(/AND\s+NOT\s+\(role\)/);
  });

  it("excludes already-required skills from gaps with a list anti-join", () => {
    expect(ROLE_DETAIL).toContain("NOT gap.id IN");
    expect(ROLE_DETAIL).not.toMatch(/AND\s+NOT\s+\(role\)/);
  });
});

describe("search", () => {
  it("takes the term and the limit as parameters", () => {
    expect(SEARCH_NODES).toContain("$query");
    expect(SEARCH_NODES).toContain("$limit");
  });

  it("searches every label a user can land on", () => {
    for (const label of ["n:Skill", "n:Role", "n:Technology", "n:Resource"]) {
      expect(SEARCH_NODES).toContain(label);
    }
  });

  it("ranks exact and prefix matches above substring matches", () => {
    expect(SEARCH_NODES).toContain("STARTS WITH");
    expect(SEARCH_NODES).toContain("ORDER BY rank");
  });
});

describe("multi-hop traversal", () => {
  it("walks at least two relationships before reaching a role", () => {
    // 1–3 skill hops, then one REQUIRES hop backwards from the role.
    expect(ROLES_REACHABLE_FROM_SKILL).toContain("[:PREREQUISITE_FOR|RELATED_TO*1..3]");
    expect(ROLES_REACHABLE_FROM_SKILL).toContain("<-[:REQUIRES]-(role:Role)");
  });

  it("excludes roles that already require the starting skill", () => {
    expect(ROLES_REACHABLE_FROM_SKILL).toContain("NOT (role)-[:REQUIRES]->(start)");
  });
});

describe("learning path", () => {
  it("uses shortestPath with a bounded depth and parameterised endpoints", () => {
    expect(SHORTEST_LEARNING_PATH).toContain("shortestPath(");
    expect(SHORTEST_LEARNING_PATH).toContain("*..5");
    expect(SHORTEST_LEARNING_PATH).toContain("$fromId");
    expect(SHORTEST_LEARNING_PATH).toContain("$toId");
  });
});

describe("graph neighbourhood", () => {
  it("materialises one literal-depth query per allowed depth", () => {
    expect(Object.keys(GRAPH_NEIGHBOURHOOD).map(Number).sort()).toEqual([...GRAPH_DEPTHS]);

    for (const depth of GRAPH_DEPTHS) {
      expect(GRAPH_NEIGHBOURHOOD[depth]).toContain(`[*1..${depth}]`);
    }
  });

  it("caps the number of nodes returned", () => {
    for (const depth of GRAPH_DEPTHS) {
      expect(GRAPH_NEIGHBOURHOOD[depth]).toContain("$nodeLimit");
    }
  });

  it("excludes the focus node from its own neighbourhood", () => {
    // Two or more hops can loop back to the start (React → JavaScript → React),
    // which would draw the focus node twice.
    for (const depth of GRAPH_DEPTHS) {
      expect(GRAPH_NEIGHBOURHOOD[depth]).toContain("WHERE reached <> focus");
    }
  });
});

describe("recommendations", () => {
  it("draws candidates from all four relationship patterns", () => {
    for (const kind of ["prerequisite", "next-step", "related", "role-demand"]) {
      expect(SKILL_RECOMMENDATIONS).toContain(`'${kind}'`);
    }
  });

  it("boosts candidates by how many roles require them", () => {
    expect(SKILL_RECOMMENDATIONS).toContain("roleDemand");
    expect(SKILL_RECOMMENDATIONS).toContain("count(DISTINCT demandRole)");
  });
});

describe("role exploration", () => {
  it("derives related roles through their shared skills", () => {
    expect(ROLE_DETAIL).toContain("(role)-[:REQUIRES]->(shared:Skill)<-[:REQUIRES]-(peer:Role)");
  });

  it("finds skill gaps by walking peers and excluding what the role already has", () => {
    // The three-hop pattern: role → shared skill → peer role → the peer's skill.
    expect(ROLE_DETAIL).toContain(
      "(role)-[:REQUIRES]->(:Skill)<-[:REQUIRES]-(neighbour:Role)-[:REQUIRES]->(gap:Skill)",
    );
    // …minus the skills this role already requires. See the portability tests
    // for why this is a list anti-join and not `NOT (role)-[:REQUIRES]->(gap)`.
    expect(ROLE_DETAIL).toContain("NOT gap.id IN [required IN requiredSkillNodes | required.id]");
  });
});
