import type { NodeLabel } from "@/lib/types";

/**
 * Where each node label's page lives.
 *
 * Skills and roles have dedicated detail pages. Technologies and categories
 * have no page of their own — they are best understood through their
 * connections, so they link into the graph explorer centred on themselves.
 * Keeping this in one function means every cross-link in the app agrees.
 */
export function hrefForNode(label: NodeLabel, id: string, url?: string): string {
  switch (label) {
    case "Skill":
      return `/skills/${id}`;
    case "Role":
      return `/roles/${id}`;
    case "Resource":
      return url ?? `/explore?focus=${id}`;
    default:
      return `/explore?focus=${id}`;
  }
}
