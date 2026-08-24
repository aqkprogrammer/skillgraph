import { ButtonLink, Card } from "@/components/ui";

/**
 * The intentional first-run state: the connection works, but nothing has been
 * seeded yet. Showing the exact command turns a confusing empty page into a
 * one-step instruction.
 */
export function EmptyGraphState() {
  return (
    <Card className="px-6 py-10 text-center">
      <h2 className="text-lg font-semibold text-ink">Your knowledge graph is empty</h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-ink-muted">
        SkillGraph is connected to CognoDB, but there is no data in it yet. Load the seed dataset
        and refresh this page.
      </p>
      <pre className="mx-auto mt-5 w-fit rounded-lg border border-line bg-surface-muted px-4 py-2.5 text-left text-sm text-ink">
        <code>npm run seed</code>
      </pre>
      <p className="mt-4 text-xs text-ink-subtle">
        The seed script is safe to rerun — it merges on stable ids rather than creating duplicates.
      </p>
    </Card>
  );
}

/**
 * Shown when CognoDB cannot be reached at all. Deliberately says nothing about
 * why: the URI, the credentials and the driver error live in the server log.
 */
export function DatabaseUnavailableState({ retryHref = "/" }: { retryHref?: string }) {
  return (
    <Card className="px-6 py-10 text-center">
      <h2 className="text-lg font-semibold text-ink">
        We couldn&apos;t connect to the knowledge graph
      </h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-ink-muted">
        Please try again in a moment. If this keeps happening, the database may be starting up or
        temporarily unavailable.
      </p>
      <div className="mt-5 flex justify-center">
        <ButtonLink href={retryHref} variant="secondary">
          Try again
        </ButtonLink>
      </div>
    </Card>
  );
}
