/**
 * Counts for the homepage and the "your graph is empty" first-run state.
 *
 * Parameters: none.
 *
 * `OPTIONAL MATCH` on the relationship half matters: on a freshly created,
 * empty instance a plain `MATCH ()-[r]->()` would return zero rows and the
 * whole query would yield nothing, so the app could not tell "empty database"
 * apart from "query failed". With OPTIONAL MATCH it reliably returns all zeros.
 */
export const GRAPH_STATS = `
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

/**
 * The most in-demand skills, ranked by how many roles require them.
 *
 * Parameters:
 *   $limit {number}
 *
 * This is a good example of "relationships are the data": demand is not a
 * column on Skill, it is the in-degree of the REQUIRES relationship. Nothing
 * has to be denormalised or kept in sync when a role changes its requirements.
 */
export const TOP_SKILLS_BY_DEMAND = `
MATCH (skill:Skill)
OPTIONAL MATCH (role:Role)-[:REQUIRES]->(skill)
WITH skill, count(DISTINCT role) AS roleDemand
ORDER BY roleDemand DESC, skill.name ASC
LIMIT $limit
RETURN
  skill.id          AS id,
  skill.name        AS name,
  skill.description AS description,
  skill.difficulty  AS difficulty,
  roleDemand
`;

/**
 * Categories with the skills that belong to them — powers the "Popular paths"
 * section on the homepage.
 *
 * Parameters:
 *   $skillsPerCategory {number} how many skills to preview per category
 */
export const CATEGORIES_WITH_SKILLS = `
MATCH (category:Category)
OPTIONAL MATCH (skill:Skill)-[:BELONGS_TO]->(category)
WITH category, skill
ORDER BY skill.name ASC
WITH category, [s IN collect(skill) | {
  id: s.id, name: s.name, description: s.description, difficulty: s.difficulty
}] AS skills
RETURN
  category.id          AS id,
  category.name        AS name,
  category.description AS description,
  skills[0..$skillsPerCategory] AS skills,
  size(skills)         AS skillCount
ORDER BY skillCount DESC, category.name ASC
`;
