import type { ParagraphBlock } from "./types";

/**
 * Texto plano de cada párrafo, conservando su posición en el capítulo.
 *
 * A diferencia de `paragraphsToPlainText`, acá **no se descartan** las imágenes
 * ni los párrafos vacíos: se devuelven como cadena vacía. Eso es a propósito —
 * la lectura en voz alta necesita que el índice del texto coincida con el
 * índice del párrafo en pantalla para poder resaltar el que está sonando. Si se
 * filtraran, los índices se correrían y se resaltaría el párrafo equivocado.
 */
export function paragraphsToSpeakableText(paragraphs: ParagraphBlock[]): string[] {
  return paragraphs.map((p) => {
    if (p.kind === "image") return "";
    const div = document.createElement("div");
    div.innerHTML = p.html;
    return (div.textContent ?? "").replace(/\s+/g, " ").trim();
  });
}

export function paragraphsToPlainText(paragraphs: ParagraphBlock[]): string {
  return paragraphs
    .filter((p) => p.kind !== "image")
    .map((p) => {
      const div = document.createElement("div");
      div.innerHTML = p.html;
      return (div.textContent ?? "").trim();
    })
    .filter(Boolean)
    .join("\n\n");
}
