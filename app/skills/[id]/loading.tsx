import { Container, Skeleton } from "@/components/ui";

export default function Loading() {
  return (
    <Container className="space-y-10">
      <div role="status" aria-live="polite">
        <span className="sr-only">Loading skill…</span>
        <Skeleton className="h-4 w-32" />
        <Skeleton className="mt-3 h-10 w-72" />
        <Skeleton className="mt-3 h-4 w-full max-w-2xl" />
        <Skeleton className="mt-2 h-4 w-2/3 max-w-xl" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {Array.from({ length: 4 }, (_, index) => (
          <Skeleton key={index} className="h-28 w-full" />
        ))}
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        {Array.from({ length: 6 }, (_, index) => (
          <Skeleton key={index} className="h-20 w-full" />
        ))}
      </div>
    </Container>
  );
}
