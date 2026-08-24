/**
 * Query 5 — "What should I learn next?"
 *
 * Parameters:
 *   $skillId {string}
 *   $limit   {number}
 *
 * Four different graph patterns produce candidates, each with a base weight:
 *
 *   prerequisite (100) (other)-[:PREREQUISITE_FOR]->(current)
 *                      Foundations you are missing. Ranked first because
 *                      skipping them makes everything else harder.
 *   next-step     (70) (current)-[:PREREQUISITE_FOR]->(other)
 *                      What this skill unlocks — the natural forward move.
 *   related       (45) (current)-[:RELATED_TO]-(other)
 *                      Sideways moves that broaden rather than deepen.
 *   role-demand   (30) (role)-[:REQUIRES]->(current), (role)-[:REQUIRES]->(other)
 *                      Collaborative filtering, done as a two-hop walk: skills
 *                      that keep appearing next to this one in job postings.
 *
 * A skill found by several patterns keeps its highest-priority reason (the
 * `ORDER BY base DESC` + `collect(...)[0]` pair), then every candidate is
 * boosted by `roleDemand * 5` — its REQUIRES in-degree — so that, among equally
 * related skills, the more employable one surfaces first.
 *
 * That last boost is the part worth pointing at in an interview: "how many
 * roles require this skill" is not a stored column, it is the in-degree of a
 * relationship, computed on the fly and never at risk of going stale.
 */
export const SKILL_RECOMMENDATIONS = `
MATCH (current:Skill {id: $skillId})

OPTIONAL MATCH (prerequisite:Skill)-[:PREREQUISITE_FOR]->(current)
WITH current, collect(DISTINCT prerequisite) AS prerequisites

OPTIONAL MATCH (current)-[:PREREQUISITE_FOR]->(unlocked:Skill)
WITH current, prerequisites, collect(DISTINCT unlocked) AS nextSteps

OPTIONAL MATCH (current)-[:RELATED_TO]-(related:Skill)
WITH current, prerequisites, nextSteps, collect(DISTINCT related) AS relatedSkills

OPTIONAL MATCH (role:Role)-[:REQUIRES]->(current)
OPTIONAL MATCH (role)-[:REQUIRES]->(coRequired:Skill)
WHERE coRequired <> current
WITH current, prerequisites, nextSteps, relatedSkills,
     collect(DISTINCT coRequired) AS coRequiredSkills

WITH current,
     [s IN prerequisites | {skill: s, kind: 'prerequisite', base: 100}] +
     [s IN nextSteps     | {skill: s, kind: 'next-step',    base: 70}] +
     [s IN relatedSkills WHERE NOT s IN prerequisites AND NOT s IN nextSteps
                         | {skill: s, kind: 'related',      base: 45}] +
     [s IN coRequiredSkills WHERE NOT s IN prerequisites AND NOT s IN nextSteps
                              AND NOT s IN relatedSkills
                         | {skill: s, kind: 'role-demand',  base: 30}]
     AS candidates

UNWIND candidates AS candidate
WITH candidate.skill AS skill, candidate.kind AS kind, candidate.base AS base
ORDER BY base DESC
WITH skill, collect({kind: kind, base: base})[0] AS best

OPTIONAL MATCH (demandRole:Role)-[:REQUIRES]->(skill)
WITH skill, best, count(DISTINCT demandRole) AS roleDemand

OPTIONAL MATCH (skill)-[:TAUGHT_BY]->(resource:Resource)
WITH skill, best, roleDemand, resource
ORDER BY resource.difficulty ASC, resource.title ASC
WITH skill, best, roleDemand, collect(resource) AS resources

WITH skill, best, roleDemand, resources, best.base + (roleDemand * 5) AS score
ORDER BY score DESC, skill.name ASC
LIMIT $limit
RETURN
  {
    id: skill.id,
    name: skill.name,
    description: skill.description,
    difficulty: skill.difficulty
  } AS skill,
  best.kind AS kind,
  score,
  roleDemand,
  CASE WHEN size(resources) = 0 THEN NULL ELSE {
    id: resources[0].id,
    title: resources[0].title,
    url: resources[0].url,
    type: resources[0].type,
    difficulty: resources[0].difficulty,
    provider: resources[0].provider
  } END AS topResource
`;
