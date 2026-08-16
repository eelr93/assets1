export type BookFormat = "epub" | "pdf" | "txt";

export type ParagraphBlock = {
  /** Sanitized inner HTML (allowlisted tags only) ready for dangerouslySetInnerHTML. */
  html: string;
  kind: "heading" | "text" | "image";
  level?: 1 | 2 | 3 | 4 | 5 | 6;
};

export type Chapter = {
  title: string;
  paragraphs: ParagraphBlock[];
};

export type ParsedBook = {
  title: string;
  author: string;
  /** data: URL for the cover image, if any could be extracted. */
  cover?: string;
  chapters: Chapter[];
};

export type StoredBook = {
  id: string;
  title: string;
  author: string;
  format: BookFormat;
  cover?: string;
  addedAt: number;
  sizeBytes: number;
  fileName: string;
};

export type ReadingProgress = {
  bookId: string;
  chapterIndex: number;
  paragraphIndex: number;
  /** 0..1 fraction through the whole book, for the progress bar. */
  fraction: number;
  updatedAt: number;
};

export type ThemeId = "light" | "sepia" | "dark" | "night" | "contrast";

export type FontId = "accessible" | "reading-serif" | "system";

export type ReadingSettings = {
  theme: ThemeId;
  font: FontId;
  fontSize: number; // px
  lineHeight: number; // unitless multiplier
  letterSpacing: number; // em
  wordSpacing: number; // em
  contentWidth: number; // px, max measure of the text column
  textAlign: "left" | "justify";
  focusMode: boolean;
  focusDimOpacity: number; // 0..1, opacity applied to non-active paragraphs
};

export const DEFAULT_SETTINGS: ReadingSettings = {
  theme: "light",
  font: "accessible",
  fontSize: 22,
  lineHeight: 1.7,
  letterSpacing: 0,
  wordSpacing: 0,
  contentWidth: 640,
  textAlign: "left",
  focusMode: false,
  focusDimOpacity: 0.35,
};
