import Link from "next/link";
import type { Metadata } from "next";

import { Card, Container, LevelBadge } from "@/components/ui";
import { DatabaseUnavailableState, EmptyGraphState } from "@/components/ui/DatabaseStates";
import { load } from "@/lib/server-data";
import { listRoles } from "@/lib/services/search";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Roles",
  description: "Every career role in the graph, with the skills and technologies behind it.",
};

/** Browse every role. */
export default async function RolesPage() {
  const roles = await load("roles:index", () => listRoles());

  if (!roles.ok) {
    return (
      <Container>
        <DatabaseUnavailableState retryHref="/roles" />
      </Container>
    );
  }

  if (roles.data.length === 0) {
    return (
      <Container>
        <EmptyGraphState />
      </Container>
    );
  }

  return (
    <Container className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-ink sm:text-3xl">Roles</h1>
        <p className="mt-2 max-w-2xl text-sm text-ink-muted">
          {roles.data.length} career roles. Each one shows its required skills, the technologies it
          uses, the roles nearest to it and the skills it is missing compared with them.
        </p>
      </header>

      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {roles.data.map((role) => (
          <Card key={role.id} as="li" className="transition-colors hover:border-accent">
            <Link href={`/roles/${role.id}`} className="block p-5">
              <div className="flex items-start justify-between gap-2">
                <span className="text-sm font-semibold text-ink">{role.name}</span>
                <LevelBadge level={role.level} />
              </div>
              <p className="mt-2 text-xs leading-relaxed text-ink-muted">{role.description}</p>
            </Link>
          </Card>
        ))}
      </ul>
    </Container>
  );
}
