/**
 * Query 4 — the learning path (Flow D).
 *
 * "I know X, I want to learn Y — what is the shortest route between them?"
 *
 * Parameters:
 *   $fromId {string}
 *   $toId   {string}
 *
 * `shortestPath` is the reason this application uses a graph database. The
 * equivalent in SQL is a recursive CTE that materialises every route up to
 * depth 6 and then picks the minimum — correct, but far more code, and the
 * depth bound has to be hard-coded into the query text either way.
 *
 * The traversal is undirected on purpose. PREREQUISITE_FOR has a natural
 * forward direction, but RELATED_TO is symmetric, and a realistic route to a
 * new field often steps sideways ("you know JavaScript, learn Python") before
 * it steps forward. The service layer records, per step, whether the edge was
 * traversed against its stored direction so the UI can label it honestly.
 *
 * The depth cap of 5 is a literal because Cypher does not allow a parameter in
 * a variable-length bound. It is a constant in the query text, never derived
 * from user input.
 */
export const SHORTEST_LEARNING_PATH = `
MATCH (start:Skill {id: $fromId})
MATCH (target:Skill {id: $toId})
MATCH path = shortestPath((start)-[:PREREQUISITE_FOR|RELATED_TO*..5]-(target))
RETURN
  [n IN nodes(path) | {
    id: n.id,
    label: head(labels(n)),
    name: n.name,
    description: n.description
  }] AS nodes,
  [r IN relationships(path) | {
    type: type(r),
    startId: startNode(r).id,
    endId: endNode(r).id
  }] AS relationships
LIMIT 1
`;

/**
 * Confirms both endpoints exist so the API can tell "no such skill" (404) apart
 * from "no route between these two skills" (a valid, empty result).
 *
 * Parameters:
 *   $fromId {string}
 *   $toId   {string}
 */
export const FETCH_PATH_ENDPOINTS = `
MATCH (s:Skill)
WHERE s.id IN [$fromId, $toId]
RETURN s.id AS id, s.name AS name, s.description AS description, s.difficulty AS difficulty
`;
