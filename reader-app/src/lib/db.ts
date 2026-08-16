import { createStore, get, set, del, keys, type UseStore } from "idb-keyval";
import type { ReadingProgress, StoredBook } from "./types";

// Each store gets its own database: idb-keyval's createStore only sets up the
// object store named in that call, so sharing one database name across calls
// leaves the later stores missing (the upgrade that creates them never runs).
const booksStore: UseStore = createStore("accesible-reader-books", "books");
const filesStore: UseStore = createStore("accesible-reader-files", "files");
const progressStore: UseStore = createStore("accesible-reader-progress", "progress");

export async function saveBook(book: StoredBook, file: Blob): Promise<void> {
  await set(book.id, book, booksStore);
  await set(book.id, file, filesStore);
}

export async function listBooks(): Promise<StoredBook[]> {
  const ids = await keys(booksStore);
  const books = await Promise.all(ids.map((id) => get<StoredBook>(id, booksStore)));
  return books
    .filter((b): b is StoredBook => Boolean(b))
    .sort((a, b) => b.addedAt - a.addedAt);
}

export async function getBook(id: string): Promise<StoredBook | undefined> {
  return get<StoredBook>(id, booksStore);
}

export async function getBookFile(id: string): Promise<Blob | undefined> {
  return get<Blob>(id, filesStore);
}

export async function deleteBook(id: string): Promise<void> {
  await del(id, booksStore);
  await del(id, filesStore);
  await del(id, progressStore);
}

export async function saveProgress(progress: ReadingProgress): Promise<void> {
  await set(progress.bookId, progress, progressStore);
}

export async function getProgress(bookId: string): Promise<ReadingProgress | undefined> {
  return get<ReadingProgress>(bookId, progressStore);
}
