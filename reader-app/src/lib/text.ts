import type { ParagraphBlock } from "./types";

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
