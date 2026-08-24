import { describe, expect, it } from "vitest";

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
} from "@/scripts/data";

/**
 * The dataset is hand-written, so these tests are the safety net that catches a
 * typo before it reaches CognoDB — where MERGE would silently invent an empty
 * node for a mistyped id rather than failing.
 */

describe("seed dataset integrity", () => {
  it("has no dangling references, duplicate ids or isolated skills", () => {
    expect(validateSeedData()).toEqual([]);
  });

  it("gives every node a slug-shaped id, matching what the API accepts", () => {
    const everyId = [
      ...categories.map((n) => n.id),
      ...skills.map((n) => n.id),
      ...roles.map((n) => n.id),
      ...technologies.map((n) => n.id),
      ...resources.map((n) => n.id),
    ];

    for (const id of everyId) {
      expect(id, `"${id}" is not a valid slug`).toMatch(/^[a-z0-9][a-z0-9-]*$/);
    }
  });

  it("points every resource at a distinct HTTPS url", () => {
    const urls = resources.map((resource) => resource.url);
    expect(new Set(urls).size).toBe(urls.length);
    for (const url of urls) expect(url).toMatch(/^https:\/\//);
  });

  it("declares no duplicate prerequisite or related edges", () => {
    const prerequisiteKeys = prerequisites.map(([from, to]) => `${from}->${to}`);
    expect(new Set(prerequisiteKeys).size).toBe(prerequisiteKeys.length);

    // RELATED_TO is matched undirected, so [a,b] and [b,a] would be the same edge.
    const relatedKeys = relatedSkills.map(([a, b]) => [a, b].sort().join("~"));
    expect(new Set(relatedKeys).size).toBe(relatedKeys.length);
  });

  it("contains no prerequisite cycle, so a learning path always makes sense", () => {
    const outgoing = new Map<string, string[]>();
    for (const [from, to] of prerequisites) {
      outgoing.set(from, [...(outgoing.get(from) ?? []), to]);
    }

    const state = new Map<string, "visiting" | "done">();
    const cycles: string[] = [];

    const visit = (node: string, trail: string[]) => {
      if (state.get(node) === "done") return;
      if (state.get(node) === "visiting") {
        cycles.push([...trail, node].join(" → "));
        return;
      }
      state.set(node, "visiting");
      for (const next of outgoing.get(node) ?? []) visit(next, [...trail, node]);
      state.set(node, "done");
    };

    for (const skill of skills) visit(skill.id, []);
    expect(cycles).toEqual([]);
  });

  it("meets the size targets the graph needs to be interesting to traverse", () => {
    const counts = countSeedData();

    expect(counts.skills).toBeGreaterThanOrEqual(30);
    expect(counts.roles).toBeGreaterThanOrEqual(10);
    expect(counts.technologies).toBeGreaterThanOrEqual(15);
    expect(counts.resources).toBeGreaterThanOrEqual(20);
    expect(counts.categories).toBeGreaterThanOrEqual(6);
    expect(counts.relationships).toBeGreaterThanOrEqual(100);
  });

  it("stays small enough for a free-tier instance", () => {
    const counts = countSeedData();
    const nodes =
      counts.skills + counts.roles + counts.technologies + counts.resources + counts.categories;

    expect(nodes).toBeLessThan(500);
    expect(counts.relationships).toBeLessThan(2000);
  });

  it("gives every role enough required skills for the traversals to have something to walk", () => {
    for (const role of roles) {
      expect(role.requires.length, `${role.id} has too few skills`).toBeGreaterThanOrEqual(5);
      expect(role.uses.length, `${role.id} uses no technologies`).toBeGreaterThan(0);
    }
  });
});
