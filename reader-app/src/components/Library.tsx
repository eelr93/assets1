"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import { deleteBook, getProgress, listBooks, saveBook } from "@/lib/db";
import { detectFormat, parseBook } from "@/lib/parsers";
import type { StoredBook } from "@/lib/types";
import { BookCard } from "@/components/BookCard";

export function Library({ onOpenBook }: { onOpenBook: (bookId: string) => void }) {
  const [books, setBooks] = useState<StoredBook[]>([]);
  const [progress, setProgress] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState<string[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const refresh = useCallback(async () => {
    const list = await listBooks();
    setBooks(list);
    const entries = await Promise.all(
      list.map(async (b) => [b.id, (await getProgress(b.id))?.fraction ?? 0] as const)
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
        list.map(async (b) => [b.id, (await getProgress(b.id))?.fraction ?? 0] as const)
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

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Mi biblioteca</h1>
          <p className="text-sm text-[var(--foreground)]/60">
            Cargá tus libros en EPUB, PDF o TXT y ajustá la lectura a tu gusto.
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
            className="rounded-lg bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-[var(--accent-foreground)] shadow-sm transition hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
          >
            + Cargar libro
          </button>
        </div>
      </header>

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
        <div className="flex flex-1 flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-[var(--border)] py-16 text-center">
          <p className="text-lg font-medium">Todavía no cargaste ningún libro</p>
          <p className="max-w-sm text-sm text-[var(--foreground)]/60">
            Tocá &quot;Cargar libro&quot; y elegí un archivo EPUB, PDF o TXT desde tu dispositivo.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {books.map((book) => (
            <BookCard
              key={book.id}
              book={book}
              progressFraction={progress[book.id]}
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
