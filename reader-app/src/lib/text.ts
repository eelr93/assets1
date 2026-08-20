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

/**
 * Envuelve en `<mark>` cada aparición de `termino` dentro de un HTML ya
 * saneado, para poder ver dónde cayó lo que se buscó.
 *
 * El buscador llevaba al párrafo correcto y ahí terminaba su ayuda: encontrar
 * la palabra dentro del párrafo quedaba para los ojos, que es justamente lo
 * que cuesta acá.
 *
 * ── Por qué no es un `replace` y ya ─────────────────────────────────────────
 *
 * El texto viene como HTML. Un reemplazo directo sobre toda la cadena metería
 * `<mark>` adentro de los atributos de una etiqueta (buscar "img" rompería
 * cada imagen del capítulo) y adentro de las entidades (buscar "amp" partiría
 * los `&amp;`). Por eso se parte primero en etiquetas, entidades y texto, y
 * solo se toca el texto.
 *
 * Sin acentos no busca: se mantiene igual que el panel de búsqueda, que compara
 * en minúsculas y nada más. Si un día se le agrega el plegado de acentos, tiene
 * que cambiar en los dos lados a la vez o el resaltado no va a coincidir con
 * los resultados.
 *
 * ── Lo que no cubre ─────────────────────────────────────────────────────────
 *
 * Una palabra partida al medio por una etiqueta (`pe<em>rro</em>`) queda sin
 * marcar. El buscador sí la encuentra, porque compara sobre el texto plano, así
 * que un resultado puede llevar a un párrafo donde no se resalta nada. Es raro
 * y el salto igual cae en el párrafo correcto; unir los pedazos obligaría a
 * reconstruir el árbol del HTML y a rearmarlo después, para un caso que casi no
 * aparece en un libro real.
 *
 * Nunca se inserta el término escrito por quien busca, solo el pedazo del HTML
 * que ya estaba ahí y ya pasó por el saneado. Por eso esto no reabre la puerta
 * que cierra DOMPurify.
 */
export function marcarTermino(html: string, termino: string): string {
  const limpio = termino.trim();
  if (limpio.length < 3) return html;

  const escapado = limpio.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const buscar = new RegExp(escapado, "gi");

  return html
    .split(/(<[^>]*>|&[a-zA-Z#0-9]+;)/)
    .map((trozo, i) =>
      // Los índices impares son las etiquetas y entidades capturadas por el
      // grupo del `split`; van tal cual.
      i % 2 === 1 ? trozo : trozo.replace(buscar, (m) => `<mark class="reader-hallazgo">${m}</mark>`)
    )
    .join("");
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
