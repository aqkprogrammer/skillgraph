/**
 * Query 6 — everything the career explorer (Flow C) needs, in one round trip.
 *
 * Parameters:
 *   $roleId       {string}
 *   $relatedLimit {number} how many neighbouring roles to return
 *   $gapLimit     {number} how many skill gaps to return
 *
 * Two of the five sections are the interesting ones:
 *
 * `relatedRoles` — roles are never linked to each other in the model. Their
 * similarity is *derived* by walking out to the shared skills and back:
 *     (role)-[:REQUIRES]->(:Skill)<-[:REQUIRES]-(other:Role)
 * Counting the distinct skills on that middle hop gives a similarity score for
 * free, and it stays correct automatically when a role's requirements change.
 *
 * `skillGaps` — a three-hop pattern with a negative filter: skills required by
 * roles adjacent to this one, that this role does *not* require. In SQL this is
 * a self-join through a junction table plus a NOT EXISTS correlated subquery;
 * here the shape of the pattern is the specification.
 */
export const ROLE_DETAIL = `
MATCH (role:Role {id: $roleId})

OPTIONAL MATCH (role)-[:REQUIRES]->(skill:Skill)
WITH role, collect(DISTINCT skill) AS requiredSkillNodes

OPTIONAL MATCH (role)-[:USES]->(technology:Technology)
WITH role, requiredSkillNodes, [x IN collect(DISTINCT technology) | {
  id: x.id, name: x.name, description: x.description
}] AS technologies

OPTIONAL MATCH (taught:Skill)-[:TAUGHT_BY]->(resource:Resource)
WHERE taught IN requiredSkillNodes
WITH role, requiredSkillNodes, technologies, [x IN collect(DISTINCT resource) | {
  id: x.id, title: x.title, url: x.url, type: x.type,
  difficulty: x.difficulty, provider: x.provider
}] AS resources

OPTIONAL MATCH (role)-[:REQUIRES]->(shared:Skill)<-[:REQUIRES]-(peer:Role)
WHERE peer.id <> role.id
WITH role, requiredSkillNodes, technologies, resources,
     peer, count(DISTINCT shared) AS sharedSkillCount
ORDER BY sharedSkillCount DESC, peer.name ASC
WITH role, requiredSkillNodes, technologies, resources,
     [x IN collect({peer: peer, sharedSkillCount: sharedSkillCount})
        WHERE x.peer IS NOT NULL | {
          id: x.peer.id,
          name: x.peer.name,
          description: x.peer.description,
          level: x.peer.level,
          sharedSkillCount: x.sharedSkillCount
        }][0..$relatedLimit] AS relatedRoles

OPTIONAL MATCH (role)-[:REQUIRES]->(:Skill)<-[:REQUIRES]-(neighbour:Role)-[:REQUIRES]->(gap:Skill)
// \`NOT (role)-[:REQUIRES]->(gap)\` would read better, but CognoDB evaluates a
// pattern predicate as a constant true and would silently return no gaps at all.
// requiredSkillNodes is already in scope, so the same test is a membership check.
WHERE neighbour.id <> role.id
  AND NOT gap.id IN [required IN requiredSkillNodes | required.id]
WITH role, requiredSkillNodes, technologies, resources, relatedRoles,
     gap, collect(DISTINCT neighbour.name) AS requiredByRoles
ORDER BY size(requiredByRoles) DESC, gap.name ASC
WITH role, requiredSkillNodes, technologies, resources, relatedRoles,
     [x IN collect({gap: gap, requiredByRoles: requiredByRoles})
        WHERE x.gap IS NOT NULL | {
          id: x.gap.id,
          name: x.gap.name,
          description: x.gap.description,
          difficulty: x.gap.difficulty,
          requiredByRoles: x.requiredByRoles
        }][0..$gapLimit] AS skillGaps

RETURN
  {
    id: role.id,
    name: role.name,
    description: role.description,
    level: role.level
  } AS role,
  [x IN requiredSkillNodes | {
    id: x.id, name: x.name, description: x.description, difficulty: x.difficulty
  }] AS requiredSkills,
  technologies,
  resources,
  relatedRoles,
  skillGaps
`;
