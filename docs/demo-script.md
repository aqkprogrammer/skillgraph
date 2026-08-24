# Screen-recording script

A 3–4 minute walkthrough. The order below builds an argument — *this is a real product* → *these
questions are graph-shaped* → *here is the query behind it* — rather than just touring the screens.

**Before recording**

- `npm run seed` has been run, and `/api/health` reports `{"connected": true, "seeded": true}`.
- Browser at **1440 × 900**, zoom 100 %, no extensions or bookmarks bar visible.
- A second tab open on [`docs/queries.md`](queries.md) for the two moments you show Cypher.
- Light mode. (The app follows the OS theme; light matches the screenshots.)
- Close the terminal, or keep one clean pane for the `npm run verify` shot at the end.

---

## 0:00 – 0:25 — What it is

**Screen:** homepage, `/`

> "This is SkillGraph — a career skill and learning path explorer. It's a Next.js app backed by
> CognoDB, a managed graph database that speaks openCypher over Bolt, so it connects with the
> official Neo4j driver.
>
> The graph has 47 skills, 13 roles, 23 technologies, 42 learning resources and 8 categories —
> **411 relationships between them.** That relationship count is the interesting number, and it's
> read live from the database on every request."

Scroll slowly through *Popular paths* and *Most in-demand skills*.

> "'Most in-demand' isn't a stored column. It's the in-degree of the REQUIRES relationship, counted
> at query time — so it can never go stale when a role changes what it needs."

---

## 0:25 – 0:50 — Flow A: Search

**Screen:** click the search box, type `react` slowly.

> "Search runs across four node labels at once — skills, roles, technologies and resources — in a
> single query. Results are ranked exact-match first, then prefix, then substring, and that ordering
> happens in the database so the limit cuts the worst results rather than an arbitrary slice."

Clear it, type `engineer`, let the dropdown fill.

> "Same query, completely different mix of node types."

Press Enter to show the full results page, then click **React**.

---

## 0:50 – 1:40 — Flow B: Skill explorer

**Screen:** `/skills/react`

Point at *What should I learn next?* first.

> "This is the feature the whole model is built for. Four different graph patterns produce
> candidates — missing prerequisites, what this skill unlocks, related skills, and skills that keep
> appearing next to React in job requirements. Each one is weighted, then boosted by how many roles
> require it.
>
> Notice the reasons: 'A foundation for this skill — learn it first. Required by 3 roles.' That
> sentence is generated from the graph structure, not written into the data."

Scroll to *Prerequisites* / *Unlocks*.

> "The same relationship type read in both directions — PREREQUISITE_FOR pointing in is what you
> need first, pointing out is what React opens up."

Scroll to **Careers two or more hops away** and pause here.

> "This is the multi-hop traversal, and it's the part that's genuinely awkward in SQL.
>
> React doesn't require ML Engineer and ML Engineer doesn't require React. But the graph walks
> React → JavaScript → Python → ML Engineer and finds it three hops out. And it deliberately
> **excludes** roles that already require React — so this is only showing careers you'd reach
> *through* neighbouring skills. That's discovery, not a lookup."

Switch tabs to `docs/queries.md`, show Query 3, read the one pattern line:

```cypher
MATCH path = (start)-[:PREREQUISITE_FOR|RELATED_TO*1..3]-(reached:Skill)<-[:REQUIRES]-(role:Role)
WHERE reached <> start AND NOT (role)-[:REQUIRES]->(start)
```

> "That's the whole thing. In SQL it's a recursive CTE over a skill-adjacency table, unioned across
> two relationship kinds, joined to a role junction table, with an anti-join and a window function
> to keep the shortest route per role."

---

## 1:40 – 2:10 — Flow C: Career explorer

**Screen:** click through to **ML Engineer**, then scroll to *Related roles* and *Skill gaps*.

> "Roles are never linked to each other in this model — there's no SIMILAR_TO edge. Similarity is
> derived by walking out to the skills they share and counting the ones in the middle. Data
> Scientist shares six skills with ML Engineer, so it ranks first, and it stays correct on its own
> when any role changes.
>
> Skill gaps is a three-hop pattern with a negative filter: skills that neighbouring roles require
> and this one doesn't. An ML Engineer is missing Linux, Infrastructure as Code, Networking — and it
> tells you which roles want them."

---

## 2:10 – 2:40 — Flow D: Learning path

**Screen:** `/paths`. Select **JavaScript** → **Machine Learning** live, so the loading state shows.

> "This is `shortestPath`, bounded at five hops. JavaScript is related to Python, and Python is a
> prerequisite for Machine Learning — so that's the route.
>
> The traversal is undirected on purpose, because a realistic route into a new field steps sideways
> before it steps forward. But the app tracks whether each edge was walked backwards, so it says
> 'is related to' and 'is a prerequisite for' accurately rather than implying a dependency the data
> doesn't claim."

Now switch to **HTML & CSS → Kubernetes**.

> "And when nothing connects them within five hops, that's a real answer, not an error — a 200 with
> a dedicated empty state. A *missing* skill would be a 404. Keeping those apart matters."

---

## 2:40 – 3:20 — Flow E: Graph explorer

**Screen:** `/explore?focus=react&depth=2`

> "Each ring is one hop from the centre, and colour is the node type — skills, roles, technologies,
> resources, categories."

Hover a node to show connected edges highlighting; click one to re-centre.

> "Clicking re-centres the graph, and the state is in the URL, so any view is shareable."

Switch depth to **3 hops**, then scroll to *Reachable within 3 hops*.

> "And this is the query I'd point at if you asked me to justify the graph database in one example.
>
> From React within three hops: 37 skills, 13 roles, 17 technologies, 18 learning resources. One
> traversal, four entity types. A route through it might go React → TypeScript → Backend Engineer →
> Express — skill, skill, role, technology — without naming a single join.
>
> In SQL that's a recursive CTE that unions a different join for every relationship table at every
> level, and returns a result set that no single table describes. Adding a ninth relationship type
> would mean rewriting it. Here `[*1..3]` already covers it."

---

## 3:20 – 3:50 — Engineering

Quick sequence, roughly ten seconds each.

**1. Error handling.** Stop the database (or use a deliberately wrong password) and reload:

> "If the database is unreachable, the user gets one sentence and a retry. No stack trace, no
> connection string, no driver message. The detail goes to the server log."

**2. Tests.** `npm test`:

> "145 tests, none of which need a database. They cover configuration, input validation, the
> internal-versus-public error contract, the service logic, and properties of every query — one test
> fails the build if a value is ever concatenated into Cypher instead of parameterised."

**3. Live query check.** `npm run verify`:

> "And this runs every query in the application against a real instance. It's how I caught a bug the
> unit tests couldn't: Bolt distinguishes integers from floats, and the driver sends a JavaScript
> number as a float — so `LIMIT $limit` arrived as `LIMIT 10.0` and the server rejected it. Every
> paginated query would have failed in production while passing every unit test."

---

## 3:50 – 4:00 — Close

> "Everything is server-side — the browser never sees a credential, and there's no endpoint that
> accepts Cypher. Every query is documented in docs/queries.md with its parameters, its traversal
> and why it's written that way."

---

## Recording notes

- Move the cursor deliberately and pause on each section — the reader needs a beat to read a label.
- Let loading states appear. They are part of the work, and skeletons flashing past look like a
  glitch rather than a feature.
- If a take runs long, cut section 3:20–3:50 first, but keep the `npm run verify` moment if you can —
  it is the most interesting thing in the recording.
- Suggested tools: QuickTime (⌘⇧5) on macOS, or OBS for a webcam inset.
