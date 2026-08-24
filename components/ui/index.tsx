import Link from "next/link";
import type { ReactNode } from "react";

import type { Difficulty, NodeLabel, RoleLevel } from "@/lib/types";

/**
 * The application's UI primitives.
 *
 * They are deliberately plain: small typed wrappers over Tailwind classes, no
 * component library, no variant engine. Everything here can be read top to
 * bottom in a minute, and the styling all resolves to the tokens declared in
 * app/globals.css.
 */

export function Container({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`mx-auto w-full max-w-6xl px-4 sm:px-6 ${className}`}>{children}</div>;
}

export function Card({
  children,
  className = "",
  as: Element = "div",
}: {
  children: ReactNode;
  className?: string;
  as?: "div" | "section" | "article" | "li";
}) {
  return (
    <Element
      className={`rounded-card border border-line bg-surface ${className}`}
    >
      {children}
    </Element>
  );
}

export function SectionHeading({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h2 className="text-lg font-semibold tracking-tight text-ink">{title}</h2>
        {description ? <p className="mt-1 text-sm text-ink-muted">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}

/** Colour per node label, shared with the graph visualisation. */
const LABEL_STYLES: Record<NodeLabel, string> = {
  Skill: "bg-skill-soft text-skill",
  Role: "bg-role-soft text-role",
  Technology: "bg-technology-soft text-technology",
  Resource: "bg-resource-soft text-resource",
  Category: "bg-category-soft text-category",
};

export function NodeBadge({ label, className = "" }: { label: NodeLabel; className?: string }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${LABEL_STYLES[label]} ${className}`}
    >
      {label}
    </span>
  );
}

const DIFFICULTY_STYLES: Record<Difficulty, string> = {
  beginner: "border-line text-ink-muted",
  intermediate: "border-line-strong text-ink-muted",
  advanced: "border-line-strong text-ink",
};

export function DifficultyBadge({ difficulty }: { difficulty: Difficulty }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium capitalize ${DIFFICULTY_STYLES[difficulty]}`}
    >
      {difficulty}
    </span>
  );
}

export function LevelBadge({ level }: { level: RoleLevel }) {
  return (
    <span className="inline-flex items-center rounded-full border border-line px-2 py-0.5 text-[11px] font-medium capitalize text-ink-muted">
      {level}
    </span>
  );
}

export function Pill({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-surface-muted px-2.5 py-1 text-xs font-medium text-ink-muted">
      {children}
    </span>
  );
}

/** A link styled as the primary action. */
export function ButtonLink({
  href,
  children,
  variant = "primary",
}: {
  href: string;
  children: ReactNode;
  variant?: "primary" | "secondary";
}) {
  const styles =
    variant === "primary"
      ? "bg-accent text-white hover:bg-accent-strong"
      : "border border-line bg-surface text-ink hover:border-line-strong hover:bg-surface-muted";
  return (
    <Link
      href={href}
      className={`inline-flex items-center justify-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-medium transition-colors ${styles}`}
    >
      {children}
    </Link>
  );
}

/**
 * A chip linking to a node's page. Used everywhere a related node is listed —
 * one component means every cross-link in the app looks and behaves the same.
 */
export function NodeChip({
  href,
  name,
  label,
  meta,
}: {
  href: string;
  name: string;
  label?: NodeLabel;
  meta?: string;
}) {
  return (
    <Link
      href={href}
      className="group inline-flex items-center gap-2 rounded-lg border border-line bg-surface px-3 py-1.5 text-sm text-ink transition-colors hover:border-accent hover:bg-accent-soft"
    >
      {label ? <NodeBadge label={label} /> : null}
      <span className="font-medium">{name}</span>
      {meta ? <span className="text-xs text-ink-subtle">{meta}</span> : null}
    </Link>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-card border border-dashed border-line-strong bg-surface-muted/60 px-6 py-10 text-center">
      <p className="text-sm font-semibold text-ink">{title}</p>
      <p className="mx-auto mt-1.5 max-w-md text-sm text-ink-muted">{description}</p>
      {action ? <div className="mt-4 flex justify-center">{action}</div> : null}
    </div>
  );
}

/**
 * The single error state the whole application uses.
 *
 * It never renders a stack trace, a connection string or a driver message — the
 * server logs those. The user gets a sentence and a way forward.
 */
export function ErrorState({
  title = "We couldn't connect to the knowledge graph.",
  description = "Please try again in a moment.",
  action,
}: {
  title?: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div
      role="alert"
      className="rounded-card border border-danger/30 bg-danger-soft px-6 py-8 text-center"
    >
      <p className="text-sm font-semibold text-danger">{title}</p>
      <p className="mx-auto mt-1.5 max-w-md text-sm text-ink-muted">{description}</p>
      {action ? <div className="mt-4 flex justify-center">{action}</div> : null}
    </div>
  );
}

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`skeleton ${className}`} aria-hidden="true" />;
}

/** A labelled block of skeleton lines, used while a section is loading. */
export function SkeletonList({ rows = 4, label }: { rows?: number; label: string }) {
  return (
    <div role="status" aria-live="polite" className="space-y-2">
      <span className="sr-only">{label}</span>
      {Array.from({ length: rows }, (_, index) => (
        <Skeleton key={index} className="h-10 w-full" />
      ))}
    </div>
  );
}
