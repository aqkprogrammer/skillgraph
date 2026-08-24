/**
 * Query 2 — everything the skill explorer (Flow B) needs, in one round trip.
 *
 * Parameters:
 *   $skillId {string}
 *
 * The shape is a chain of OPTIONAL MATCH + collect. Each `collect` folds the
 * fan-out back down to a single row, so the whole detail page costs exactly one
 * query instead of seven — this is the N+1 avoidance the brief asks for.
 *
 * Why `[x IN collect(DISTINCT n) | {...}]` rather than
 * `collect(DISTINCT {id: n.id, ...})`: aggregate functions skip nulls, so
 * collecting the *node* yields `[]` when the OPTIONAL MATCH found nothing.
 * Collecting a *map* built from a null node would instead yield
 * `[{id: null, ...}]` — one phantom entry per empty section.
 *
 * Direction matters and is intentional:
 *   (prereq)-[:PREREQUISITE_FOR]->(skill)   things you need *before* this
 *   (skill)-[:PREREQUISITE_FOR]->(unlocks)  things this skill opens up
 *   (skill)-[:RELATED_TO]-(related)         undirected: relatedness is mutual
 */
export const SKILL_DETAIL = `
MATCH (skill:Skill {id: $skillId})

OPTIONAL MATCH (skill)-[:BELONGS_TO]->(category:Category)
WITH skill, [x IN collect(DISTINCT category) | {
  id: x.id, name: x.name, description: x.description
}] AS categories

OPTIONAL MATCH (prerequisite:Skill)-[:PREREQUISITE_FOR]->(skill)
WITH skill, categories, [x IN collect(DISTINCT prerequisite) | {
  id: x.id, name: x.name, description: x.description, difficulty: x.difficulty
}] AS prerequisites

OPTIONAL MATCH (skill)-[:PREREQUISITE_FOR]->(unlocked:Skill)
WITH skill, categories, prerequisites, [x IN collect(DISTINCT unlocked) | {
  id: x.id, name: x.name, description: x.description, difficulty: x.difficulty
}] AS unlocks

OPTIONAL MATCH (skill)-[:RELATED_TO]-(related:Skill)
WITH skill, categories, prerequisites, unlocks, [x IN collect(DISTINCT related) | {
  id: x.id, name: x.name, description: x.description, difficulty: x.difficulty
}] AS relatedSkills

OPTIONAL MATCH (role:Role)-[:REQUIRES]->(skill)
WITH skill, categories, prerequisites, unlocks, relatedSkills,
     [x IN collect(DISTINCT role) | {
       id: x.id, name: x.name, description: x.description, level: x.level
     }] AS roles

OPTIONAL MATCH (technology:Technology)-[:REQUIRES_SKILL]->(skill)
WITH skill, categories, prerequisites, unlocks, relatedSkills, roles,
     [x IN collect(DISTINCT technology) | {
       id: x.id, name: x.name, description: x.description
     }] AS technologies

OPTIONAL MATCH (skill)-[:TAUGHT_BY]->(resource:Resource)
WITH skill, categories, prerequisites, unlocks, relatedSkills, roles, technologies,
     [x IN collect(DISTINCT resource) | {
       id: x.id, title: x.title, url: x.url, type: x.type,
       difficulty: x.difficulty, provider: x.provider
     }] AS resources

RETURN
  {
    id: skill.id,
    name: skill.name,
    description: skill.description,
    difficulty: skill.difficulty
  } AS skill,
  categories,
  prerequisites,
  unlocks,
  relatedSkills,
  roles,
  technologies,
  resources
`;

/**
 * Query 3 — the mandatory multi-hop traversal.
 *
 * "Which careers open up from this skill that I would not have found by
 *  looking at the skill's own requirements?"
 *
 * Parameters:
 *   $skillId {string}
 *   $limit   {number}
 *
 * Traversal: 1–3 hops across PREREQUISITE_FOR / RELATED_TO between skills,
 * then one final REQUIRES hop backwards from a Role. So every result is at
 * least 2 relationships away, and at most 4.
 *
 * `NOT (role)-[:REQUIRES]->(start)` is what makes the feature interesting:
 * roles that already require the starting skill are filtered out, leaving only
 * careers discovered *through* neighbouring skills.
 *
 * The `ORDER BY hops` + `collect(...)[0]` pair keeps the shortest route per
 * role — a role reachable by many routes appears once, via its closest one.
 */
export const ROLES_REACHABLE_FROM_SKILL = `
MATCH (start:Skill {id: $skillId})

// The roles that already require this skill, gathered as a list of ids.
//
// The obvious way to write the exclusion below is a negative pattern predicate,
// \`WHERE NOT (role)-[:REQUIRES]->(start)\`. That is valid openCypher and works on
// Neo4j, but CognoDB evaluates a pattern predicate as a constant true, so the
// negation silently removes every row — no error, just an empty result. An
// anti-join through a collected id list is portable and behaves identically on
// both engines. See docs/queries.md, "Engine portability".
OPTIONAL MATCH (direct:Role)-[:REQUIRES]->(start)
WITH start, collect(DISTINCT direct.id) AS directRoleIds

MATCH path = (start)-[:PREREQUISITE_FOR|RELATED_TO*1..3]-(reached:Skill)<-[:REQUIRES]-(role:Role)
WHERE reached <> start
  AND NOT role.id IN directRoleIds
WITH role,
     length(path) AS hops,
     [n IN nodes(path) WHERE n:Skill AND n.id <> $skillId | n.name] AS via
ORDER BY hops ASC
WITH role, collect({hops: hops, via: via})[0] AS shortest
RETURN
  {
    id: role.id,
    name: role.name,
    description: role.description,
    level: role.level
  } AS role,
  shortest.hops AS hops,
  shortest.via  AS via
ORDER BY hops ASC, role.name ASC
LIMIT $limit
`;
