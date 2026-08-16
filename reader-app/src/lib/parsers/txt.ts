import type { Chapter, ParsedBook } from "../types";
import { sanitizeHtml } from "../sanitize";

const CHAPTER_HEADING = /^(chapter|cap[ií]tulo|parte|part)\s+[\divxlc]+/i;

export async function parseTxt(file: File): Promise<ParsedBook> {
  const text = await file.text();
  const blocks = text
    .split(/\r?\n\s*\r?\n/)
    .map((b) => b.trim())
    .filter(Boolean);

  const chapters: Chapter[] = [];
  let current: Chapter = { title: "Capítulo 1", paragraphs: [] };

  for (const block of blocks) {
    const singleLine = !block.includes("\n");
    if (singleLine && (CHAPTER_HEADING.test(block) || (block.length < 60 && block === block.toUpperCase() && /[A-ZÁÉÍÓÚÑ]/.test(block)))) {
      if (current.paragraphs.length > 0) chapters.push(current);
      current = { title: block, paragraphs: [{ kind: "heading", level: 2, html: sanitizeHtml(block) }] };
      continue;
    }
    current.paragraphs.push({ kind: "text", html: sanitizeHtml(escapeHtml(block).replaceAll("\n", "<br/>")) });
  }
  if (current.paragraphs.length > 0) chapters.push(current);

  if (chapters.length === 0) {
    chapters.push({ title: "Documento", paragraphs: [] });
  }

  return {
    title: file.name.replace(/\.txt$/i, ""),
    author: "",
    chapters,
  };
}

function escapeHtml(s: string): string {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}
