import { ButtonLink, Container } from "@/components/ui";

export default function NotFound() {
  return (
    <Container>
      <div className="mx-auto max-w-md py-20 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-accent">404</p>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight text-ink">
          That node isn&apos;t in the graph
        </h1>
        <p className="mt-2 text-sm text-ink-muted">
          The skill, role or page you were looking for doesn&apos;t exist. Try searching instead.
        </p>
        <div className="mt-6 flex justify-center gap-2">
          <ButtonLink href="/">Back to home</ButtonLink>
          <ButtonLink href="/skills" variant="secondary">
            Browse skills
          </ButtonLink>
        </div>
      </div>
    </Container>
  );
}
