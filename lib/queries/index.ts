/**
 * Every Cypher statement in the application lives under lib/queries/ and is
 * re-exported here. Keeping the query text in one place — separate from the
 * services that run it and the routes that expose it — means the whole
 * data-access surface of the app can be reviewed by reading this directory.
 */
export { SEARCH_NODES, LIST_SKILLS, LIST_ROLES } from "@/lib/queries/search";
export { GRAPH_STATS, TOP_SKILLS_BY_DEMAND, CATEGORIES_WITH_SKILLS } from "@/lib/queries/stats";
export { SKILL_DETAIL, ROLES_REACHABLE_FROM_SKILL } from "@/lib/queries/skills";
export { ROLE_DETAIL } from "@/lib/queries/roles";
export { SHORTEST_LEARNING_PATH, FETCH_PATH_ENDPOINTS } from "@/lib/queries/paths";
export { SKILL_RECOMMENDATIONS } from "@/lib/queries/recommendations";
export {
  GRAPH_DEPTHS,
  GRAPH_NEIGHBOURHOOD,
  REACHABLE_WITHIN_THREE_HOPS,
  type GraphDepth,
} from "@/lib/queries/graph";
