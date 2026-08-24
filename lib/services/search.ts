import { readQuery } from "@/lib/db";
import { toRole, toSearchResult, toSkill } from "@/lib/mappers";
import { LIST_ROLES, LIST_SKILLS, SEARCH_NODES } from "@/lib/queries";
import type { Role, SearchResult, Skill } from "@/lib/types";
import type { Record as Neo4jRecord } from "neo4j-driver";

/** Flow A — search across skills, roles, technologies and resources. */
export async function searchNodes(query: string, limit: number): Promise<SearchResult[]> {
  return readQuery(SEARCH_NODES, { query, limit }, (record: Neo4jRecord) =>
    toSearchResult({
      id: record.get("id"),
      label: record.get("label"),
      name: record.get("name"),
      description: record.get("description"),
      url: record.get("url"),
    }),
  );
}

export async function listSkills(): Promise<Skill[]> {
  return readQuery(LIST_SKILLS, {}, (record) =>
    toSkill({
      id: record.get("id"),
      name: record.get("name"),
      description: record.get("description"),
      difficulty: record.get("difficulty"),
    }),
  );
}

export async function listRoles(): Promise<Role[]> {
  return readQuery(LIST_ROLES, {}, (record) =>
    toRole({
      id: record.get("id"),
      name: record.get("name"),
      description: record.get("description"),
      level: record.get("level"),
    }),
  );
}
