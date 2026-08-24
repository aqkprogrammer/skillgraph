"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";

import { fetchApi, isAbort } from "@/lib/api-client";
import { hrefForNode } from "@/lib/links";
import type { SearchResult } from "@/lib/types";
import { NodeBadge, Skeleton } from "@/components/ui";

const DEBOUNCE_MS = 220;
const MIN_QUERY_LENGTH = 2;

/**
 * Flow A — search across skills, roles, technologies and resources.
 *
 * Results appear as you type. Two details make that behave well: the request is
 * debounced so a fast typist issues one query rather than ten, and each new
 * request aborts the previous one so a slow early response can never overwrite
 * a fast later one.
 */
export function SearchBar({
  autoFocus = false,
  placeholder = "Search skills, roles, technologies…",
}: {
  autoFocus?: boolean;
  placeholder?: string;
}) {
  const router = useRouter();
  const listboxId = useId();

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [open, setOpen] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const trimmed = query.trim();

    if (trimmed.length < MIN_QUERY_LENGTH) {
      setResults([]);
      setStatus("idle");
      return;
    }

    const controller = new AbortController();
    setStatus("loading");

    const timer = setTimeout(async () => {
      try {
        const data = await fetchApi<SearchResult[]>(
          `/api/search?q=${encodeURIComponent(trimmed)}&limit=8`,
          controller.signal,
        );
        setResults(data);
        setStatus("ready");
      } catch (error) {
        if (isAbort(error)) return;
        setErrorMessage(error instanceof Error ? error.message : "Search is unavailable.");
        setStatus("error");
      }
    }, DEBOUNCE_MS);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  // Close the results panel when focus or a click leaves the component.
  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  const showPanel = open && query.trim().length >= MIN_QUERY_LENGTH;

  return (
    <div ref={containerRef} className="relative w-full">
      <form
        role="search"
        onSubmit={(event) => {
          event.preventDefault();
          const trimmed = query.trim();
          if (trimmed.length >= MIN_QUERY_LENGTH) {
            setOpen(false);
            router.push(`/search?q=${encodeURIComponent(trimmed)}`);
          }
        }}
      >
        <label htmlFor={`${listboxId}-input`} className="sr-only">
          Search the knowledge graph
        </label>
        <div className="relative">
          <SearchIcon />
          <input
            id={`${listboxId}-input`}
            type="search"
            value={query}
            autoFocus={autoFocus}
            onChange={(event) => {
              setQuery(event.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onKeyDown={(event) => {
              if (event.key === "Escape") setOpen(false);
            }}
            placeholder={placeholder}
            role="combobox"
            aria-expanded={showPanel}
            aria-controls={listboxId}
            aria-autocomplete="list"
            autoComplete="off"
            className="w-full rounded-xl border border-line bg-surface py-3 pl-11 pr-4 text-sm text-ink placeholder:text-ink-subtle transition-colors hover:border-line-strong focus:border-accent"
          />
        </div>
      </form>

      {showPanel ? (
        <div
          id={listboxId}
          className="absolute left-0 right-0 top-full z-30 mt-2 overflow-hidden rounded-xl border border-line bg-surface shadow-lg shadow-black/5"
        >
          {status === "loading" ? (
            <div className="space-y-2 p-3" role="status" aria-live="polite">
              <span className="sr-only">Searching…</span>
              <Skeleton className="h-9 w-full" />
              <Skeleton className="h-9 w-4/5" />
              <Skeleton className="h-9 w-3/5" />
            </div>
          ) : null}

          {status === "error" ? (
            <p role="alert" className="px-4 py-5 text-sm text-danger">
              {errorMessage}
            </p>
          ) : null}

          {status === "ready" && results.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-ink-muted">
              No results for “{query.trim()}”. Try a broader term such as “data” or “react”.
            </p>
          ) : null}

          {status === "ready" && results.length > 0 ? (
            <ul className="max-h-80 overflow-y-auto py-1">
              {results.map((result) => (
                <li key={`${result.label}-${result.id}`}>
                  <Link
                    href={hrefForNode(result.label, result.id, result.url)}
                    onClick={() => setOpen(false)}
                    className="flex items-start gap-3 px-4 py-2.5 transition-colors hover:bg-surface-muted"
                  >
                    <NodeBadge label={result.label} className="mt-0.5" />
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium text-ink">
                        {result.name}
                      </span>
                      {result.description ? (
                        <span className="block truncate text-xs text-ink-muted">
                          {result.description}
                        </span>
                      ) : null}
                    </span>
                  </Link>
                </li>
              ))}
              <li className="border-t border-line">
                <Link
                  href={`/search?q=${encodeURIComponent(query.trim())}`}
                  onClick={() => setOpen(false)}
                  className="block px-4 py-2.5 text-xs font-medium text-accent hover:bg-surface-muted"
                >
                  See all results for “{query.trim()}”
                </Link>
              </li>
            </ul>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function SearchIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 20 20"
      className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-subtle"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <circle cx="9" cy="9" r="6" />
      <path d="m13.5 13.5 3.5 3.5" strokeLinecap="round" />
    </svg>
  );
}
