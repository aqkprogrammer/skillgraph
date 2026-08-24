/**
 * Domain and transport types for SkillGraph.
 *
 * These mirror the graph model in CognoDB one-to-one: every node label has a
 * matching interface, and every API route returns one of the shapes below.
 */

/** Every node label used in the graph. Also doubles as the badge type in the UI. */
export type NodeLabel = "Skill" | "Role" | "Technology" | "Resource" | "Category";

/** Every relationship type used in the graph. */
export type RelationshipType =
  | "PREREQUISITE_FOR"
  | "RELATED_TO"
  | "REQUIRES"
  | "TAUGHT_BY"
  | "BUILDS_ON"
  | "REQUIRES_SKILL"
  | "BELONGS_TO"
  | "USES";

export type Difficulty = "beginner" | "intermediate" | "advanced";
export type RoleLevel = "junior" | "mid" | "senior";
export type ResourceType = "documentation" | "course" | "book" | "tutorial" | "interactive";

export interface Skill {
  id: string;
  name: string;
  description: string;
  difficulty: Difficulty;
}

export interface Role {
  id: string;
  name: string;
  description: string;
  level: RoleLevel;
}

export interface Technology {
  id: string;
  name: string;
  description: string;
}

export interface Resource {
  id: string;
  title: string;
  url: string;
  type: ResourceType;
  difficulty: Difficulty;
  provider: string;
}

export interface Category {
  id: string;
  name: string;
  description: string;
}

/**
 * A single row of search output. Search spans four labels, so the result is a
 * flattened, display-oriented shape rather than a union of the domain types.
 */
export interface SearchResult {
  id: string;
  label: NodeLabel;
  name: string;
  description: string;
  /** Populated for Resource hits so the UI can link out directly. */
  url?: string;
}

/** Everything Flow B (the skill explorer) needs, fetched in a single query. */
export interface SkillDetail {
  skill: Skill;
  categories: Category[];
  prerequisites: Skill[];
  unlocks: Skill[];
  relatedSkills: Skill[];
  roles: Role[];
  technologies: Technology[];
  resources: Resource[];
}

/** Everything Flow C (the career explorer) needs, fetched in a single query. */
export interface RoleDetail {
  role: Role;
  requiredSkills: Skill[];
  technologies: Technology[];
  resources: Resource[];
  relatedRoles: RelatedRole[];
  /** Skills required by related roles that this role does not require — the "skill gap". */
  skillGaps: SkillGap[];
}

/** A role that shares required skills with the role being viewed. */
export interface RelatedRole extends Role {
  /** How many required skills this role has in common with the viewed role. */
  sharedSkillCount: number;
}

/** A skill the viewed role does not require, plus which nearby roles do. */
export interface SkillGap extends Skill {
  /** Names of the related roles that require this skill. */
  requiredByRoles: string[];
}

/** One step in a learning path — the node plus how you arrived at it. */
export interface LearningPathStep {
  node: SearchResult;
  /** The relationship traversed to reach this node. Null for the first step. */
  via: RelationshipType | null;
  /** True when the relationship was traversed against its stored direction. */
  reversed: boolean;
}

export interface LearningPath {
  from: Skill;
  to: Skill;
  steps: LearningPathStep[];
  /** Number of relationships in the path (steps.length - 1). */
  hops: number;
}

/** A role discovered by multi-hop traversal from a starting skill. */
export interface ReachableRole {
  role: Role;
  /** Shortest number of relationships between the starting skill and the role. */
  hops: number;
  /** Names of the intermediate skills traversed on the shortest route. */
  via: string[];
}

export type RecommendationKind =
  | "prerequisite"
  | "next-step"
  | "related"
  | "role-demand";

/** One "what should I learn next?" suggestion, with the graph evidence behind it. */
export interface Recommendation {
  skill: Skill;
  kind: RecommendationKind;
  /** Higher is better. Derived from graph structure, see lib/queries/recommendations.ts. */
  score: number;
  /** Human-readable justification, e.g. "Required by 4 roles that also need React". */
  reason: string;
  /** How many roles require this skill — surfaced as a badge in the UI. */
  roleDemand: number;
  /** A resource that teaches this skill, when one exists. */
  topResource: Resource | null;
}

/** A node in the graph visualisation. */
export interface GraphNode {
  id: string;
  label: NodeLabel;
  name: string;
  /** Hop distance from the focus node. 0 = the focus node itself. */
  depth: number;
}

/** An edge in the graph visualisation. */
export interface GraphRelationship {
  id: string;
  source: string;
  target: string;
  type: RelationshipType;
}

export interface GraphData {
  focusId: string;
  nodes: GraphNode[];
  relationships: GraphRelationship[];
  /** True when the traversal hit its node cap and the view is partial. */
  truncated: boolean;
}

/** Counts used by the homepage and the "database is empty" first-run state. */
export interface GraphStats {
  skills: number;
  roles: number;
  technologies: number;
  resources: number;
  categories: number;
  relationships: number;
}

/** Every API route returns this envelope — success and failure alike. */
export interface ApiResponse<T> {
  data: T | null;
  error: ApiError | null;
}

export interface ApiError {
  /** Stable, machine-readable code. Never contains internal detail. */
  code: ApiErrorCode;
  /** Safe, user-facing message. Never contains credentials or stack traces. */
  message: string;
}

export type ApiErrorCode =
  | "INVALID_INPUT"
  | "NOT_FOUND"
  | "DATABASE_UNAVAILABLE"
  | "DATABASE_NOT_CONFIGURED"
  | "INTERNAL_ERROR";
