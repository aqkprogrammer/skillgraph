/**
 * Query 1 — Search across every node label.
 *
 * Parameters:
 *   $query {string} the raw search term (lower-casing happens in Cypher)
 *   $limit {number} maximum rows to return
 *
 * The term is ranked so exact matches come first, then prefix matches, then
 * substring matches. Ordering happens in the database rather than in the API
 * layer so that `LIMIT` truncates the *worst* results, not an arbitrary slice.
 *
 * Note on the label-agnostic `MATCH (n)`: the seed graph is ~130 nodes, so an
 * all-node scan is cheap and keeps the query readable. At real scale this
 * should become a full-text index (`CREATE FULLTEXT INDEX ...` and
 * `CALL db.index.fulltext.queryNodes`), which also gives proper relevance
 * scoring instead of the hand-rolled CASE below. See docs/queries.md.
 */
export const SEARCH_NODES = `
WITH toLower($query) AS term
MATCH (n)
WHERE (n:Skill OR n:Role OR n:Technology OR n:Resource)
  AND toLower(coalesce(n.name, n.title)) CONTAINS term
WITH n, term, toLower(coalesce(n.name, n.title)) AS lowerName
WITH n, lowerName,
     CASE
       WHEN lowerName = term THEN 0
       WHEN lowerName STARTS WITH term THEN 1
       ELSE 2
     END AS rank
ORDER BY rank ASC, lowerName ASC
LIMIT $limit
RETURN
  n.id                            AS id,
  head(labels(n))                 AS label,
  coalesce(n.name, n.title)       AS name,
  coalesce(n.description, '')     AS description,
  coalesce(n.url, '')             AS url
`;

/**
 * Lightweight skill list used by the learning-path pickers and the browse page.
 *
 * Parameters: none. Returns every skill — the seed set is small enough
 * (~45 rows) that paginating would add complexity without adding value.
 */
export const LIST_SKILLS = `
MATCH (s:Skill)
RETURN s.id AS id, s.name AS name, s.description AS description, s.difficulty AS difficulty
ORDER BY s.name ASC
`;

/**
 * Lightweight role list used by the roles browse page.
 */
export const LIST_ROLES = `
MATCH (r:Role)
RETURN r.id AS id, r.name AS name, r.description AS description, r.level AS level
ORDER BY r.name ASC
`;
