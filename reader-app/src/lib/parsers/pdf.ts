import type * as PdfjsLib from "pdfjs-dist";
import type { TextItem } from "pdfjs-dist/types/src/display/api";
import type { Chapter, ParagraphBlock, ParsedBook } from "../types";
import { sanitizeHtml } from "../sanitize";

const PAGES_PER_CHAPTER = 15;

// pdfjs-dist touches browser-only globals (DOMMatrix) at module load time, so it
// must never be imported during server-side rendering — only lazily, on the client.
async function loadPdfjs(): Promise<typeof PdfjsLib> {
  const pdfjsLib = await import("pdfjs-dist");
  pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
  return pdfjsLib;
}

export async function parsePdf(file: File): Promise<ParsedBook> {
  const pdfjsLib = await loadPdfjs();
  const arrayBuffer = await file.arrayBuffer();
  const doc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

  const metadata = await doc.getMetadata().catch(() => undefined);
  const info = metadata?.info as { Title?: string; Author?: string } | undefined;

  const allParagraphs: ParagraphBlock[] = [];
  for (let pageNum = 1; pageNum <= doc.numPages; pageNum++) {
    const page = await doc.getPage(pageNum);
    const content = await page.getTextContent();
    const paragraphs = groupIntoParagraphs(content.items as TextItem[]);
    allParagraphs.push(...paragraphs);
  }

  const chapters: Chapter[] = [];
  const paragraphsPerChapter = Math.ceil(allParagraphs.length / Math.ceil(doc.numPages / PAGES_PER_CHAPTER)) || allParagraphs.length;
  for (let i = 0; i < allParagraphs.length; i += paragraphsPerChapter) {
    const slice = allParagraphs.slice(i, i + paragraphsPerChapter);
    if (slice.length === 0) continue;
    chapters.push({
      title: `Parte ${chapters.length + 1}`,
      paragraphs: slice,
    });
  }
  if (chapters.length === 0) {
    chapters.push({ title: "Documento", paragraphs: [] });
  }

  return {
    title: info?.Title?.trim() || file.name.replace(/\.pdf$/i, ""),
    author: info?.Author?.trim() || "",
    chapters,
  };
}

function groupIntoParagraphs(items: TextItem[]): ParagraphBlock[] {
  type Line = { y: number; text: string; maxHeight: number };
  const lines: Line[] = [];

  for (const item of items) {
    const text = item.str;
    if (text === undefined) continue;
    const y = Math.round(item.transform[5]);
    const height = item.height || 10;
    const last = lines[lines.length - 1];
    if (last && Math.abs(last.y - y) < height * 0.5) {
      last.text += text;
    } else {
      lines.push({ y, text, maxHeight: height });
    }
  }

  const paragraphs: ParagraphBlock[] = [];
  let buffer: string[] = [];
  let prevY: number | null = null;
  let prevHeight = 10;

  const flush = () => {
    const text = buffer.join(" ").replace(/\s+/g, " ").trim();
    buffer = [];
    if (!text) return;
    paragraphs.push({ kind: "text", html: sanitizeHtml(escapeHtml(text)) });
  };

  for (const line of lines) {
    const text = line.text.trim();
    if (!text) continue;
    const gap = prevY === null ? 0 : prevY - line.y;
    const isNewParagraph = prevY !== null && gap > prevHeight * 1.4;
    if (isNewParagraph) flush();
    buffer.push(text);
    prevY = line.y;
    prevHeight = line.maxHeight;
  }
  flush();

  return paragraphs;
}

function escapeHtml(s: string): string {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}
