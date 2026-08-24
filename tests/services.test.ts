import { beforeEach, describe, expect, it, vi } from "vitest";

import { InvalidInputError, NotFoundError } from "@/lib/errors";

/**
 * Service-layer behaviour, with the database mocked.
 *
 * These cover the logic that lives in TypeScript rather than in Cypher: which
 * query is chosen, how a `shortestPath` result becomes an ordered list of
 * steps, how a recommendation is explained, and what happens when a node does
 * not exist. The Cypher itself is covered by tests/queries.test.ts.
 */

const readQuery = vi.fn();
vi.mock("@/lib/db", () => ({
  readQuery: (...args: unknown[]) => readQuery(...args),
  getDriver: vi.fn(),
  verifyConnection: vi.fn(),
  toDatabaseError: (error: unknown) => error,
}));

const { findLearningPath } = await import("@/lib/services/paths");
const { getRecommendations } = await import("@/lib/services/recommendations");
const { getSkillDetail } = await import("@/lib/services/skills");
const { getGraphNeighbourhood } = await import("@/lib/services/graph");
const { GRAPH_NEIGHBOURHOOD } = await import("@/lib/queries");

/** A stand-in for a Neo4j driver Record: just `get(key)`. */
function record(fields: Record<string, unknown>) {
  return { get: (key: string) => fields[key], keys: Object.keys(fields) };
}

/**
 * Replaces readQuery with a router keyed on a distinctive fragment of each
 * query, so a test can describe several round trips without caring about call
 * order.
 */
function respondWith(routes: { match: string; rows: Record<string, unknown>[] }[]) {
  readQuery.mockImplementation(
    async (cypher: string, _params: unknown, map: (r: ReturnType<typeof record>) => unknown) => {
      const route = routes.find((candidate) => cypher.includes(candidate.match));
      return (route?.rows ?? []).map((fields) => map(record(fields)));
    },
  );
}

beforeEach(() => {
  readQuery.mockReset();
});

describe("findLearningPath", () => {
  const endpoints = [
    { id: "javascript", name: "JavaScript", description: "…", difficulty: "beginner" },
    { id: "machine-learning", name: "Machine Learning", description: "…", difficulty: "advanced" },
  ];

  it("refuses to look for a path from a skill to itself", async () => {
    await expect(findLearningPath("react", "react")).rejects.toBeInstanceOf(InvalidInputError);
    expect(readQuery).not.toHaveBeenCalled();
  });

  it("reports a missing starting skill as not found", async () => {
    respondWith([{ match: "s.id IN [$fromId, $toId]", rows: [endpoints[1]!] }]);
    await expect(findLearningPath("javascript", "machine-learning")).rejects.toBeInstanceOf(
      NotFoundError,
    );
  });

  it("returns null — not an error — when both skills exist but nothing connects them", async () => {
    respondWith([
      { match: "s.id IN [$fromId, $toId]", rows: endpoints },
      { match: "shortestPath(", rows: [] },
    ]);

    await expect(findLearningPath("javascript", "machine-learning")).resolves.toBeNull();
  });

  it("labels each hop and records when an edge was walked backwards", async () => {
    respondWith([
      { match: "s.id IN [$fromId, $toId]", rows: endpoints },
      {
        match: "shortestPath(",
        rows: [
          {
            nodes: [
              { id: "javascript", label: "Skill", name: "JavaScript", description: "…" },
              { id: "python", label: "Skill", name: "Python", description: "…" },
              { id: "machine-learning", label: "Skill", name: "Machine Learning", description: "…" },
            ],
            relationships: [
              // Walked forwards: javascript -[:RELATED_TO]-> python
              { type: "RELATED_TO", startId: "javascript", endId: "python" },
              // Walked backwards: the stored edge is machine-learning -> python,
              // but the path traverses python -> machine-learning.
              { type: "PREREQUISITE_FOR", startId: "python", endId: "machine-learning" },
            ],
          },
        ],
      },
    ]);

    const path = await findLearningPath("javascript", "machine-learning");

    expect(path).not.toBeNull();
    expect(path?.hops).toBe(2);
    expect(path?.steps.map((step) => step.node.name)).toEqual([
      "JavaScript",
      "Python",
      "Machine Learning",
    ]);
    expect(path?.steps[0]).toMatchObject({ via: null, reversed: false });
    expect(path?.steps[1]).toMatchObject({ via: "RELATED_TO", reversed: false });
    expect(path?.steps[2]).toMatchObject({ via: "PREREQUISITE_FOR", reversed: false });
  });

  it("flags a step whose relationship points the other way", async () => {
    respondWith([
      { match: "s.id IN [$fromId, $toId]", rows: endpoints },
      {
        match: "shortestPath(",
        rows: [
          {
            nodes: [
              { id: "javascript", label: "Skill", name: "JavaScript", description: "…" },
              { id: "machine-learning", label: "Skill", name: "Machine Learning", description: "…" },
            ],
            // Stored as machine-learning -> javascript, but the path walks the
            // other way, so the UI must not claim JavaScript comes first.
            relationships: [
              { type: "PREREQUISITE_FOR", startId: "machine-learning", endId: "javascript" },
            ],
          },
        ],
      },
    ]);

    const path = await findLearningPath("javascript", "machine-learning");
    expect(path?.steps[1]?.reversed).toBe(true);
  });
});

describe("getRecommendations", () => {
  const base = {
    skill: { id: "python", name: "Python", description: "…", difficulty: "beginner" },
    score: 100,
    roleDemand: 4,
    topResource: null,
  };

  it("explains each kind of suggestion and folds in the role demand", async () => {
    readQuery.mockImplementation(
      async (_cypher: string, _params: unknown, map: (r: ReturnType<typeof record>) => unknown) =>
        [
          { ...base, kind: "prerequisite" },
          { ...base, kind: "next-step", roleDemand: 1 },
          { ...base, kind: "related", roleDemand: 0 },
          { ...base, kind: "role-demand" },
        ].map((fields) => map(record(fields))),
    );

    const items = await getRecommendations("machine-learning", 8);

    expect(items[0]?.reason).toBe("A foundation for this skill — learn it first. Required by 4 roles in the graph.");
    expect(items[1]?.reason).toContain("Required by 1 role in the graph.");
    // No demand means no trailing sentence rather than "Required by 0 roles".
    expect(items[2]?.reason).toBe("Closely related, and often learned alongside it.");
    expect(items[3]?.reason).toContain("Roles that need this skill usually need that one too.");
  });

  it("treats a missing resource as null rather than an empty object", async () => {
    readQuery.mockImplementation(
      async (_cypher: string, _params: unknown, map: (r: ReturnType<typeof record>) => unknown) =>
        [
          { ...base, kind: "related", topResource: null },
          {
            ...base,
            kind: "related",
            topResource: {
              id: "python-tutorial",
              title: "The Python Tutorial",
              url: "https://docs.python.org/3/tutorial/",
              type: "documentation",
              difficulty: "beginner",
              provider: "PSF",
            },
          },
        ].map((fields) => map(record(fields))),
    );

    const items = await getRecommendations("python", 8);
    expect(items[0]?.topResource).toBeNull();
    expect(items[1]?.topResource?.title).toBe("The Python Tutorial");
  });

  it("falls back to a known kind if the database returns something unexpected", async () => {
    readQuery.mockImplementation(
      async (_cypher: string, _params: unknown, map: (r: ReturnType<typeof record>) => unknown) =>
        [{ ...base, kind: "nonsense" }].map((fields) => map(record(fields))),
    );

    const items = await getRecommendations("python", 8);
    expect(items[0]?.kind).toBe("related");
  });
});

describe("getSkillDetail", () => {
  it("raises NotFound when the skill does not exist", async () => {
    respondWith([{ match: "MATCH (skill:Skill {id: $skillId})", rows: [] }]);
    await expect(getSkillDetail("nope")).rejects.toBeInstanceOf(NotFoundError);
  });

  it("sorts collected lists and drops empty entries left by an OPTIONAL MATCH", async () => {
    respondWith([
      {
        match: "MATCH (skill:Skill {id: $skillId})",
        rows: [
          {
            skill: { id: "react", name: "React", description: "…", difficulty: "intermediate" },
            categories: [],
            prerequisites: [
              { id: "javascript", name: "JavaScript", description: "…", difficulty: "beginner" },
              // A null slot, as a failed OPTIONAL MATCH would produce.
              { id: null, name: null },
            ],
            unlocks: [],
            relatedSkills: [
              { id: "typescript", name: "TypeScript", description: "…", difficulty: "intermediate" },
              { id: "nextjs", name: "Next.js", description: "…", difficulty: "intermediate" },
            ],
            roles: [],
            technologies: [],
            resources: [
              { id: "b", title: "Advanced guide", url: "https://x", type: "book", difficulty: "advanced", provider: "p" },
              { id: "a", title: "Intro guide", url: "https://y", type: "course", difficulty: "beginner", provider: "p" },
            ],
          },
        ],
      },
    ]);

    const detail = await getSkillDetail("react");

    expect(detail.prerequisites).toHaveLength(1);
    expect(detail.relatedSkills.map((skill) => skill.name)).toEqual(["Next.js", "TypeScript"]);
    // Resources are ordered by how approachable they are, not alphabetically.
    expect(detail.resources.map((resource) => resource.title)).toEqual([
      "Intro guide",
      "Advanced guide",
    ]);
  });
});

describe("getGraphNeighbourhood", () => {
  it("runs the pre-built query for the requested depth, never a built string", async () => {
    readQuery.mockImplementation(
      async (_cypher: string, _params: unknown, map: (r: ReturnType<typeof record>) => unknown) =>
        [{ nodes: [], relationships: [], truncated: false }].map((fields) => map(record(fields))),
    );

    await getGraphNeighbourhood("react", 3);

    expect(readQuery).toHaveBeenCalledWith(
      GRAPH_NEIGHBOURHOOD[3],
      expect.objectContaining({ focusId: "react" }),
      expect.any(Function),
    );
  });

  it("raises NotFound when the focus node does not exist", async () => {
    readQuery.mockResolvedValue([]);
    await expect(getGraphNeighbourhood("nope", 2)).rejects.toBeInstanceOf(NotFoundError);
  });
});
