"use client";

import type { StoredBook } from "@/lib/types";

const FORMAT_LABEL: Record<StoredBook["format"], string> = {
  epub: "EPUB",
  pdf: "PDF",
  txt: "Texto",
};

export function BookCard({
  book,
  progressFraction,
  onOpen,
  onDelete,
}: {
  book: StoredBook;
  progressFraction?: number;
  onOpen: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="group relative flex flex-col overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-sm transition hover:shadow-md">
      <button
        onClick={onOpen}
        className="flex flex-1 flex-col text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
        aria-label={`Abrir ${book.title}`}
      >
        <div className="flex aspect-[3/4] items-center justify-center bg-[var(--surface-muted)]">
          {book.cover ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={book.cover}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : (
            <span className="px-4 text-center text-sm text-[var(--foreground)]/60">
              {FORMAT_LABEL[book.format]}
            </span>
          )}
        </div>
        <div className="flex flex-1 flex-col gap-1 p-3">
          <span className="line-clamp-2 text-sm font-semibold">{book.title}</span>
          {book.author && (
            <span className="line-clamp-1 text-xs text-[var(--foreground)]/60">{book.author}</span>
          )}
          <span className="mt-auto pt-1 text-[10px] uppercase tracking-wide text-[var(--foreground)]/50">
            {FORMAT_LABEL[book.format]}
          </span>
        </div>
        {progressFraction !== undefined && progressFraction > 0 && (
          <div className="h-1 w-full bg-[var(--surface-muted)]" aria-hidden>
            <div
              className="h-1 bg-[var(--accent)]"
              style={{ width: `${Math.min(100, Math.round(progressFraction * 100))}%` }}
            />
          </div>
        )}
      </button>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
        aria-label={`Eliminar ${book.title}`}
        className="absolute right-2 top-2 rounded-full bg-black/50 p-1.5 text-white opacity-0 transition group-hover:opacity-100 focus-visible:opacity-100"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M18 6 6 18M6 6l12 12" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  );
}
