import { Container, Skeleton } from "@/components/ui";

/** Streamed while the explore page's queries run. */
export default function Loading() {
  return (
    <Container className="space-y-8">
      <div role="status" aria-live="polite">
        <span className="sr-only">Loading the graph…</span>
        <Skeleton className="h-9 w-64" />
        <Skeleton className="mt-3 h-4 w-full max-w-2xl" />
      </div>
      <div className="flex gap-4">
        <Skeleton className="h-10 flex-1" />
        <Skeleton className="h-10 w-48" />
      </div>
      <Skeleton className="h-[28rem] w-full sm:h-[32rem] lg:h-[36rem]" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <Skeleton key={index} className="h-52 w-full" />
        ))}
      </div>
    </Container>
  );
}
