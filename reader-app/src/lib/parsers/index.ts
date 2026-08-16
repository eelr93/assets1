import type { BookFormat, ParsedBook } from "../types";
import { parseEpub } from "./epub";
import { parsePdf } from "./pdf";
import { parseTxt } from "./txt";

export function detectFormat(file: File): BookFormat | undefined {
  const name = file.name.toLowerCase();
  if (name.endsWith(".epub")) return "epub";
  if (name.endsWith(".pdf")) return "pdf";
  if (name.endsWith(".txt")) return "txt";
  if (file.type === "application/epub+zip") return "epub";
  if (file.type === "application/pdf") return "pdf";
  if (file.type === "text/plain") return "txt";
  return undefined;
}

export async function parseBook(file: File, format: BookFormat): Promise<ParsedBook> {
  switch (format) {
    case "epub":
      return parseEpub(file);
    case "pdf":
      return parsePdf(file);
    case "txt":
      return parseTxt(file);
  }
}
