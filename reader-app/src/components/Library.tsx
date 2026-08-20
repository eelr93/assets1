"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import { deleteBook, getProgress, listBooks, saveBook } from "@/lib/db";
import { detectFormat, parseBook } from "@/lib/parsers";
import type { ReadingProgress, StoredBook } from "@/lib/types";
import { BookCard } from "@/components/BookCard";
import { AvisoInstalar } from "@/components/AvisoInstalar";

export function Library({ onOpenBook }: { onOpenBook: (bookId: string) => void }) {
  const [books, setBooks] = useState<StoredBook[]>([]);
  const [progress, setProgress] = useState<Record<string, ReadingProgress | undefined>>({});
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState<string[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const refresh = useCallback(async () => {
    const list = await listBooks();
    setBooks(list);
    const entries = await Promise.all(
      list.map(async (b) => [b.id, await getProgress(b.id)] as const)
    );
    setProgress(Object.fromEntries(entries));
    setLoading(false);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const list = await listBooks();
      if (cancelled) return;
      setBooks(list);
      const entries = await Promise.all(
        list.map(async (b) => [b.id, await getProgress(b.id)] as const)
      );
      if (cancelled) return;
      setProgress(Object.fromEntries(entries));
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleFiles = useCallback(
    async (fileList: FileList | null) => {
      if (!fileList || fileList.length === 0) return;
      const files = Array.from(fileList);
      setErrors([]);
      setImporting(files.map((f) => f.name));

      for (const file of files) {
        const format = detectFormat(file);
        if (!format) {
          setErrors((prev) => [...prev, `${file.name}: formato no compatible (usá EPUB, PDF o TXT)`]);
          setImporting((prev) => prev.filter((n) => n !== file.name));
          continue;
        }
        try {
          const parsed = await parseBook(file, format);
          const book: StoredBook = {
            id: uuidv4(),
            title: parsed.title,
            author: parsed.author,
            format,
            cover: parsed.cover,
            addedAt: Date.now(),
            sizeBytes: file.size,
            fileName: file.name,
          };
          await saveBook(book, file);
        } catch (err) {
          console.error(err);
          setErrors((prev) => [...prev, `${file.name}: no se pudo leer el archivo`]);
        } finally {
          setImporting((prev) => prev.filter((n) => n !== file.name));
        }
      }

      await refresh();
    },
    [refresh]
  );

  /** El libro tocado más recientemente, si quedó a mitad de camino. */
  const ultimoLeido = useMemo(() => {
    const candidatos = books
      .map((libro) => ({ libro, avance: progress[libro.id] }))
      .filter(
        (c): c is { libro: StoredBook; avance: ReadingProgress } =>
          Boolean(c.avance) && c.avance!.fraction > 0.01 && c.avance!.fraction < 0.99
      )
      .sort((a, b) => b.avance.updatedAt - a.avance.updatedAt);

    const primero = candidatos[0];
    if (!primero) return null;
    return {
      libro: primero.libro,
      porcentaje: Math.round(primero.avance.fraction * 100),
    };
  }, [books, progress]);

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Mi biblioteca</h1>
          <p className="mt-1 text-[var(--foreground)]/60">
            {books.length === 0
              ? "Cargá tus libros en EPUB, PDF o TXT."
              : `${books.length} ${books.length === 1 ? "libro" : "libros"} · se guardan en este dispositivo`}
          </p>
        </div>
        <div>
          <input
            ref={inputRef}
            type="file"
            accept=".epub,.pdf,.txt,application/epub+zip,application/pdf,text/plain"
            multiple
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
          />
          <button
            onClick={() => inputRef.current?.click()}
            className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[var(--accent)] px-5 font-semibold text-[var(--accent-foreground)] shadow-sm transition hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] sm:w-auto"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
              <path d="M12 5v14M5 12h14" strokeLinecap="round" />
            </svg>
            Cargar libro
          </button>
        </div>
      </header>

      <AvisoInstalar />

      {/*
        Retomar donde quedó es la acción más frecuente y hasta ahora costaba lo
        mismo que cualquier otra: encontrar la tapa entre todas. Se muestra
        arriba, con el porcentaje, y no se abre sola — que la app decida por vos
        qué abrir molesta cuando querías otra cosa.
      */}
      {ultimoLeido && (
        <button
          onClick={() => onOpenBook(ultimoLeido.libro.id)}
          className="flex items-center gap-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-3 text-left shadow-sm transition hover:shadow-md"
        >
          <div className="h-20 w-15 shrink-0 overflow-hidden rounded-lg bg-[var(--surface-muted)]" style={{ width: 60 }}>
            {ultimoLeido.libro.cover ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={ultimoLeido.libro.cover} alt="" className="h-full w-full object-cover" />
            ) : (
              <div className="h-full w-full bg-gradient-to-br from-[var(--accent)] to-[color-mix(in_srgb,var(--accent)_60%,#000)]" />
            )}
          </div>

          <div className="min-w-0 flex-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-[var(--accent)]">
              Seguir leyendo
            </span>
            <p className="mt-0.5 line-clamp-2 font-semibold leading-snug">{ultimoLeido.libro.title}</p>
            <div className="mt-2 flex items-center gap-2">
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--surface-muted)]">
                <div
                  className="h-full rounded-full bg-[var(--accent)]"
                  style={{ width: `${ultimoLeido.porcentaje}%` }}
                />
              </div>
              <span className="text-xs tabular-nums text-[var(--foreground)]/60">
                {ultimoLeido.porcentaje}%
              </span>
            </div>
          </div>
        </button>
      )}

      {importing.length > 0 && (
        <div
          role="status"
          className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm"
        >
          Procesando {importing.join(", ")}…
        </div>
      )}

      {errors.length > 0 && (
        <div role="alert" className="rounded-lg border border-red-400/40 bg-red-500/10 px-4 py-3 text-sm text-red-700 dark:text-red-300">
          {errors.map((e) => (
            <p key={e}>{e}</p>
          ))}
        </div>
      )}

      {loading ? (
        <p className="text-sm text-[var(--foreground)]/60">Cargando biblioteca…</p>
      ) : books.length === 0 ? (
        <button
          onClick={() => inputRef.current?.click()}
          className="flex flex-1 flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed border-[var(--border)] px-6 py-20 text-center transition hover:border-[var(--accent)] hover:bg-[var(--surface)]"
        >
          <svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-[var(--accent)]" aria-hidden>
            <path d="M12 7c-2.2-1.9-5.6-2.8-9.6-2.8v14C6.4 18.2 9.8 19.1 12 21c2.2-1.9 5.6-2.8 9.6-2.8v-14C17.6 4.2 14.2 5.1 12 7z" strokeLinejoin="round" />
            <path d="M12 7v14" strokeLinecap="round" />
          </svg>
          <span className="text-xl font-semibold">Todavía no hay libros</span>
          <span className="max-w-sm text-[var(--foreground)]/60">
            Tocá acá para elegir un archivo EPUB, PDF o TXT del teléfono. Se guarda en el
            dispositivo y después se puede leer sin internet.
          </span>
        </button>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {books.map((book) => (
            <BookCard
              key={book.id}
              book={book}
              progressFraction={progress[book.id]?.fraction}
              onOpen={() => onOpenBook(book.id)}
              onDelete={async () => {
                if (!confirm(`¿Eliminar "${book.title}" de la biblioteca?`)) return;
                await deleteBook(book.id);
                await refresh();
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
