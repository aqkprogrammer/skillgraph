/**
 * Query 7 — the graph-demonstration queries (Flow E and the Explore page).
 *
 * "Starting from React, what technologies, skills and career roles can I reach
 *  within 3 hops?"
 *
 * This is the query the README points at. It is not that a relational database
 * *cannot* answer it — a recursive CTE can. It is that the relational version
 * has to union a different join for every relationship table on every level of
 * the recursion, and the result set mixes four entity types that no single
 * table describes. Here the pattern is one line, and adding a new relationship
 * type to the model does not change it.
 */

/** The traversal depths the API accepts. See the note on the lookup table below. */
export const GRAPH_DEPTHS = [1, 2, 3] as const;
export type GraphDepth = (typeof GRAPH_DEPTHS)[number];

/**
 * Cypher does not allow a parameter inside a variable-length bound: `[*1..$d]`
 * is a syntax error, the bound must be a literal. So instead of building the
 * string per request, the three allowed variants are materialised once at
 * module load from hard-coded literals, and the request only ever selects a
 * *key* from that frozen table.
 *
 * The user-controlled value therefore never reaches the query text — it is
 * validated into the `GraphDepth` union first, and an unknown value cannot
 * index the table. Every other value in these queries is a real Cypher
 * parameter.
 */
const NEIGHBOURHOOD_TEMPLATE = `
MATCH (focus)
WHERE focus.id = $focusId
  AND (focus:Skill OR focus:Role OR focus:Technology OR focus:Resource OR focus:Category)

OPTIONAL MATCH path = (focus)-[*1..__DEPTH__]-(reached)
// A traversal of two or more hops can loop back to where it started
// (React → JavaScript → React), which would draw the focus node twice.
WHERE reached <> focus
WITH focus, reached, min(length(path)) AS depth
ORDER BY depth ASC, coalesce(reached.name, reached.title) ASC
WITH focus, [x IN collect({node: reached, depth: depth}) WHERE x.node IS NOT NULL] AS ranked
WITH focus, ranked, ranked[0..$nodeLimit] AS neighbours
WITH focus, ranked, neighbours, [focus] + [x IN neighbours | x.node] AS scope

UNWIND scope AS source
OPTIONAL MATCH (source)-[rel]->(target)
WHERE target IN scope
WITH focus, ranked, neighbours, collect(DISTINCT rel) AS rels

RETURN
  [x IN [{node: focus, depth: 0}] + neighbours | {
    id:    x.node.id,
    label: head(labels(x.node)),
    name:  coalesce(x.node.name, x.node.title),
    depth: x.depth
  }] AS nodes,
  [r IN rels | {
    id:     startNode(r).id + '|' + type(r) + '|' + endNode(r).id,
    source: startNode(r).id,
    target: endNode(r).id,
    type:   type(r)
  }] AS relationships,
  size(ranked) > $nodeLimit AS truncated
`;

export const GRAPH_NEIGHBOURHOOD: Readonly<Record<GraphDepth, string>> = Object.freeze({
  1: NEIGHBOURHOOD_TEMPLATE.replace("__DEPTH__", "1"),
  2: NEIGHBOURHOOD_TEMPLATE.replace("__DEPTH__", "2"),
  3: NEIGHBOURHOOD_TEMPLATE.replace("__DEPTH__", "3"),
});

/**
 * The heterogeneous reachability summary, grouped by node label.
 *
 * Parameters:
 *   $focusId       {string}
 *   $perLabelLimit {number}
 *
 * One traversal crosses Skill → Technology → Role → Resource without a single
 * join being spelled out, and `min(length(p))` gives the closest route to each
 * reachable node so the UI can group results by distance.
 */
export const REACHABLE_WITHIN_THREE_HOPS = `
MATCH (focus)
WHERE focus.id = $focusId
  AND (focus:Skill OR focus:Role OR focus:Technology)

MATCH p = (focus)-[*1..3]-(reached)
WHERE reached <> focus
  AND (reached:Skill OR reached:Role OR reached:Technology OR reached:Resource)
WITH reached, min(length(p)) AS hops
ORDER BY hops ASC, coalesce(reached.name, reached.title) ASC
WITH head(labels(reached)) AS label,
     collect({
       id:   reached.id,
       name: coalesce(reached.name, reached.title),
       hops: hops
     }) AS items
RETURN
  label,
  items[0..$perLabelLimit] AS items,
  size(items) AS total
ORDER BY label ASC
`;
