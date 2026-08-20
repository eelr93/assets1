"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getBook, getBookFile, getProgress, saveProgress } from "@/lib/db";
import { parseBook } from "@/lib/parsers";
import { paragraphsToPlainText, paragraphsToSpeakableText } from "@/lib/text";
import type { ParsedBook, StoredBook } from "@/lib/types";
import { useSettings } from "@/context/SettingsContext";
import { useAuth } from "@/context/AuthContext";
import { useVozAlta } from "@/lib/useVozAlta";
import { usePantallaEncendida } from "@/lib/usePantallaEncendida";
import { SettingsPanel } from "@/components/SettingsPanel";
import { BarraVoz } from "@/components/BarraVoz";
import { Quiz } from "@/components/Quiz";

const FONT_FAMILY: Record<string, string> = {
  accessible: "var(--font-accessible)",
  "reading-serif": "var(--font-reading-serif)",
  system: "var(--font-system), system-ui, sans-serif",
};

export function Reader({ bookId, onBack }: { bookId: string; onBack: () => void }) {
  const { settings } = useSettings();
  const { configured: quizDisponible } = useAuth();
  const [book, setBook] = useState<StoredBook | null>(null);
  const [parsed, setParsed] = useState<ParsedBook | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [chapterIndex, setChapterIndex] = useState(0);
  const [activeIndex, setActiveIndex] = useState(0);
  const [panelOpen, setPanelOpen] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const paragraphRefs = useRef<(HTMLDivElement | null)[]>([]);
  const restoredRef = useRef(false);
  const pendingScrollTarget = useRef<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const stored = await getBook(bookId);
        const blob = await getBookFile(bookId);
        if (!stored || !blob) throw new Error("No se encontró el libro");
        const file = new File([blob], stored.fileName, { type: blob.type });
        const parsedBook = await parseBook(file, stored.format);
        if (cancelled) return;
        setBook(stored);
        setParsed(parsedBook);

        const progress = await getProgress(bookId);
        if (progress) {
          setChapterIndex(Math.min(progress.chapterIndex, parsedBook.chapters.length - 1));
          pendingScrollTarget.current = progress.paragraphIndex;
        }
      } catch (err) {
        console.error(err);
        if (!cancelled) setError("No se pudo abrir este libro. El archivo puede estar dañado.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [bookId]);

  const totalChapters = parsed?.chapters.length ?? 0;
  const chapter = parsed?.chapters[chapterIndex];
  const chapterText = useMemo(
    () => (chapter ? paragraphsToPlainText(chapter.paragraphs) : ""),
    [chapter]
  );

  // ── Lectura en voz alta ───────────────────────────────────────────────────
  const textosParaVoz = useMemo(
    () => (chapter ? paragraphsToSpeakableText(chapter.paragraphs) : []),
    [chapter]
  );

  const voz = useVozAlta({
    parrafos: textosParaVoz,
    // Mientras habla, el párrafo activo lo manda la voz y no el desplazamiento:
    // así el resaltado del modo enfoque acompaña a lo que se está escuchando.
    onParrafo: (i) => {
      setActiveIndex(i);
      paragraphRefs.current[i]?.scrollIntoView({ behavior: "smooth", block: "center" });
    },
  });

  const leyendo = voz.estado !== "detenido";

  // El efecto del desplazamiento se registra una vez por capítulo y necesita
  // saber si la voz está andando. Va por ref y no por dependencia a propósito:
  // agregarlo a las dependencias volvería a montar el efecto en cada play y
  // pausa, y eso reinicia la posición de lectura.
  const leyendoRef = useRef(false);
  useEffect(() => {
    leyendoRef.current = leyendo;
  }, [leyendo]);

  // Con la voz andando la pantalla no se apaga; leyendo con los ojos tampoco,
  // porque pasar de párrafo no cuenta como actividad para el sistema.
  usePantallaEncendida(true);

  // Cambiar de capítulo con la voz encendida tiene que cortarla: si no, sigue
  // leyendo el capítulo anterior sobre un texto que ya no está en pantalla.
  useEffect(() => {
    voz.detener();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chapterIndex, bookId]);

  const persist = useCallback(
    (idx: number) => {
      if (!parsed) return;
      const totalInChapter = chapter?.paragraphs.length || 1;
      const fraction =
        totalChapters > 0
          ? (chapterIndex + Math.min(1, idx / totalInChapter)) / totalChapters
          : 0;
      saveProgress({
        bookId,
        chapterIndex,
        paragraphIndex: idx,
        fraction,
        updatedAt: Date.now(),
      });
    },
    [bookId, chapter, chapterIndex, parsed, totalChapters]
  );

  // Scroll tracking: drives both the paragraph-focus highlight and progress saving.
  useEffect(() => {
    const container = scrollRef.current;
    if (!container || !chapter) return;

    let ticking = false;
    let saveTimer: ReturnType<typeof setTimeout>;
    let lastIndex = 0;

    const computeActive = () => {
      ticking = false;
      // Con la voz andando manda ella: si no, el desplazamiento automático que
      // ella misma provoca recalcularía el párrafo activo y el resaltado
      // empezaría a pelearse consigo mismo.
      if (leyendoRef.current) return;
      const containerRect = container.getBoundingClientRect();
      const band = containerRect.top + containerRect.height * 0.3;
      let idx = 0;
      for (let i = 0; i < paragraphRefs.current.length; i++) {
        const el = paragraphRefs.current[i];
        if (!el) continue;
        const rect = el.getBoundingClientRect();
        idx = i;
        if (rect.bottom >= band) break;
      }
      lastIndex = idx;
      setActiveIndex(idx);
      clearTimeout(saveTimer);
      saveTimer = setTimeout(() => persist(idx), 700);
    };

    const onScroll = () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(computeActive);
      }
    };

    container.addEventListener("scroll", onScroll, { passive: true });

    if (!restoredRef.current) {
      restoredRef.current = true;
      const target = pendingScrollTarget.current;
      if (target) {
        requestAnimationFrame(() => {
          paragraphRefs.current[target]?.scrollIntoView({ block: "start" });
        });
      }
    } else {
      container.scrollTop = 0;
    }
    computeActive();

    return () => {
      container.removeEventListener("scroll", onScroll);
      clearTimeout(saveTimer);
      // Flush immediately on chapter change / unmount so a quick exit never loses position.
      persist(lastIndex);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chapter, chapterIndex]);

  const goToChapter = (idx: number) => {
    if (!parsed) return;
    const clamped = Math.max(0, Math.min(parsed.chapters.length - 1, idx));
    if (clamped === chapterIndex) return;
    setChapterIndex(clamped);
    setActiveIndex(0);
  };

  if (error) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
        <p className="text-lg font-medium">{error}</p>
        <button onClick={onBack} className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm">
          Volver a la biblioteca
        </button>
      </div>
    );
  }

  if (!parsed || !book || !chapter) {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <p className="text-sm text-[var(--foreground)]/60">Abriendo libro…</p>
      </div>
    );
  }

  return (
    <div className={`theme-${settings.theme} flex flex-1 flex-col`} style={{ background: "var(--read-bg)", color: "var(--read-fg)" }}>
      <header
        className="sticky top-0 z-10 flex items-center gap-2 border-b px-3 py-2"
        style={{ background: "var(--read-bg)", borderColor: "color-mix(in srgb, var(--read-fg) 15%, transparent)" }}
      >
        <button
          onClick={onBack}
          aria-label="Volver a la biblioteca"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full hover:bg-[color-mix(in_srgb,var(--read-fg)_10%,transparent)]"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        <label className="sr-only" htmlFor="chapter-select">
          Capítulo
        </label>
        <select
          id="chapter-select"
          value={chapterIndex}
          onChange={(e) => goToChapter(Number(e.target.value))}
          className="min-w-0 flex-1 truncate rounded-md border bg-transparent px-2 py-2 text-sm"
          style={{ borderColor: "color-mix(in srgb, var(--read-fg) 25%, transparent)" }}
        >
          {parsed.chapters.map((c, i) => (
            <option key={i} value={i} style={{ color: "#111" }}>
              {c.title}
            </option>
          ))}
        </select>

        <button
          onClick={() => setPanelOpen(true)}
          aria-label="Ajustes de lectura"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full hover:bg-[color-mix(in_srgb,var(--read-fg)_10%,transparent)]"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1.04 1.56V21a2 2 0 0 1-4 0v-.09A1.7 1.7 0 0 0 9 19.4a1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-1.56-1.04H3a2 2 0 0 1 0-4h.09A1.7 1.7 0 0 0 4.6 9a1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1.04-1.56V3a2 2 0 0 1 4 0v.09A1.7 1.7 0 0 0 15 4.6a1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.7 1.7 0 0 0 19.4 9a1.7 1.7 0 0 0 1.56 1.04H21a2 2 0 0 1 0 4h-.09A1.7 1.7 0 0 0 19.4 15z" />
          </svg>
        </button>
      </header>

      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        <div
          className="mx-auto px-4 py-8"
          style={{
            maxWidth: settings.contentWidth,
            fontFamily: FONT_FAMILY[settings.font],
            fontSize: settings.fontSize,
            lineHeight: settings.lineHeight,
            letterSpacing: `${settings.letterSpacing}em`,
            wordSpacing: `${settings.wordSpacing}em`,
            textAlign: settings.textAlign,
          }}
        >
          {chapter.paragraphs.map((p, i) => {
            const isActive = i === activeIndex;
            const dim = settings.focusMode && !isActive;
            if (p.kind === "image") {
              return (
                <div
                  key={i}
                  ref={(el) => {
                    paragraphRefs.current[i] = el;
                  }}
                  className="reader-paragraph my-4 flex justify-center"
                  style={{ opacity: dim ? 1 - settings.focusDimOpacity : 1 }}
                  dangerouslySetInnerHTML={{ __html: p.html }}
                />
              );
            }
            const Tag = p.kind === "heading" ? (`h${p.level ?? 2}` as const) : "p";
            return (
              <Tag
                key={i}
                ref={(el: HTMLElement | null) => {
                  paragraphRefs.current[i] = el as HTMLDivElement | null;
                }}
                className={`reader-paragraph rounded-md ${p.kind === "heading" ? "mb-4 mt-8 font-bold" : "mb-4"}`}
                style={{
                  background: isActive && settings.focusMode ? "var(--read-paragraph-bg-active)" : "transparent",
                  opacity: dim ? 1 - settings.focusDimOpacity : 1,
                  padding: isActive && settings.focusMode ? "0.35em 0.5em" : undefined,
                  marginLeft: isActive && settings.focusMode ? "-0.5em" : undefined,
                  marginRight: isActive && settings.focusMode ? "-0.5em" : undefined,
                }}
                dangerouslySetInnerHTML={{ __html: p.html }}
              />
            );
          })}

          {/*
            El quiz llama a un servidor propio que verifica la sesión y consume
            tokens pagos. Sin cuentas configuradas no hay a quién verificar ni
            con qué pagar, así que el botón no se muestra: es preferible que no
            exista a que exista y falle.
          */}
          {quizDisponible && (
            <Quiz
              key={chapterIndex}
              bookTitle={book.title}
              chapterTitle={chapter.title}
              chapterText={chapterText}
            />
          )}

          {/*
            Botones anchos y apilados en el teléfono. Antes eran tres cosas en
            una fila: en una pantalla angosta quedaban tan finitos que había que
            apuntar, que es justo lo que no se le puede pedir a esta usuaria.
          */}
          <nav
            className="mt-12 mb-24 flex flex-col gap-3 border-t pt-6 sm:flex-row sm:items-center sm:justify-between"
            style={{ borderColor: "color-mix(in srgb, var(--read-fg) 15%, transparent)" }}
          >
            <button
              onClick={() => goToChapter(chapterIndex - 1)}
              disabled={chapterIndex === 0}
              className="min-h-12 rounded-xl border px-5 py-3 font-medium transition disabled:opacity-25 enabled:hover:bg-[color-mix(in_srgb,var(--read-fg)_8%,transparent)]"
              style={{ borderColor: "color-mix(in srgb, var(--read-fg) 25%, transparent)", fontSize: "0.95rem" }}
            >
              ← Capítulo anterior
            </button>
            <span className="order-first text-center text-sm opacity-60 sm:order-none">
              Capítulo {chapterIndex + 1} de {totalChapters}
            </span>
            <button
              onClick={() => goToChapter(chapterIndex + 1)}
              disabled={chapterIndex === totalChapters - 1}
              className="min-h-12 rounded-xl border px-5 py-3 font-medium transition disabled:opacity-25 enabled:hover:bg-[color-mix(in_srgb,var(--read-fg)_8%,transparent)]"
              style={{ borderColor: "color-mix(in srgb, var(--read-fg) 25%, transparent)", fontSize: "0.95rem" }}
            >
              Capítulo siguiente →
            </button>
          </nav>
        </div>
      </div>

      {voz.disponible && (
        <BarraVoz
          estado={voz.estado}
          velocidad={voz.velocidad}
          velocidades={voz.velocidades}
          onLeer={() => voz.comenzar(activeIndex)}
          onPausar={voz.pausar}
          onReanudar={voz.reanudar}
          onDetener={voz.detener}
          onVelocidad={voz.cambiarVelocidad}
        />
      )}

      {panelOpen && <SettingsPanel onClose={() => setPanelOpen(false)} />}
    </div>
  );
}
