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

## Two more worth capturing by hand

Neither can be produced by the script above, because both need the database in an unusual state.
Both are already implemented — these would just document them.

- **`07-empty-state.png`** — point `.env.local` at an empty database (or run
  `npm run seed -- --reset` and stop before re-seeding) and load `/`. Shows the intentional
  first-run state: *"Your knowledge graph is empty"* with the `npm run seed` command.
- **`08-database-error.png`** — stop the database, or set a deliberately wrong `COGNODB_PASSWORD`,
  and load `/`. Shows *"We couldn't connect to the knowledge graph"* with a retry — and, more to the
  point, shows that no URI, credential or driver message appears anywhere on the page.
