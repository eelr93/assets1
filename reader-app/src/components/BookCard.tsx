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
  const porcentaje =
    progressFraction !== undefined && progressFraction > 0
      ? Math.min(100, Math.round(progressFraction * 100))
      : 0;

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-lg">
      <button
        onClick={onOpen}
        className="flex flex-1 flex-col text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2"
        aria-label={`Abrir ${book.title}`}
      >
        <div className="relative flex aspect-[3/4] items-center justify-center overflow-hidden bg-[var(--surface-muted)]">
          {book.cover ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={book.cover}
              alt=""
              className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
            />
          ) : (
            // Sin tapa, en vez de dejar un rectángulo gris con tres letras se
            // dibuja un lomo de libro con el título. La mayoría de los PDF y
            // los TXT no traen portada, así que este es el caso habitual, no
            // la excepción.
            <div className="flex h-full w-full flex-col justify-between bg-gradient-to-br from-[var(--accent)] to-[color-mix(in_srgb,var(--accent)_60%,#000)] p-3 text-left">
              <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-white/70">
                {FORMAT_LABEL[book.format]}
              </span>
              <span className="line-clamp-4 text-sm font-semibold leading-snug text-white">
                {book.title}
              </span>
            </div>
          )}

          {porcentaje > 0 && (
            <span className="absolute bottom-2 left-2 rounded-full bg-black/65 px-2 py-0.5 text-[11px] font-semibold text-white backdrop-blur-sm">
              {porcentaje}%
            </span>
          )}
        </div>

        <div className="flex flex-1 flex-col gap-1 p-3">
          <span className="line-clamp-2 font-semibold leading-snug">{book.title}</span>
          {book.author && (
            <span className="line-clamp-1 text-sm text-[var(--foreground)]/60">{book.author}</span>
          )}
        </div>

        <div className="h-1.5 w-full bg-[var(--surface-muted)]" aria-hidden>
          <div
            className="h-full rounded-r-full bg-[var(--accent)] transition-[width] duration-500"
            style={{ width: `${porcentaje}%` }}
          />
        </div>
      </button>

      {/*
        Antes este botón solo aparecía al pasar el mouse por encima. En un
        teléfono no hay mouse: quedaba invisible o siempre visible según el
        navegador. Ahora está siempre, tenue, y con el área táctil de 44 px que
        hace falta para no errarle.
      */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
        aria-label={`Eliminar ${book.title}`}
        className="absolute right-1.5 top-1.5 flex h-9 w-9 items-center justify-center rounded-full bg-black/45 text-white opacity-70 backdrop-blur-sm transition hover:bg-black/70 hover:opacity-100 focus-visible:opacity-100"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M18 6 6 18M6 6l12 12" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  );
}
