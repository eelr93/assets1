"use client";

import { useMemo, useState } from "react";
import type { Marcador, ParsedBook } from "@/lib/types";

type Seccion = "capitulos" | "marcadores" | "buscar";

type Resultado = {
  chapterIndex: number;
  paragraphIndex: number;
  chapterTitle: string;
  fragmento: string;
};

/**
 * Índice, marcadores y búsqueda, en un solo lugar.
 *
 * Antes los capítulos vivían en un desplegable del encabezado. En un libro de
 * cuarenta capítulos eso es una lista diminuta dentro de un control diminuto, y
 * además ocupaba el espacio que hacía falta para los botones de letra. Acá la
 * lista se ve entera, con el capítulo actual marcado.
 */
export function PanelIndice({
  libro,
  capituloActual,
  marcadores,
  onIr,
  onBorrarMarcador,
  onCerrar,
}: {
  libro: ParsedBook;
  capituloActual: number;
  marcadores: Marcador[];
  onIr: (chapterIndex: number, paragraphIndex?: number) => void;
  onBorrarMarcador: (creadoEn: number) => void;
  onCerrar: () => void;
}) {
  const [seccion, setSeccion] = useState<Seccion>("capitulos");
  const [consulta, setConsulta] = useState("");

  /**
   * Texto plano de cada párrafo de cada capítulo, para buscar.
   *
   * Se calcula una sola vez al abrir el panel y no en cada tecla: recorrer un
   * libro entero quitando etiquetas en cada pulsación se nota en el teléfono.
   */
  const indiceTexto = useMemo(
    () =>
      libro.chapters.map((c) =>
        c.paragraphs.map((p) => {
          if (p.kind === "image") return "";
          const div = document.createElement("div");
          div.innerHTML = p.html;
          return (div.textContent ?? "").replace(/\s+/g, " ").trim();
        })
      ),
    [libro]
  );

  const resultados = useMemo<Resultado[]>(() => {
    const termino = consulta.trim().toLowerCase();
    if (termino.length < 3) return [];

    const hallados: Resultado[] = [];
    for (let ci = 0; ci < indiceTexto.length; ci++) {
      for (let pi = 0; pi < indiceTexto[ci].length; pi++) {
        const texto = indiceTexto[ci][pi];
        const donde = texto.toLowerCase().indexOf(termino);
        if (donde === -1) continue;

        // Un poco de texto alrededor para reconocer el pasaje sin abrirlo.
        const desde = Math.max(0, donde - 40);
        hallados.push({
          chapterIndex: ci,
          paragraphIndex: pi,
          chapterTitle: libro.chapters[ci].title,
          fragmento:
            (desde > 0 ? "…" : "") + texto.slice(desde, donde + termino.length + 60).trim() + "…",
        });
        // Se corta en 60: más resultados no ayudan a encontrar nada y llenan la
        // pantalla de texto para leer, que es justo lo que cuesta acá.
        if (hallados.length >= 60) return hallados;
      }
    }
    return hallados;
  }, [consulta, indiceTexto, libro]);

  const pestana = (id: Seccion, texto: string) => (
    <button
      onClick={() => setSeccion(id)}
      className={`min-h-11 flex-1 rounded-lg px-3 text-sm font-medium transition ${
        seccion === id ? "bg-[var(--accent)] text-[var(--accent-foreground)]" : "hover:bg-[var(--surface-muted)]"
      }`}
    >
      {texto}
    </button>
  );

  const fila =
    "flex w-full flex-col gap-0.5 rounded-xl px-3 py-3 text-left transition hover:bg-[var(--surface-muted)]";

  return (
    <div
      className="fixed inset-0 z-30 flex items-end justify-center bg-black/50 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-label="Índice del libro"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCerrar();
      }}
    >
      <div className="flex max-h-[85vh] w-full max-w-lg flex-col rounded-t-2xl bg-[var(--background)] text-[var(--foreground)] shadow-2xl sm:rounded-2xl">
        <div className="flex items-center gap-2 border-b border-[var(--border)] p-3">
          <div className="flex flex-1 gap-1">
            {pestana("capitulos", "Capítulos")}
            {pestana("marcadores", `Marcadores${marcadores.length ? ` (${marcadores.length})` : ""}`)}
            {pestana("buscar", "Buscar")}
          </div>
          <button
            onClick={onCerrar}
            aria-label="Cerrar"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full hover:bg-[var(--surface-muted)]"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M18 6 6 18M6 6l12 12" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-2">
          {seccion === "capitulos" && (
            <ul>
              {libro.chapters.map((c, i) => (
                <li key={i}>
                  <button
                    onClick={() => onIr(i)}
                    className={`${fila} ${i === capituloActual ? "bg-[var(--surface-muted)] font-semibold" : ""}`}
                  >
                    <span className="text-xs text-[var(--foreground)]/50">Capítulo {i + 1}</span>
                    <span className="leading-snug">{c.title}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}

          {seccion === "marcadores" &&
            (marcadores.length === 0 ? (
              <p className="px-3 py-10 text-center text-sm text-[var(--foreground)]/60">
                Todavía no guardaste ningún marcador. Tocá la cinta del encabezado mientras leés
                para guardar el punto donde estás.
              </p>
            ) : (
              <ul>
                {marcadores.map((m) => (
                  <li key={m.creadoEn} className="flex items-center gap-1">
                    <button
                      onClick={() => onIr(m.chapterIndex, m.paragraphIndex)}
                      className={`${fila} min-w-0 flex-1`}
                    >
                      <span className="text-xs text-[var(--foreground)]/50">{m.chapterTitle}</span>
                      <span className="line-clamp-2 text-sm leading-snug">{m.fragmento}</span>
                    </button>
                    <button
                      onClick={() => onBorrarMarcador(m.creadoEn)}
                      aria-label="Borrar este marcador"
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[var(--foreground)]/50 hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)]"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M18 6 6 18M6 6l12 12" strokeLinecap="round" />
                      </svg>
                    </button>
                  </li>
                ))}
              </ul>
            ))}

          {seccion === "buscar" && (
            <div className="flex flex-col gap-2 p-1">
              <input
                autoFocus
                value={consulta}
                onChange={(e) => setConsulta(e.target.value)}
                placeholder="Escribí al menos 3 letras…"
                aria-label="Buscar en el libro"
                className="min-h-12 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 text-base outline-none focus-visible:border-[var(--accent)]"
              />

              {consulta.trim().length >= 3 && (
                <p className="px-2 text-xs text-[var(--foreground)]/60">
                  {resultados.length === 0
                    ? "Sin resultados."
                    : `${resultados.length}${resultados.length === 60 ? "+" : ""} ${
                        resultados.length === 1 ? "resultado" : "resultados"
                      }`}
                </p>
              )}

              <ul>
                {resultados.map((r) => (
                  <li key={`${r.chapterIndex}-${r.paragraphIndex}`}>
                    <button
                      onClick={() => onIr(r.chapterIndex, r.paragraphIndex)}
                      className={fila}
                    >
                      <span className="text-xs text-[var(--foreground)]/50">{r.chapterTitle}</span>
                      <span className="line-clamp-3 text-sm leading-snug">{r.fragmento}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
