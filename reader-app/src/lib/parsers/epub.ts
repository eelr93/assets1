import JSZip from "jszip";
import type { Chapter, ParagraphBlock, ParsedBook } from "../types";
import { sanitizeHtml } from "../sanitize";
import { guessImageMime, resolveZipPath } from "./paths";

const HEADING_TAGS = new Set(["H1", "H2", "H3", "H4", "H5", "H6"]);
const BLOCK_TAGS = new Set([
  "P",
  "H1",
  "H2",
  "H3",
  "H4",
  "H5",
  "H6",
  "LI",
  "BLOCKQUOTE",
  "FIGCAPTION",
]);

async function readXml(zip: JSZip, path: string): Promise<Document> {
  const entry = zip.file(path);
  if (!entry) throw new Error(`No se encontró ${path} dentro del EPUB`);
  const text = await entry.async("string");
  return new DOMParser().parseFromString(text, "application/xml");
}

async function resolveImageToDataUrl(zip: JSZip, path: string): Promise<string | undefined> {
  const entry = zip.file(path);
  if (!entry) return undefined;
  const base64 = await entry.async("base64");
  return `data:${guessImageMime(path)};base64,${base64}`;
}

async function extractParagraphs(
  zip: JSZip,
  doc: Document,
  chapterPath: string
): Promise<ParagraphBlock[]> {
  const body = doc.querySelector("body");
  if (!body) return [];

  const blocks: ParagraphBlock[] = [];
  const elements = body.querySelectorAll(
    "p, h1, h2, h3, h4, h5, h6, li, blockquote, figcaption, img"
  );

  for (const el of Array.from(elements)) {
    // Skip nested blocks already captured by an ancestor block (e.g. <p> inside <li>).
    if (el.tagName !== "IMG" && el.parentElement && isInsideBlock(el.parentElement)) continue;

    if (el.tagName === "IMG") {
      if (el.parentElement && BLOCK_TAGS.has(el.parentElement.tagName)) continue; // handled as part of parent text below via innerHTML
      const src = el.getAttribute("src");
      if (!src) continue;
      const dataUrl = await resolveImageToDataUrl(zip, resolveZipPath(chapterPath, src));
      if (!dataUrl) continue;
      const alt = el.getAttribute("alt") ?? "";
      blocks.push({ kind: "image", html: sanitizeHtml(`<img src="${dataUrl}" alt="${alt}" />`) });
      continue;
    }

    const text = (el.textContent ?? "").trim();
    if (!text) continue;

    const imgs = Array.from(el.querySelectorAll("img"));
    let innerHtml = el.innerHTML;
    for (const img of imgs) {
      const src = img.getAttribute("src");
      if (!src) continue;
      const dataUrl = await resolveImageToDataUrl(zip, resolveZipPath(chapterPath, src));
      if (dataUrl) innerHtml = innerHtml.replaceAll(src, dataUrl);
    }

    if (HEADING_TAGS.has(el.tagName)) {
      blocks.push({
        kind: "heading",
        level: Number(el.tagName[1]) as ParagraphBlock["level"],
        html: sanitizeHtml(innerHtml),
      });
    } else {
      blocks.push({ kind: "text", html: sanitizeHtml(innerHtml) });
    }
  }

  return blocks;
}

function isInsideBlock(el: Element): boolean {
  let current: Element | null = el;
  while (current) {
    if (BLOCK_TAGS.has(current.tagName)) return true;
    current = current.parentElement;
  }
  return false;
}

export async function parseEpub(file: File): Promise<ParsedBook> {
  const zip = await JSZip.loadAsync(file);

  const containerDoc = await readXml(zip, "META-INF/container.xml");
  const opfPath = containerDoc.querySelector("rootfile")?.getAttribute("full-path");
  if (!opfPath) throw new Error("EPUB inválido: no se encontró el archivo OPF");

  const opfDoc = await readXml(zip, opfPath);
  const manifestItems = new Map<string, { href: string; mediaType: string; properties: string }>();
  opfDoc.querySelectorAll("manifest > item").forEach((item) => {
    const id = item.getAttribute("id");
    const href = item.getAttribute("href");
    if (!id || !href) return;
    manifestItems.set(id, {
      href: resolveZipPath(opfPath, href),
      mediaType: item.getAttribute("media-type") ?? "",
      properties: item.getAttribute("properties") ?? "",
    });
  });

  const title = getFirstText(opfDoc, "title");
  const author = getFirstText(opfDoc, "creator");

  let cover: string | undefined;
  const coverItem = Array.from(manifestItems.values()).find((i) =>
    i.properties.split(/\s+/).includes("cover-image")
  );
  const coverMetaId = opfDoc
    .querySelector('metadata > meta[name="cover"]')
    ?.getAttribute("content");
  const coverById = coverMetaId ? manifestItems.get(coverMetaId) : undefined;
  const coverHref = coverItem?.href ?? coverById?.href;
  if (coverHref) {
    cover = await resolveImageToDataUrl(zip, coverHref);
  }

  const spineIds = Array.from(opfDoc.querySelectorAll("spine > itemref"))
    .map((el) => el.getAttribute("idref"))
    .filter((id): id is string => Boolean(id));

  const chapters: Chapter[] = [];
  let chapterNumber = 0;
  for (const idref of spineIds) {
    const item = manifestItems.get(idref);
    if (!item) continue;
    if (!/html|xml/i.test(item.mediaType)) continue;

    try {
      const entry = zip.file(item.href);
      if (!entry) continue;
      const text = await entry.async("string");
      const doc = new DOMParser().parseFromString(text, "text/html");
      const paragraphs = await extractParagraphs(zip, doc, item.href);
      if (paragraphs.length === 0) continue;

      chapterNumber += 1;
      const heading = paragraphs.find((p) => p.kind === "heading");
      const chapterTitle = heading
        ? stripHtml(heading.html)
        : doc.querySelector("title")?.textContent?.trim() || `Capítulo ${chapterNumber}`;

      chapters.push({ title: chapterTitle || `Capítulo ${chapterNumber}`, paragraphs });
    } catch (err) {
      console.warn("No se pudo procesar el capítulo", item.href, err);
    }
  }

  return {
    title: title || file.name.replace(/\.epub$/i, ""),
    author: author || "Autor desconocido",
    cover,
    chapters,
  };
}

function getFirstText(doc: Document, localName: string): string | undefined {
  const el = Array.from(doc.getElementsByTagName("*")).find(
    (e) => e.localName === localName && e.parentElement?.localName === "metadata"
  );
  return el?.textContent?.trim() || undefined;
}

function stripHtml(html: string): string {
  const div = document.createElement("div");
  div.innerHTML = html;
  return (div.textContent ?? "").trim();
}
