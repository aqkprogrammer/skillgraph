import type { Resource } from "@/lib/types";
import { Card, EmptyState } from "@/components/ui";

const TYPE_LABEL: Record<Resource["type"], string> = {
  documentation: "Docs",
  course: "Course",
  book: "Book",
  tutorial: "Tutorial",
  interactive: "Interactive",
};

/** Shared by the skill and role pages so learning resources always look alike. */
export function ResourceList({ resources, emptyMessage }: { resources: Resource[]; emptyMessage: string }) {
  if (resources.length === 0) {
    return <EmptyState title="No learning resources yet" description={emptyMessage} />;
  }

  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {resources.map((resource) => (
        <Card key={resource.id} as="li" className="transition-colors hover:border-accent">
          <a
            href={resource.url}
            target="_blank"
            rel="noreferrer noopener"
            className="block p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <span className="text-sm font-medium text-ink">{resource.title}</span>
              <span className="shrink-0 rounded-full bg-resource-soft px-2 py-0.5 text-[11px] font-semibold text-resource">
                {TYPE_LABEL[resource.type]}
              </span>
            </div>
            <p className="mt-2 text-xs text-ink-subtle">
              {resource.provider} · <span className="capitalize">{resource.difficulty}</span>
            </p>
          </a>
        </Card>
      ))}
    </ul>
  );
}
