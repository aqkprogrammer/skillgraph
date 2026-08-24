# Screenshots

These are captured from the running application against a seeded database — not mockups.

| File | Page | Shows |
|---|---|---|
| `01-homepage.png` | `/` | Hero and search, live graph inventory (47 / 13 / 23 / 42 / 8 / 411), *Popular paths* by category, *Most in-demand skills* ranked by REQUIRES in-degree |
| `02-search-results.png` | `/search?q=react` | Flow A — one query across Skill, Role, Technology and Resource, with a type badge per result |
| `03-skill-detail.png` | `/skills/react` | Flow B — *What should I learn next?* with graph-derived reasons, prerequisites/unlocks, related skills, roles, technologies, the multi-hop career traversal and resources |
| `04-role-detail.png` | `/roles/ml-engineer` | Flow C — required skills, technologies, derived *Related roles* with shared-skill counts, *Skill gaps*, and resources collected across every required skill |
| `05-learning-path.png` | `/paths?from=javascript&to=machine-learning` | Flow D — `shortestPath` result rendered as ordered steps with each relationship labelled in its traversed direction |
| `06-graph-visualisation.png` | `/explore?focus=react&depth=2` | Flow E — radial graph coloured by node label, plus *Reachable within 3 hops* grouped by type |
| `07-empty-state.png` | `/` against an empty database | The intentional first-run state: *"Your knowledge graph is empty"* with the `npm run seed` command |
| `08-database-error.png` | `/` with the database unreachable | *"We couldn't connect to the knowledge graph"* — and no URI, credential or driver message anywhere on the page |

## Refreshing them

With the app running on port 3000 and the database seeded:

```bash
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
OUT=docs/screenshots

shot () {
  "$CHROME" --headless=new --disable-gpu --hide-scrollbars --force-color-profile=srgb \
    --virtual-time-budget=6000 --window-size=1440,"$2" \
    --screenshot="$OUT/$1.png" "http://localhost:3000$3"
}

shot 01-homepage            1500 "/"
shot 02-search-results      1100 "/search?q=react"
shot 03-skill-detail        2400 "/skills/react"
shot 04-role-detail         2300 "/roles/ml-engineer"
shot 05-learning-path       1000 "/paths?from=javascript&to=machine-learning"
shot 06-graph-visualisation 1250 "/explore?focus=react&depth=2"
```

On Linux, replace `$CHROME` with `google-chrome` or `chromium`.

## The two state screenshots

`07` and `08` cannot be produced by the script above, because each needs the database in an unusual
state. Both were captured the same way, by pointing `.env.local` (which overrides `.env`) somewhere
else and restarting the dev server.

**`07-empty-state.png` — connected, but nothing seeded.** Captured against a real but empty Bolt
database:

```bash
docker run -d --name skillgraph-empty -p 7688:7687 -e NEO4J_AUTH=neo4j/emptygraph123 neo4j:5-community
printf 'COGNODB_URI=bolt://localhost:7688\nCOGNODB_USERNAME=neo4j\nCOGNODB_PASSWORD=emptygraph123\n' > .env.local
npm run dev
# /api/health → {"connected":true,"seeded":false,"stats":{...all zeros}}
```

This is the distinction the health endpoint exists to make: **connected but not seeded** is a
different problem from **cannot connect**, and the UI says so — it shows the `npm run seed` command
rather than an error.

**`08-database-error.png` — cannot connect at all.** Captured by pointing at a host that does not
resolve:

```bash
printf 'COGNODB_URI=bolt+s://db-unreachable-host.invalid.databases.cognodb.com\nCOGNODB_USERNAME=cognodb\nCOGNODB_PASSWORD=not-a-real-password\n' > .env.local
npm run dev
# /api/health → 503 {"data":null,"error":{"code":"DATABASE_UNAVAILABLE","message":"We couldn't connect…"}}
```

The point of this screenshot is what is **absent**: no URI, no username, no driver message, no stack
trace. The driver's actual error (`Neo4jError: Failed to connect to server…`) went to the server log
only.

Afterwards, `rm .env.local` restores the real configuration.
