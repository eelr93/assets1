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

/**
 * Un punto guardado a propósito, distinto del progreso.
 *
 * El progreso es dónde quedó; el marcador es dónde quiso volver. Guarda un
 * fragmento del texto para que la lista se pueda leer sin abrir el libro:
 * "capítulo 4, párrafo 12" no le dice nada a nadie.
 */
export type Marcador = {
  chapterIndex: number;
  paragraphIndex: number;
  chapterTitle: string;
  fragmento: string;
  creadoEn: number;
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
  /**
   * Velocidad del desplazamiento automático, en renglones por minuto.
   *
   * Va en renglones y no en píxeles a propósito: ella cambia el tamaño de letra
   * todo el tiempo, y una velocidad en píxeles que a 22 px es cómoda a 40 px se
   * siente el doble de rápida. En renglones, la sensación no cambia.
   */
  autoScrollRenglones: number;
  /**
   * Modelo de voz neuronal a usar, o `null` para la voz del sistema.
   *
   * Se guarda el identificador y no el modelo: el modelo vive en el
   * almacenamiento del navegador y puede no estar (el sistema lo puede borrar
   * si hace falta lugar). Al abrir, la app comprueba que siga descargado y si
   * no está vuelve a la voz del sistema en lugar de quedarse muda.
   */
  vozNatural: string | null;
};

export type ProfileStatus = "pending" | "approved" | "rejected";

export type Profile = {
  id: string;
  email: string;
  status: ProfileStatus;
  is_admin: boolean;
  created_at: string;
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
  autoScrollRenglones: 18,
  vozNatural: null,
};
