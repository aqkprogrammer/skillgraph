import type { Metadata } from "next";
import Link from "next/link";

import "./globals.css";
import { Container } from "@/components/ui";

export const metadata: Metadata = {
  title: {
    default: "SkillGraph — Career skill & learning path explorer",
    template: "%s · SkillGraph",
  },
  description:
    "Explore how skills, technologies, learning resources and career roles connect. Find prerequisites, discover roles you can reach, and get a learning path between any two skills.",
};

/** `shortLabel` keeps the nav inside a 375px viewport without truncation. */
const NAV = [
  { href: "/skills", label: "Skills" },
  { href: "/roles", label: "Roles" },
  { href: "/paths", label: "Learning path", shortLabel: "Paths" },
  { href: "/explore", label: "Explore" },
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen font-sans antialiased">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-accent focus:px-4 focus:py-2 focus:text-sm focus:text-white"
        >
          Skip to content
        </a>

        <header className="sticky top-0 z-40 border-b border-line bg-canvas/85 backdrop-blur">
          <Container className="flex h-16 items-center justify-between gap-3">
            <Link href="/" className="flex shrink-0 items-center gap-2.5">
              <GraphMark />
              <span className="text-base font-semibold tracking-tight text-ink">SkillGraph</span>
            </Link>

            {/* The nav scrolls rather than wrapping or overflowing the page:
                a narrow phone must never produce a horizontal page scrollbar. */}
            <nav aria-label="Main" className="no-scrollbar min-w-0 overflow-x-auto">
              <ul className="flex items-center gap-0.5 text-sm sm:gap-1">
                {NAV.map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className="block whitespace-nowrap rounded-lg px-2 py-1.5 text-ink-muted transition-colors hover:bg-surface-muted hover:text-ink sm:px-3"
                    >
                      <span className="sm:hidden">{item.shortLabel ?? item.label}</span>
                      <span className="hidden sm:inline">{item.label}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          </Container>
        </header>

        <main id="main" className="pb-20 pt-8 sm:pt-10">
          {children}
        </main>

        <footer className="border-t border-line py-8">
          <Container className="flex flex-col gap-2 text-xs text-ink-subtle sm:flex-row sm:items-center sm:justify-between">
            <p>
              SkillGraph — a graph-native explorer for skills, roles and learning resources.
            </p>
            <p>
              Data stored in <span className="font-medium text-ink-muted">CognoDB</span>, queried
              with openCypher over Bolt.
            </p>
          </Container>
        </footer>
      </body>
    </html>
  );
}

/** A three-node mark — the smallest possible drawing of the product. */
function GraphMark() {
  return (
    <svg width="26" height="26" viewBox="0 0 26 26" aria-hidden="true" className="shrink-0">
      <line x1="7" y1="18" x2="13" y2="8" stroke="var(--color-line-strong)" strokeWidth="1.5" />
      <line x1="13" y1="8" x2="19" y2="18" stroke="var(--color-line-strong)" strokeWidth="1.5" />
      <line x1="7" y1="18" x2="19" y2="18" stroke="var(--color-line-strong)" strokeWidth="1.5" />
      <circle cx="13" cy="8" r="3.6" fill="var(--color-accent)" />
      <circle cx="7" cy="18" r="3" fill="var(--color-technology)" />
      <circle cx="19" cy="18" r="3" fill="var(--color-role)" />
    </svg>
  );
}
