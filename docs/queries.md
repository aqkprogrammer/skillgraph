# Cypher queries

Every Cypher statement the application runs lives in [`lib/queries/`](../lib/queries) and is
re-exported from [`lib/queries/index.ts`](../lib/queries/index.ts). Nothing else in the codebase
contains Cypher, so the entire data-access surface can be reviewed by reading that one directory.

Two rules hold everywhere:

1. **Every user-controlled value is a Cypher parameter.** No query is assembled by string
   concatenation. The one place a literal is unavoidable — a variable-length bound — is handled by
   a frozen lookup table of pre-built queries, described under [Query 7](#query-7--graph-neighbourhood).
2. **Every traversal is bounded.** There is no `[*]` anywhere; each variable-length pattern has an
   explicit upper bound, and each query has a `LIMIT` or a slice.

Both are enforced by tests in [`tests/queries.test.ts`](../tests/queries.test.ts), which fail the
build if a `${` or an unbounded `[*` ever appears in a query.

---

## Contents

| # | Query | File | Used by |
|---|---|---|---|
| 1 | [Search](#query-1--search) | `search.ts` | `GET /api/search`, `/search` |
| 2 | [Skill detail](#query-2--skill-detail) | `skills.ts` | `GET /api/skills/:id`, `/skills/[id]` |
| 3 | [Multi-hop role discovery](#query-3--multi-hop-role-discovery) | `skills.ts` | `/skills/[id]` |
| 4 | [Learning path](#query-4--learning-path) | `paths.ts` | `GET /api/paths`, `/paths` |
| 5 | [What should I learn next?](#query-5--what-should-i-learn-next) | `recommendations.ts` | `GET /api/recommendations/:id` |
| 6 | [Role exploration](#query-6--role-exploration) | `roles.ts` | `GET /api/roles/:id`, `/roles/[id]` |
| 7 | [Graph neighbourhood](#query-7--graph-neighbourhood) | `graph.ts` | `GET /api/graph/:id`, `/explore` |
| 8 | [Reachability within 3 hops](#query-8--reachability-within-3-hops) | `graph.ts` | `GET /api/reach/:id`, `/explore` |
| 9 | [Supporting queries](#supporting-queries) | `stats.ts`, `search.ts` | homepage, browse pages |

---

## Query 1 — Search

**File:** `lib/queries/search.ts` → `SEARCH_NODES`
**Purpose:** one search box across four node labels.
**Parameters:** `$query` (string, the raw term), `$limit` (number, 1–50).

```cypher
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
  n.id                        AS id,
  head(labels(n))             AS label,
  coalesce(n.name, n.title)   AS name,
  coalesce(n.description, '') AS description,
  coalesce(n.url, '')         AS url
```

**Traversal:** none — this is the one query in the application that does not walk relationships.

**Result:** up to `$limit` rows, each `{ id, label, name, description, url }`. `label` tells the UI
which badge to draw and which page to link to; `url` is only populated for `Resource` nodes.

**Why it is useful:** a single query returns four different entity types in one ranked list. The
relational equivalent is a four-way `UNION ALL` over four tables with different column names, and
the ranking has to be repeated in each branch.

**Ranking:** exact match, then prefix match, then substring — ordered in the database so that
`LIMIT` truncates the *worst* matches rather than an arbitrary slice.

**Example call:**

```ts
readQuery(SEARCH_NODES, { query: "react", limit: 20 }, mapRow);
```

**Honest limitation:** `MATCH (n)` without a label is an all-node scan. On the ~133-node seed graph
that is cheaper than the alternatives and keeps the query readable. At real scale it should become a
full-text index:

```cypher
CREATE FULLTEXT INDEX nodeSearch IF NOT EXISTS
FOR (n:Skill|Role|Technology|Resource) ON EACH [n.name, n.title, n.description];

CALL db.index.fulltext.queryNodes('nodeSearch', $query) YIELD node, score
RETURN node, score ORDER BY score DESC LIMIT $limit
```

which would also replace the hand-rolled `CASE` with real relevance scoring.

---

## Query 2 — Skill detail

**File:** `lib/queries/skills.ts` → `SKILL_DETAIL`
**Purpose:** everything the skill page needs (Flow B), in one round trip.
**Parameters:** `$skillId` (string).

The query is a chain of `OPTIONAL MATCH` + `collect`, one per section:

```cypher
MATCH (skill:Skill {id: $skillId})

OPTIONAL MATCH (skill)-[:BELONGS_TO]->(category:Category)
WITH skill, [x IN collect(DISTINCT category) | {
  id: x.id, name: x.name, description: x.description
}] AS categories

OPTIONAL MATCH (prerequisite:Skill)-[:PREREQUISITE_FOR]->(skill)
WITH skill, categories, [x IN collect(DISTINCT prerequisite) | { … }] AS prerequisites

-- … unlocks, relatedSkills, roles, technologies, resources …

RETURN { id: skill.id, name: skill.name, … } AS skill,
       categories, prerequisites, unlocks, relatedSkills, roles, technologies, resources
```

**Traversal:** seven single-hop patterns from one anchor node. Direction is meaningful:

| Section | Pattern | Reads as |
|---|---|---|
| `prerequisites` | `(other)-[:PREREQUISITE_FOR]->(skill)` | learn these **first** |
| `unlocks` | `(skill)-[:PREREQUISITE_FOR]->(other)` | this skill **opens up** those |
| `relatedSkills` | `(skill)-[:RELATED_TO]-(other)` | undirected — relatedness is mutual |
| `roles` | `(role)-[:REQUIRES]->(skill)` | careers that need it |
| `technologies` | `(tech)-[:REQUIRES_SKILL]->(skill)` | tools that assume it |
| `resources` | `(skill)-[:TAUGHT_BY]->(resource)` | where to learn it |
| `categories` | `(skill)-[:BELONGS_TO]->(category)` | where it sits |

**Result:** exactly one row, or zero rows if the id does not exist — which the service turns into a
404 rather than an empty page.

**Why it is useful:** the whole detail page costs one query. Seven separate queries, or a lazily
loaded section per relationship, would be the classic N+1.

**Note on `[x IN collect(DISTINCT n) | {...}]`:** aggregate functions skip nulls, so collecting the
*node* yields `[]` when the `OPTIONAL MATCH` matched nothing. Collecting a *map* built from a null
node would instead yield `[{id: null, …}]` — one phantom entry per empty section. Projecting after
the collect avoids that.

**Example call:**

```ts
readQuery(SKILL_DETAIL, { skillId: "react" }, mapDetail);
```

---

## Query 3 — Multi-hop role discovery

**File:** `lib/queries/skills.ts` → `ROLES_REACHABLE_FROM_SKILL`
**Purpose:** *"Which careers open up from this skill that I would not have found by reading the
skill's own requirements?"*
**Parameters:** `$skillId` (string), `$limit` (number).

```cypher
MATCH (start:Skill {id: $skillId})

// Roles that already require this skill, as a list of ids.
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
RETURN { id: role.id, name: role.name, … } AS role,
       shortest.hops AS hops,
       shortest.via  AS via
ORDER BY hops ASC, role.name ASC
LIMIT $limit
```

**Traversal:** 1–3 hops across `PREREQUISITE_FOR` / `RELATED_TO` between skills, then one final
`REQUIRES` hop **backwards** from a role. Every result is therefore at least **2** relationships
away and at most 4. This is the mandatory 2+ hop traversal.

**The interesting predicate** is the exclusion of `directRoleIds`. Without it the query mostly
returns roles the user already knows about. With it, the feature becomes *discovery*: roles reached
only **through** neighbouring skills.

It is written as a list anti-join rather than the more readable
`NOT (role)-[:REQUIRES]->(start)` because CognoDB evaluates a pattern predicate as a constant
`true` — see [Engine portability](#engine-portability) at the bottom of this document.

**Deduplication:** a role reachable by many routes should appear once, via its closest one. That is
what `ORDER BY hops ASC` followed by `collect(...)[0]` does — order the routes, keep the first.

**Result:** up to `$limit` rows of `{ role, hops, via }`, where `via` is the chain of intermediate
skill names, rendered in the UI as `React → Next.js → Full Stack Engineer`.

**Why it is useful:** in SQL this is a recursive CTE over a skill-adjacency table, unioned across two
relationship kinds, joined to a role-skill junction table, with an anti-join to exclude direct
requirements, and a window function to keep the shortest route per role. Here it is one pattern and
two lines of aggregation.

**Example call:**

```ts
readQuery(ROLES_REACHABLE_FROM_SKILL, { skillId: "react", limit: 6 }, mapReachable);
```

---

## Query 4 — Learning path

**File:** `lib/queries/paths.ts` → `SHORTEST_LEARNING_PATH`
**Purpose:** *"I know X and I want to learn Y — what is the shortest route?"* (Flow D).
**Parameters:** `$fromId` (string), `$toId` (string).

```cypher
MATCH (start:Skill {id: $fromId})
MATCH (target:Skill {id: $toId})
MATCH path = shortestPath((start)-[:PREREQUISITE_FOR|RELATED_TO*..5]-(target))
RETURN
  [n IN nodes(path) | { id: n.id, label: head(labels(n)), name: n.name, description: n.description }] AS nodes,
  [r IN relationships(path) | { type: type(r), startId: startNode(r).id, endId: endNode(r).id }] AS relationships
LIMIT 1
```

**Traversal:** `shortestPath` over the two skill-to-skill relationship types, bounded at 5 hops.

**Undirected on purpose.** `PREREQUISITE_FOR` has a natural forward direction, but `RELATED_TO` is
symmetric, and a realistic route into a new field often steps sideways ("you know JavaScript, learn
Python") before it steps forward. Traversing directed-only would return "no path" for most
cross-discipline pairs, which is a worse answer than an honest sideways one.

Because the walk is undirected, the service compares each edge's `startId` with the previous node to
work out whether it was traversed backwards, and the UI phrases each hop accordingly — `is a
prerequisite for` one way, `builds on` the other. The path never claims a dependency the data does
not assert.

**Result:** one row of `{ nodes, relationships }`, or **zero rows** when no route exists. Zero rows
is a legitimate answer, not an error: `findLearningPath` returns `null` and the UI shows *"No
learning path could be found between these skills."* To keep that distinguishable from a mistyped
id, `FETCH_PATH_ENDPOINTS` verifies both endpoints first and raises a 404 if either is missing.

**Depth bound:** `*..5` is a literal because Cypher does not permit a parameter in a variable-length
bound. It is a constant in the query text and is never derived from user input.

**Example call:**

```ts
readQuery(SHORTEST_LEARNING_PATH, { fromId: "javascript", toId: "machine-learning" }, mapPath);
```

**Relational comparison:** a recursive CTE can do this. It has to materialise routes level by level,
union two relationship directions at every level, carry a visited-set to avoid cycling, and then
take the minimum by length. `shortestPath` is a single call to a bidirectional breadth-first search
the database already implements.

---

## Query 5 — What should I learn next?

**File:** `lib/queries/recommendations.ts` → `SKILL_RECOMMENDATIONS`
**Purpose:** the application's headline feature — a ranked list of what to study next.
**Parameters:** `$skillId` (string), `$limit` (number, 1–20).

Four patterns produce candidates, each with a base weight:

| Kind | Pattern | Base | Meaning |
|---|---|---|---|
| `prerequisite` | `(other)-[:PREREQUISITE_FOR]->(current)` | 100 | foundations you are missing |
| `next-step` | `(current)-[:PREREQUISITE_FOR]->(other)` | 70 | what this skill unlocks |
| `related` | `(current)-[:RELATED_TO]-(other)` | 45 | sideways moves |
| `role-demand` | `(role)-[:REQUIRES]->(current)`, `(role)-[:REQUIRES]->(other)` | 30 | co-occurrence in job requirements |

```cypher
MATCH (current:Skill {id: $skillId})

OPTIONAL MATCH (prerequisite:Skill)-[:PREREQUISITE_FOR]->(current)
WITH current, collect(DISTINCT prerequisite) AS prerequisites
-- … nextSteps, relatedSkills, coRequiredSkills …

WITH current,
     [s IN prerequisites | {skill: s, kind: 'prerequisite', base: 100}] +
     [s IN nextSteps     | {skill: s, kind: 'next-step',    base: 70}] +
     [s IN relatedSkills WHERE NOT s IN prerequisites AND NOT s IN nextSteps
                         | {skill: s, kind: 'related',      base: 45}] +
     [s IN coRequiredSkills WHERE … | {skill: s, kind: 'role-demand', base: 30}]
     AS candidates

UNWIND candidates AS candidate
WITH candidate.skill AS skill, candidate.kind AS kind, candidate.base AS base
ORDER BY base DESC
WITH skill, collect({kind: kind, base: base})[0] AS best   -- keep the strongest reason

OPTIONAL MATCH (demandRole:Role)-[:REQUIRES]->(skill)
WITH skill, best, count(DISTINCT demandRole) AS roleDemand
-- … pick one resource …
WITH skill, best, roleDemand, resources, best.base + (roleDemand * 5) AS score
ORDER BY score DESC, skill.name ASC
LIMIT $limit
RETURN …
```

**Traversal:** three one-hop patterns plus one two-hop pattern (`skill → role → skill`), then a
second one-hop count per candidate for the demand boost.

**Deduplication:** a skill found by several patterns keeps its highest-priority reason —
`ORDER BY base DESC` then `collect(...)[0]`.

**The demand boost is the part worth pointing at.** `roleDemand` is not a stored column; it is the
in-degree of the `REQUIRES` relationship, computed at query time. Nothing has to be denormalised,
and it can never go stale when a role changes its requirements. In a relational schema this is a
correlated `COUNT(*)` subquery per candidate, or a maintained counter column and the bugs that come
with keeping one in sync.

**Result:** up to `$limit` rows of `{ skill, kind, score, roleDemand, topResource }`. The
human-readable `reason` string is built in the service layer, not in Cypher — it is presentation,
not data.

**Example call:**

```ts
readQuery(SKILL_RECOMMENDATIONS, { skillId: "react", limit: 6 }, mapRecommendation);
```

---

## Query 6 — Role exploration

**File:** `lib/queries/roles.ts` → `ROLE_DETAIL`
**Purpose:** everything the career page needs (Flow C).
**Parameters:** `$roleId` (string), `$relatedLimit` (number), `$gapLimit` (number).

Five sections: required skills, technologies, resources, related roles, skill gaps. Three are simple
one-hop patterns. The other two are the reason this page is interesting.

### Related roles — similarity that is never stored

Roles are **never linked to each other** in the model. Their similarity is derived by walking out to
their shared skills and back:

```cypher
OPTIONAL MATCH (role)-[:REQUIRES]->(shared:Skill)<-[:REQUIRES]-(peer:Role)
WHERE peer.id <> role.id
WITH …, peer, count(DISTINCT shared) AS sharedSkillCount
ORDER BY sharedSkillCount DESC, peer.name ASC
```

Counting the distinct skills on the middle hop gives a similarity score for free, and it stays
correct automatically when any role's requirements change.

### Skill gaps — a three-hop pattern with a negative filter

```cypher
OPTIONAL MATCH (role)-[:REQUIRES]->(:Skill)<-[:REQUIRES]-(neighbour:Role)-[:REQUIRES]->(gap:Skill)
WHERE neighbour.id <> role.id
  AND NOT gap.id IN [required IN requiredSkillNodes | required.id]
WITH …, gap, collect(DISTINCT neighbour.name) AS requiredByRoles
ORDER BY size(requiredByRoles) DESC, gap.name ASC
```

Read literally: *skills required by roles that share a skill with this one, that this role does not
require.* In SQL that is a two-step self-join through the junction table plus a `NOT EXISTS`
correlated subquery. Here the shape of the *pattern* is the specification; only the exclusion needs
spelling out, and it reuses `requiredSkillNodes`, which the query has already collected.

**Result:** one row containing all five sections, or zero rows for an unknown id (→ 404).

**Example call:**

```ts
readQuery(ROLE_DETAIL, { roleId: "ml-engineer", relatedLimit: 5, gapLimit: 8 }, mapRoleDetail);
```

---

## Query 7 — Graph neighbourhood

**File:** `lib/queries/graph.ts` → `GRAPH_NEIGHBOURHOOD`
**Purpose:** the nodes and edges around one node, for the visualisation (Flow E).
**Parameters:** `$focusId` (string), `$nodeLimit` (number). **Depth selects the query, see below.**

```cypher
MATCH (focus)
WHERE focus.id = $focusId
  AND (focus:Skill OR focus:Role OR focus:Technology OR focus:Resource OR focus:Category)

OPTIONAL MATCH path = (focus)-[*1..2]-(reached)
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
  [x IN [{node: focus, depth: 0}] + neighbours | { id: …, label: head(labels(x.node)), name: …, depth: x.depth }] AS nodes,
  [r IN rels | { id: startNode(r).id + '|' + type(r) + '|' + endNode(r).id,
                 source: startNode(r).id, target: endNode(r).id, type: type(r) }] AS relationships,
  size(ranked) > $nodeLimit AS truncated
```

**Traversal:** untyped and unlabelled — it crosses every relationship type and every node label,
which is the point. `min(length(path))` gives each neighbour its hop distance, which the
visualisation draws as a ring.

**Second phase:** rather than scanning all relationships, the query `UNWIND`s the selected nodes and
anchors an `OPTIONAL MATCH` on each, keeping only edges whose other end is also in view. That keeps
the picture internally consistent — no edges dangling to nodes that were cut by the limit.

**`truncated`** tells the UI when the view is partial, so it can say so instead of implying the node
has exactly 40 neighbours.

### Why depth is a lookup table, not a parameter

Cypher does not allow a parameter inside a variable-length bound — `[*1..$depth]` is a syntax error;
the bound must be a literal. Rather than building the string per request, the three allowed variants
are materialised **once at module load** from hard-coded literals:

```ts
const NEIGHBOURHOOD_TEMPLATE = `… OPTIONAL MATCH path = (focus)-[*1..__DEPTH__]-(reached) …`;

export const GRAPH_NEIGHBOURHOOD: Readonly<Record<GraphDepth, string>> = Object.freeze({
  1: NEIGHBOURHOOD_TEMPLATE.replace("__DEPTH__", "1"),
  2: NEIGHBOURHOOD_TEMPLATE.replace("__DEPTH__", "2"),
  3: NEIGHBOURHOOD_TEMPLATE.replace("__DEPTH__", "3"),
});
```

A request validates its depth into the `GraphDepth` union (`1 | 2 | 3`) and then uses it only as a
**key** into that frozen table. The user-controlled value never touches the query text, and an
unknown value cannot index the table — validation rejects it first. Every other value in the query
is a real parameter.

**Example call:**

```ts
readQuery(GRAPH_NEIGHBOURHOOD[2], { focusId: "react", nodeLimit: 40 }, mapGraph);
```

---

## Query 8 — Reachability within 3 hops

**File:** `lib/queries/graph.ts` → `REACHABLE_WITHIN_THREE_HOPS`
**Purpose:** the showcase query — *"Starting from React, what technologies, skills and career roles
can I reach within 3 hops?"*
**Parameters:** `$focusId` (string), `$perLabelLimit` (number, 1–25).

```cypher
MATCH (focus)
WHERE focus.id = $focusId
  AND (focus:Skill OR focus:Role OR focus:Technology)

MATCH p = (focus)-[*1..3]-(reached)
WHERE reached <> focus
  AND (reached:Skill OR reached:Role OR reached:Technology OR reached:Resource)
WITH reached, min(length(p)) AS hops
ORDER BY hops ASC, coalesce(reached.name, reached.title) ASC
WITH head(labels(reached)) AS label,
     collect({ id: reached.id, name: coalesce(reached.name, reached.title), hops: hops }) AS items
RETURN label, items[0..$perLabelLimit] AS items, size(items) AS total
ORDER BY label ASC
```

**Traversal:** up to three hops across **every** relationship type, reaching **four different node
labels** in one pattern. A route might run

```
React ──RELATED_TO──> TypeScript <──REQUIRES── Backend Engineer ──USES──> Express
```

crossing Skill → Skill → Role → Technology without a single join being spelled out.

**Result:** one row per label, each with the closest `$perLabelLimit` nodes and a total count so the
UI can show *"+12 more"*.

**Why this is the query to point at:** it is not that a relational database *cannot* answer it — a
recursive CTE can. It is that the relational version must union a different join for **every
relationship table** at **every level** of the recursion (skill→skill, role→skill, role→technology,
technology→skill, skill→resource, skill→category, technology→technology), and the result set mixes
four entity types that no single table describes, so the projection needs a discriminator column and
a pile of `NULL`s. Adding a ninth relationship type to the model would mean editing that CTE. Here
it changes nothing: `[*1..3]` already covers it.

**Example call:**

```ts
readQuery(REACHABLE_WITHIN_THREE_HOPS, { focusId: "react", perLabelLimit: 8 }, mapGroup);
```

---

## Supporting queries

### `GRAPH_STATS` — `lib/queries/stats.ts`

Node counts per label plus the total relationship count. Parameters: none.

```cypher
MATCH (n)
WITH count(CASE WHEN n:Skill THEN 1 END) AS skills, …
OPTIONAL MATCH ()-[r]->()
RETURN skills, roles, technologies, resources, categories, count(r) AS relationships
```

The `OPTIONAL MATCH` on the relationship half matters: on a freshly created, empty instance a plain
`MATCH ()-[r]->()` returns zero rows and the whole query yields nothing, so the application could
not tell *"empty database"* from *"query failed"*. With `OPTIONAL MATCH` it reliably returns all
zeros, which is what drives the **"Your knowledge graph is empty — run `npm run seed`"** first-run
state.

### `TOP_SKILLS_BY_DEMAND` — `lib/queries/stats.ts`

Skills ranked by how many roles require them. Parameters: `$limit`.

Demand is the in-degree of `REQUIRES`, computed at query time — a small, clear example of
"relationships are the data".

### `CATEGORIES_WITH_SKILLS` — `lib/queries/stats.ts`

Categories with a preview of their skills. Parameters: `$skillsPerCategory`. Powers both the
homepage "Popular paths" section and, with a higher limit, the full `/skills` listing.

### `LIST_SKILLS` / `LIST_ROLES` — `lib/queries/search.ts`

Flat lists for the learning-path pickers and the browse pages. Parameters: none. The seed graph is
small enough (~47 skills, 13 roles) that returning all of them is cheaper than paginating; at larger
scale these would need a cursor.

### `FETCH_PATH_ENDPOINTS` — `lib/queries/paths.ts`

Confirms both endpoints of a learning-path request exist, so the API can distinguish *"no such
skill"* (404) from *"no route between them"* (200 with `data: null`). Parameters: `$fromId`, `$toId`.

---

## Indexes and constraints

The seed script creates a uniqueness constraint per label:

```cypher
CREATE CONSTRAINT skill_id IF NOT EXISTS FOR (n:Skill) REQUIRE n.id IS UNIQUE
```

Uniqueness constraints double as indexes, so every `MATCH (s:Skill {id: $skillId})` becomes an index
lookup rather than a label scan — and a duplicate id becomes an error instead of a silently forked
node.

Constraint creation is best-effort: a managed instance may not grant schema privileges. The seed
warns and continues, because `MERGE` on `id` keeps the data correct either way — it is just slower
without the index.


---

## Engine portability

Everything here is standard openCypher, and it was checked against two engines: a Neo4j 5 Community
container and a live CognoDB instance. 21 of the 23 executions in `scripts/verify-queries.ts` were
identical on both from the start. One difference matters enough to record.

### Pattern predicates do not work on CognoDB

A *pattern predicate* is a graph pattern used as a boolean inside `WHERE`:

```cypher
MATCH (role:Role)
WHERE NOT (role)-[:REQUIRES]->(:Skill {id: 'react'})
RETURN count(role)
```

| Form | Neo4j 5 | CognoDB |
|---|---|---|
| `MATCH (r:Role)-[:REQUIRES]->(:Skill {id:'react'})` — a real match | 2 | **2** ✅ |
| `WHERE (role)-[:REQUIRES]->(:Skill {id:'react'})` — pattern predicate | 2 | **13** ❌ |
| `WHERE NOT (role)-[:REQUIRES]->(...)` | 11 | **0** ❌ |
| `WHERE NOT exists((role)-[:REQUIRES]->(...))` | 11 | **0** ❌ |
| `WHERE NOT EXISTS { MATCH (role)-[:REQUIRES]->(...) }` | 11 | **0** ❌ |
| `WHERE size([(role)-[:REQUIRES]->(...) \| 1]) = 0` | 11 | **0** ❌ |
| **Anti-join through a collected id list** | 11 | **11** ✅ |

CognoDB appears to evaluate the pattern as a constant `true`: the positive form matches every row
and the negated form matches none. **No error is raised.** The query succeeds and returns the wrong
answer — which is the dangerous failure mode, because a smoke test that only asks "did rows come
back?" reports success.

### The portable form

```cypher
-- collect the ids to exclude …
OPTIONAL MATCH (direct:Role)-[:REQUIRES]->(start)
WITH start, collect(DISTINCT direct.id) AS directRoleIds

-- … then exclude by membership
MATCH (role:Role)-[:REQUIRES]->(skill)
WHERE NOT role.id IN directRoleIds
```

`collect` skips nulls, so an empty exclusion list is `[]` and `NOT x IN []` is `true` for every row —
the "nothing to exclude" case falls out correctly with no special handling.

Both affected queries — [Query 3](#query-3--multi-hop-role-discovery) and the skill-gap half of
[Query 6](#query-6--role-exploration) — now use this form and return results identical to Neo4j.

### How this is prevented from coming back

- **`tests/queries.test.ts`** fails the build if any predicate line in any query contains a graph
  pattern (`)-[` or `)<-[`). Cypher `//` comments are excluded from the scan, so a query may still
  *document* the non-portable form it avoids.
- **`scripts/verify-queries.ts`** asserts each query's contract rather than its row count: that no
  role requiring React directly appears in the two-hops-away list, that no already-required skill is
  reported as a gap, that a path starts and ends where it was asked to, that the graph view contains
  no duplicate or dangling nodes. A silently-empty result now fails.
